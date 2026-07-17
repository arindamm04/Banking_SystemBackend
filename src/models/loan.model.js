import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Account the loan is disbursed into and repaid from
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },

        loanType: {
            type: String,
            enum: ["Personal", "Home", "Auto", "Education"],
            required: true,
        },

        principal: {
            type: Number,
            required: true,
            min: 0.01,
        },

        // Annual percentage rate, set by the reviewing admin at approval time
        interestRate: {
            type: Number,
            default: null,
            min: 0,
        },

        tenureMonths: {
            type: Number,
            required: true,
            min: 1,
        },

        // Computed at approval time from principal/interestRate/tenureMonths
        emiAmount: {
            type: Number,
            default: null,
        },

        // emiAmount * tenureMonths, the total amount owed across the loan's life
        totalPayable: {
            type: Number,
            default: null,
        },

        // Cumulative amount repaid so far
        amountPaid: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Active", "Closed"],
            default: "Pending",
        },

        purpose: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
        },

        rejectionReason: {
            type: String,
            trim: true,
            default: "",
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        disbursedAt: {
            type: Date,
            default: null,
        },

        closedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

loanSchema.index({ user: 1, status: 1 });
loanSchema.index({ status: 1, createdAt: -1 });

export const Loan = mongoose.model("Loan", loanSchema);
