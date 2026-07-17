import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
    {
        accountNumber: {
            type: String,
            required: true,
            unique: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        accountType: {
            type: String,
            enum: ["Savings", "Current", "Salary"],
            required: true,
        },

        balance: {
            type: Number,
            default: 0,
            min: 0,
        },

        currency: {
            type: String,
            default: "INR",
        },

        status: {
            type: String,
            enum: ["Active", "Frozen", "Closed"],
            default: "Active",
        },

        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
        },
        nickname: {
            type: String,
            trim: true,
            maxlength: 50,
            default: ""
        },

        isPrimary: {
            type: Boolean,
            default: false
        },

        isKycVerified: {
            type: Boolean,
            default: false
        },
        openedAt: {
            type: Date,
            default: Date.now

        },
        
    
    },
    {
        timestamps: true,
    }
);

export const Account = mongoose.model("Account", accountSchema);