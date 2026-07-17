import mongoose from "mongoose";
import { Account } from "../models/account.model.js";
import { Transaction } from "../models/transaction.model.js";
import { Beneficiary } from "../models/beneficiary.model.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTransactionReference } from "../utils/generateTransactionReference.js";
import { notifyUser } from "../services/notification.service.js";

const COUNTERPARTY_FIELDS = "accountNumber nickname accountType";

// Validates and normalizes a client-supplied amount, throws ApiError on failure
function assertValidAmount(amount) {

    if (typeof amount !== "number" || !Number.isFinite(amount)) {
        throw new ApiError(400, "Amount must be a valid number");
    }

    if (amount <= 0) {
        throw new ApiError(400, "Amount must be greater than zero");
    }

    return Math.round(amount * 100) / 100;
}

/**
 * Deposit into own account
 */
const deposit = asyncHandler(async (req, res) => {

    const { accountId } = req.params;

    if (!mongoose.isValidObjectId(accountId)) {
        throw new ApiError(400, "Invalid Account ID");
    }

    const amount = assertValidAmount(req.body.amount);
    const { description } = req.body;

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const account = await Account.findOne({
            _id: accountId,
            user: req.user._id,
        }).session(session);

        if (!account) {
            throw new ApiError(404, "Account not found or access denied");
        }

        if (account.status !== "Active") {
            throw new ApiError(400, `Account is ${account.status}, cannot deposit`);
        }

        const updatedAccount = await Account.findOneAndUpdate(
            { _id: accountId, status: "Active" },
            { $inc: { balance: amount } },
            { new: true, session }
        );

        if (!updatedAccount) {
            throw new ApiError(409, "Account status changed, please retry");
        }

        const reference = await generateTransactionReference(session);

        const [transaction] = await Transaction.create(
            [{
                account: accountId,
                type: "Deposit",
                amount,
                balanceAfter: updatedAccount.balance,
                reference,
                initiatedBy: req.user._id,
                description,
            }],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        await notifyUser({
            user: req.user._id,
            title: "Deposit Successful",
            message: `₹${amount} deposited to account ${account.accountNumber}. New balance ₹${updatedAccount.balance}.`,
            type: "Transaction",
            email: req.user.email,
        });

        return res.status(201).json(
            new ApiResponse(201, transaction, "Deposit successful")
        );

    } catch (error) {

        await session.abortTransaction();
        session.endSession();
        throw error;
    }

});

/**
 * Withdraw from own account
 */
const withdraw = asyncHandler(async (req, res) => {

    const { accountId } = req.params;

    if (!mongoose.isValidObjectId(accountId)) {
        throw new ApiError(400, "Invalid Account ID");
    }

    const amount = assertValidAmount(req.body.amount);
    const { description } = req.body;

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const account = await Account.findOne({
            _id: accountId,
            user: req.user._id,
        }).session(session);

        if (!account) {
            throw new ApiError(404, "Account not found or access denied");
        }

        if (account.status !== "Active") {
            throw new ApiError(400, `Account is ${account.status}, cannot withdraw`);
        }

        const updatedAccount = await Account.findOneAndUpdate(
            { _id: accountId, status: "Active", balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { new: true, session }
        );

        if (!updatedAccount) {
            throw new ApiError(400, "Insufficient balance");
        }

        const reference = await generateTransactionReference(session);

        const [transaction] = await Transaction.create(
            [{
                account: accountId,
                type: "Withdrawal",
                amount,
                balanceAfter: updatedAccount.balance,
                reference,
                initiatedBy: req.user._id,
                description,
            }],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        await notifyUser({
            user: req.user._id,
            title: "Withdrawal Successful",
            message: `₹${amount} withdrawn from account ${account.accountNumber}. New balance ₹${updatedAccount.balance}.`,
            type: "Transaction",
            email: req.user.email,
        });

        return res.status(201).json(
            new ApiResponse(201, transaction, "Withdrawal successful")
        );

    } catch (error) {

        await session.abortTransaction();
        session.endSession();
        throw error;
    }

});

/**
 * Transfer to another account by account number
 */
const transfer = asyncHandler(async (req, res) => {

    const { accountId } = req.params;

    if (!mongoose.isValidObjectId(accountId)) {
        throw new ApiError(400, "Invalid Account ID");
    }

    const { toAccountNumber, beneficiaryId, description } = req.body;

    if (!toAccountNumber && !beneficiaryId) {
        throw new ApiError(400, "Recipient account number or beneficiary is required");
    }

    if (beneficiaryId && !mongoose.isValidObjectId(beneficiaryId)) {
        throw new ApiError(400, "Invalid Beneficiary ID");
    }

    const amount = assertValidAmount(req.body.amount);

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const sourceAccount = await Account.findOne({
            _id: accountId,
            user: req.user._id,
        }).session(session);

        if (!sourceAccount) {
            throw new ApiError(404, "Account not found or access denied");
        }

        if (sourceAccount.status !== "Active") {
            throw new ApiError(400, `Account is ${sourceAccount.status}, cannot transfer`);
        }

        let resolvedAccountNumber = toAccountNumber;

        if (beneficiaryId) {

            const beneficiary = await Beneficiary.findOne({
                _id: beneficiaryId,
                user: req.user._id,
            }).session(session);

            if (!beneficiary) {
                throw new ApiError(404, "Beneficiary not found or access denied");
            }

            if (beneficiary.status !== "Active") {
                throw new ApiError(400, "Beneficiary is blocked");
            }

            resolvedAccountNumber = beneficiary.accountNumber;
        }

        const destAccount = await Account.findOne({
            accountNumber: resolvedAccountNumber,
        }).session(session);

        if (!destAccount) {
            throw new ApiError(404, "Recipient account not found");
        }

        if (destAccount.status !== "Active") {
            throw new ApiError(400, "Recipient account is not active");
        }

        if (String(sourceAccount._id) === String(destAccount._id)) {
            throw new ApiError(400, "Cannot transfer to the same account");
        }

        const updatedSource = await Account.findOneAndUpdate(
            { _id: sourceAccount._id, status: "Active", balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { new: true, session }
        );

        if (!updatedSource) {
            throw new ApiError(400, "Insufficient balance");
        }

        const updatedDest = await Account.findOneAndUpdate(
            { _id: destAccount._id, status: "Active" },
            { $inc: { balance: amount } },
            { new: true, session }
        );

        if (!updatedDest) {
            throw new ApiError(409, "Recipient account is no longer active");
        }

        const [debitRef, creditRef] = await Promise.all([
            generateTransactionReference(session),
            generateTransactionReference(session),
        ]);

        const transferGroupId = new mongoose.Types.ObjectId();
        const debitId = new mongoose.Types.ObjectId();
        const creditId = new mongoose.Types.ObjectId();

        const [debitTransaction] = await Transaction.create(
            [
                {
                    _id: debitId,
                    account: sourceAccount._id,
                    type: "TransferDebit",
                    amount,
                    balanceAfter: updatedSource.balance,
                    counterpartyAccount: destAccount._id,
                    relatedTransaction: creditId,
                    transferGroupId,
                    reference: debitRef,
                    initiatedBy: req.user._id,
                    description,
                },
                {
                    _id: creditId,
                    account: destAccount._id,
                    type: "TransferCredit",
                    amount,
                    balanceAfter: updatedDest.balance,
                    counterpartyAccount: sourceAccount._id,
                    relatedTransaction: debitId,
                    transferGroupId,
                    reference: creditRef,
                    initiatedBy: req.user._id,
                    description,
                },
            ],
            { session, ordered: true }
        );

        await session.commitTransaction();
        session.endSession();

        const populatedTransaction = await Transaction.findById(debitTransaction._id)
            .populate({ path: "counterpartyAccount", select: COUNTERPARTY_FIELDS })
            .lean();

        const recipientUser = await User.findById(destAccount.user).select("email");

        await notifyUser({
            user: sourceAccount.user,
            title: "Transfer Sent",
            message: `₹${amount} sent to account ending ${destAccount.accountNumber.slice(-4)}. Reference ${debitRef}.`,
            type: "Transaction",
            email: req.user.email,
        });

        await notifyUser({
            user: destAccount.user,
            title: "Transfer Received",
            message: `₹${amount} received from account ending ${sourceAccount.accountNumber.slice(-4)}. Reference ${creditRef}.`,
            type: "Transaction",
            email: recipientUser?.email,
        });

        return res.status(201).json(
            new ApiResponse(201, populatedTransaction, "Transfer successful")
        );

    } catch (error) {

        await session.abortTransaction();
        session.endSession();
        throw error;
    }

});

/**
 * Get transaction history for one of the user's own accounts
 */
const getTransactionHistory = asyncHandler(async (req, res) => {

    const { accountId } = req.params;

    if (!mongoose.isValidObjectId(accountId)) {
        throw new ApiError(400, "Invalid Account ID");
    }

    const account = await Account.findOne({
        _id: accountId,
        user: req.user._id,
    }).lean();

    if (!account) {
        throw new ApiError(404, "Account not found or access denied");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const [transactions, totalItems] = await Promise.all([
        Transaction.find({ account: accountId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("-__v")
            .populate({ path: "counterpartyAccount", select: COUNTERPARTY_FIELDS })
            .lean(),
        Transaction.countDocuments({ account: accountId }),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                transactions,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                },
            },
            "Transaction history fetched successfully"
        )
    );

});

/**
 * Get a single transaction by id
 */
const getTransactionById = asyncHandler(async (req, res) => {

    const { transactionId } = req.params;

    if (!mongoose.isValidObjectId(transactionId)) {
        throw new ApiError(400, "Invalid Transaction ID");
    }

    const transaction = await Transaction.findById(transactionId)
        .populate({ path: "account", select: "user accountNumber" })
        .populate({ path: "counterpartyAccount", select: COUNTERPARTY_FIELDS })
        .lean();

    if (!transaction || String(transaction.account.user) !== String(req.user._id)) {
        throw new ApiError(404, "Transaction not found or access denied");
    }

    return res.status(200).json(
        new ApiResponse(200, transaction, "Transaction fetched successfully")
    );

});

export {
    deposit,
    withdraw,
    transfer,
    getTransactionHistory,
    getTransactionById,
};
