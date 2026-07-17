import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        otpHash: {
            type: String,
            required: true,
        },

        purpose: {
            type: String,
            enum: ["email-verification"],
            default: "email-verification",
        },

        attempts: {
            type: Number,
            default: 0,
        },

        isUsed: {
            type: Boolean,
            default: false,
        },

        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Auto-remove expired OTP documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model("Otp", otpSchema);
