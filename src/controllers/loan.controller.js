import mongoose from "mongoose";
import { Loan } from "../models/loan.model.js";
import { LoanPayment } from "../models/loanPayment.model.js";
import { Account } from "../models/account.model.js";
import { Transaction } from "../models/transaction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTransactionReference } from "../utils/generateTransactionReference.js";
import { notifyUser } from "../services/notification.service.js";

const LOAN_TYPES = ["Personal", "Home", "Auto", "Education"];

// Standard reducing-balance EMI formula
function calculateEMI(principal, annualRatePercent, tenureMonths) {

    if (annualRatePercent === 0) {
        return Math.round((principal / tenureMonths) * 100) / 100;
    }

    const monthlyRate = annualRatePercent / 12 / 100;
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    const emi = (principal * monthlyRate * factor) / (factor - 1);

    return Math.round(emi * 100) / 100;
}

/**
 * Apply for a new loan against one of the logged-in user's own accounts
 */
const applyForLoan = asyncHandler(async (req, res) => {

    const { accountId } = req.params;

    if (!mongoose.isValidObjectId(accountId)) {
        throw new ApiError(400, "Invalid Account ID");
    }

    const { loanType, principal, tenureMonths, purpose } = req.body;

    if (!LOAN_TYPES.includes(loanType)) {
        throw new ApiError(400, `Loan type must be one of: ${LOAN_TYPES.join(", ")}`);
    }

    if (typeof principal !== "number" || !Number.isFinite(principal) || principal <= 0) {
        throw new ApiError(400, "Principal must be a valid positive number");
    }

    if (!Number.isInteger(tenureMonths) || tenureMonths < 1) {
        throw new ApiError(400, "Tenure must be a whole number of months, at least 1");
    }

    const account = await Account.findOne({
        _id: accountId,
        user: req.user._id,
    });

    if (!account) {
        throw new ApiError(404, "Account not found or access denied");
    }

    if (account.status !== "Active") {
        throw new ApiError(400, `Account is ${account.status}, cannot apply for a loan`);
    }

    const loan = await Loan.create({
        user: req.user._id,
        account: account._id,
        loanType,
        principal: Math.round(principal * 100) / 100,
        tenureMonths,
        purpose,
    });

    return res.status(201).json(
        new ApiResponse(201, loan, "Loan application submitted successfully")
    );

});

/**
 * List the logged-in user's own loans
 */
const getMyLoans = asyncHandler(async (req, res) => {

    const loans = await Loan.find({ user: req.user._id })
        .select("-__v")
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json(
        new ApiResponse(
            200,
            loans,
            loans.length ? "Loans fetched successfully" : "No loans found"
        )
    );

});

/**
 * List all loans (admin only), optionally filtered by status
 */
const getAllLoans = asyncHandler(async (req, res) => {

    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const [loans, totalItems] = await Promise.all([
        Loan.find(filter)
            .populate({ path: "user", select: "fullName email phone" })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("-__v")
            .lean(),
        Loan.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                loans,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                },
            },
            "Loans fetched successfully"
        )
    );

});

/**
 * Get a single loan by id (owner or admin)
 */
const getLoanById = asyncHandler(async (req, res) => {

    const { loanId } = req.params;

    if (!mongoose.isValidObjectId(loanId)) {
        throw new ApiError(400, "Invalid Loan ID");
    }

    const filter = req.user.role === "admin"
        ? { _id: loanId }
        : { _id: loanId, user: req.user._id };

    const loan = await Loan.findOne(filter).select("-__v").lean();

    if (!loan) {
        throw new ApiError(404, "Loan not found or access denied");
    }

    return res.status(200).json(
        new ApiResponse(200, loan, "Loan fetched successfully")
    );

});

/**
 * Approve or reject a pending loan (admin only)
 */
const reviewLoan = asyncHandler(async (req, res) => {

    const { loanId } = req.params;

    if (!mongoose.isValidObjectId(loanId)) {
        throw new ApiError(400, "Invalid Loan ID");
    }

    const { decision, interestRate, rejectionReason } = req.body;

    if (!["Approve", "Reject"].includes(decision)) {
        throw new ApiError(400, "Decision must be either Approve or Reject");
    }

    const loan = await Loan.findById(loanId);

    if (!loan) {
        throw new ApiError(404, "Loan not found");
    }

    if (loan.status !== "Pending") {
        throw new ApiError(400, `Loan is ${loan.status}, cannot be reviewed again`);
    }

    if (decision === "Approve") {

        if (typeof interestRate !== "number" || !Number.isFinite(interestRate) || interestRate < 0) {
            throw new ApiError(400, "A valid, non-negative interest rate is required to approve a loan");
        }

        const emiAmount = calculateEMI(loan.principal, interestRate, loan.tenureMonths);

        loan.interestRate = interestRate;
        loan.emiAmount = emiAmount;
        loan.totalPayable = Math.round(emiAmount * loan.tenureMonths * 100) / 100;
        loan.status = "Approved";

    } else {

        if (!rejectionReason || typeof rejectionReason !== "string" || !rejectionReason.trim()) {
            throw new ApiError(400, "A rejection reason is required");
        }

        loan.rejectionReason = rejectionReason.trim();
        loan.status = "Rejected";
    }

    loan.reviewedBy = req.user._id;
    loan.reviewedAt = new Date();

    await loan.save();

    await notifyUser({
        user: loan.user,
        title: decision === "Approve" ? "Loan Approved" : "Loan Rejected",
        message: decision === "Approve"
            ? `Your ${loan.loanType} loan of ₹${loan.principal} has been approved. EMI: ₹${loan.emiAmount}/month for ${loan.tenureMonths} months.`
            : `Your ${loan.loanType} loan application was rejected. Reason: ${loan.rejectionReason}`,
        type: "Account",
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            loan,
            decision === "Approve" ? "Loan approved successfully" : "Loan rejected successfully"
        )
    );

});

/**
 * Disburse an approved loan into its linked account (admin only)
 */
const disburseLoan = asyncHandler(async (req, res) => {

    const { loanId } = req.params;

    if (!mongoose.isValidObjectId(loanId)) {
        throw new ApiError(400, "Invalid Loan ID");
    }

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const loan = await Loan.findById(loanId).session(session);

        if (!loan) {
            throw new ApiError(404, "Loan not found");
        }

        if (loan.status !== "Approved") {
            throw new ApiError(400, `Loan is ${loan.status}, cannot be disbursed`);
        }

        const updatedAccount = await Account.findOneAndUpdate(
            { _id: loan.account, status: "Active" },
            { $inc: { balance: loan.principal } },
            { new: true, session }
        );

        if (!updatedAccount) {
            throw new ApiError(409, "Linked account is not active, cannot disburse");
        }

        const reference = await generateTransactionReference(session);

        await Transaction.create(
            [{
                account: loan.account,
                type: "Deposit",
                amount: loan.principal,
                balanceAfter: updatedAccount.balance,
                reference,
                initiatedBy: req.user._id,
                description: `Loan disbursal - ${loan.loanType} loan ${loan._id}`,
            }],
            { session }
        );

        loan.status = "Active";
        loan.disbursedAt = new Date();

        await loan.save({ session });

        await session.commitTransaction();
        session.endSession();

        await notifyUser({
            user: loan.user,
            title: "Loan Disbursed",
            message: `₹${loan.principal} has been credited to your account ${updatedAccount.accountNumber}.`,
            type: "Transaction",
        });

        return res.status(200).json(
            new ApiResponse(200, loan, "Loan disbursed successfully")
        );

    } catch (error) {

        await session.abortTransaction();
        session.endSession();
        throw error;
    }

});

/**
 * Make a repayment towards an active loan
 */
const makePayment = asyncHandler(async (req, res) => {

    const { loanId } = req.params;

    if (!mongoose.isValidObjectId(loanId)) {
        throw new ApiError(400, "Invalid Loan ID");
    }

    const { amount } = req.body;

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(400, "Amount must be a valid positive number");
    }

    const roundedAmount = Math.round(amount * 100) / 100;

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const loan = await Loan.findOne({
            _id: loanId,
            user: req.user._id,
        }).session(session);

        if (!loan) {
            throw new ApiError(404, "Loan not found or access denied");
        }

        if (loan.status !== "Active") {
            throw new ApiError(400, `Loan is ${loan.status}, no payment due`);
        }

        const remainingPayable = Math.round((loan.totalPayable - loan.amountPaid) * 100) / 100;

        if (roundedAmount > remainingPayable) {
            throw new ApiError(400, `Amount exceeds remaining payable of ₹${remainingPayable}`);
        }

        const updatedAccount = await Account.findOneAndUpdate(
            { _id: loan.account, status: "Active", balance: { $gte: roundedAmount } },
            { $inc: { balance: -roundedAmount } },
            { new: true, session }
        );

        if (!updatedAccount) {
            throw new ApiError(400, "Insufficient balance in the linked account");
        }

        const reference = await generateTransactionReference(session);

        const [debitTransaction] = await Transaction.create(
            [{
                account: loan.account,
                type: "Withdrawal",
                amount: roundedAmount,
                balanceAfter: updatedAccount.balance,
                reference,
                initiatedBy: req.user._id,
                description: `Loan repayment - ${loan.loanType} loan ${loan._id}`,
            }],
            { session }
        );

        const newAmountPaid = Math.round((loan.amountPaid + roundedAmount) * 100) / 100;
        const newRemainingPayable = Math.round((loan.totalPayable - newAmountPaid) * 100) / 100;

        loan.amountPaid = newAmountPaid;

        if (newRemainingPayable <= 0.01) {
            loan.status = "Closed";
            loan.closedAt = new Date();
        }

        await loan.save({ session });

        const paymentCount = await LoanPayment.countDocuments({ loan: loan._id }).session(session);

        const [payment] = await LoanPayment.create(
            [{
                loan: loan._id,
                user: req.user._id,
                amount: roundedAmount,
                paymentNumber: paymentCount + 1,
                balanceAfter: Math.max(newRemainingPayable, 0),
                reference,
                relatedTransaction: debitTransaction._id,
            }],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        await notifyUser({
            user: req.user._id,
            title: loan.status === "Closed" ? "Loan Fully Repaid" : "Loan Payment Successful",
            message: loan.status === "Closed"
                ? `Your final payment of ₹${roundedAmount} has closed out your ${loan.loanType} loan.`
                : `Payment of ₹${roundedAmount} received. Remaining payable: ₹${Math.max(newRemainingPayable, 0)}.`,
            type: "Transaction",
            email: req.user.email,
        });

        return res.status(201).json(
            new ApiResponse(201, { loan, payment }, "Loan payment successful")
        );

    } catch (error) {

        await session.abortTransaction();
        session.endSession();
        throw error;
    }

});

/**
 * List repayment history for a loan (owner or admin)
 */
const getLoanPayments = asyncHandler(async (req, res) => {

    const { loanId } = req.params;

    if (!mongoose.isValidObjectId(loanId)) {
        throw new ApiError(400, "Invalid Loan ID");
    }

    const loanFilter = req.user.role === "admin"
        ? { _id: loanId }
        : { _id: loanId, user: req.user._id };

    const loan = await Loan.findOne(loanFilter).select("_id").lean();

    if (!loan) {
        throw new ApiError(404, "Loan not found or access denied");
    }

    const payments = await LoanPayment.find({ loan: loanId })
        .sort({ paymentNumber: 1 })
        .select("-__v")
        .lean();

    return res.status(200).json(
        new ApiResponse(200, payments, "Loan payments fetched successfully")
    );

});

export {
    applyForLoan,
    getMyLoans,
    getAllLoans,
    getLoanById,
    reviewLoan,
    disburseLoan,
    makePayment,
    getLoanPayments,
};
