import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        // The account this ledger row belongs to (owner perspective)
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },

        type: {
            type: String,
            enum: ["Deposit", "Withdrawal", "TransferDebit", "TransferCredit"],
            required: true,
        },

        // Always a positive magnitude
        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },

        // Account's balance immediately after this transaction
        balanceAfter: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
            default: "INR",
        },

        // Set for TransferDebit/TransferCredit, null for Deposit/Withdrawal
        counterpartyAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },

        // Points at the paired debit/credit document for a transfer
        relatedTransaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction",
            default: null,
        },

        // Shared id correlating the debit+credit pair of one transfer
        transferGroupId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },

        reference: {
            type: String,
            required: true,
            unique: true,
        },

        status: {
            type: String,
            enum: ["Success", "Failed"],
            default: "Success",
        },

        description: {
            type: String,
            trim: true,
            maxlength: 140,
            default: "",
        },

        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

transactionSchema.index({ account: 1, createdAt: -1 });
transactionSchema.index({ transferGroupId: 1 }, { sparse: true });

export const Transaction = mongoose.model("Transaction", transactionSchema);
