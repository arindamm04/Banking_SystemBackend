import mongoose from "mongoose";
import { Account } from "../models/account.model.js";
import { Branch } from "../models/branch.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {generateAccountNumber}  from "../utils/generateAccountNumber.js";

const createAccount = asyncHandler(async (req, res) => {

    // Start a new MongoDB session.
    // A session is required to use MongoDB Transactions.
    const session = await mongoose.startSession();

    try {

        // Start the transaction.
        // All database operations after this will either:
        // 1. Succeed together
        // OR
        // 2. Fail together
        session.startTransaction();

        // Get the logged-in user's ID.
        // verifyJWT middleware has already attached the user object to req.user.
        const userId = req.user._id;

        // Extract branchId and accountType from request body.
        const { branchId, accountType } = req.body;

        // Validate required fields.
        if (!branchId || !accountType) {
            throw new ApiError(400, "Branch ID and Account Type are required");
        }

        // Check whether the branchId is a valid MongoDB ObjectId.
        if (!mongoose.isValidObjectId(branchId)) {
            throw new ApiError(400, "Invalid Branch ID");
        }

        // Find the branch inside the same transaction session.
        // If the transaction is rolled back, this read remains consistent.
        const branch = await Branch.findById(branchId).session(session);

        // If the branch does not exist, stop the process.
        if (!branch) {
            throw new ApiError(404, "Branch not found");
        }

        // List of account types supported by the bank.
        const allowedAccountTypes = [
            "Savings",
            "Current",
            "Salary"
        ];

        // Check if the account type sent by the client is valid.
        if (!allowedAccountTypes.includes(accountType)) {
            throw new ApiError(400, "Invalid Account Type");
        }

        // Business Rule:
        // A user cannot have two ACTIVE accounts of the same type.
        // Closed accounts are ignored.
        const existingAccount = await Account.findOne({
            user: userId,
            accountType,
            status: { $ne: "Closed" }
        }).session(session);

        // If an account already exists, return Conflict error.
        if (existingAccount) {
            throw new ApiError(
                409,
                `You already have an active ${accountType} account`
            );
        }

        // Generate a unique account number.
        // This function updates the Counter collection.
        // Since we pass the session, the counter update also becomes
        // part of the same transaction.
        const accountNumber = await generateAccountNumber(session);

        // Create the account.
        // Mongoose requires an array when using create() with sessions.
        const account = await Account.create(
            [{
                user: userId,
                branch: branchId,
                accountNumber,
                accountType,

                // Initial balance is always zero.
                // Client cannot choose the opening balance.
                balance: 0,

                // Default currency.
                currency: "INR",

                // Newly created accounts are Active.
                status: "Active",

                // KYC will be completed later.
                isKycVerified: false,

                // Store the account opening date.
                openedAt: new Date()
            }],
            { session }
        );

        // Everything succeeded.
        // Save all database changes permanently.
        await session.commitTransaction();

        // Close the MongoDB session.
        session.endSession();

        // Fetch the created account again.
        // populate() replaces ObjectIds with useful information.
        const createdAccount = await Account.findById(account[0]._id)
            .populate("user", "fullName email phone")
            .populate("branch", "branchName branchCode ifscCode");

        // Return success response.
        return res.status(201).json(
            new ApiResponse(
                201,
                createdAccount,
                "Account created successfully"
            )
        );

    } catch (error) {

        // If anything fails,
        // undo every database operation performed inside the transaction.
        await session.abortTransaction();

        // Close the session.
        session.endSession();

        // Pass the error to the global error handler.
        throw error;
    }

});

const getMyAccounts = asyncHandler(async (req, res) => {

    // Get authenticated user's ID from verifyJWT middleware
    const userId = req.user._id;

    // Fetch all accounts belonging to the logged-in user
    const accounts = await Account.find({
        user: userId
    })
        // Exclude unnecessary fields
        .select("-__v")

        // Populate only the required branch information
        .populate({
            path: "branch",
            select: "branchName branchCode ifscCode city state"
        })

        // Newest account first
        .sort({ createdAt: -1 })

        // Return plain JavaScript objects instead of Mongoose documents
        .lean();

    // Return success even if user has no accounts
    return res.status(200).json(

        new ApiResponse(
            200,
            accounts,
            accounts.length
                ? "Accounts fetched successfully"
                : "No accounts found"
        )

    );

});

export {createAccount, getMyAccounts}