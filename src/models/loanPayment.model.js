import mongoose from "mongoose";

const loanPaymentSchema = new mongoose.Schema(
    {
        loan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Loan",
            required: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },

        // Sequential installment number for this loan (1, 2, 3, ...)
        paymentNumber: {
            type: Number,
            required: true,
        },

        // Remaining total payable on the loan immediately after this payment
        balanceAfter: {
            type: Number,
            required: true,
            min: 0,
        },

        // Same reference as the Transaction document created for the account debit
        reference: {
            type: String,
            required: true,
            unique: true,
        },

        relatedTransaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction",
            default: null,
        },

        paidAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

loanPaymentSchema.index({ loan: 1, createdAt: -1 });

export const LoanPayment = mongoose.model("LoanPayment", loanPaymentSchema);
