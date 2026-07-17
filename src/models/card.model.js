import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
    {
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        cardNumber: {
            type: String,
            required: true,
            unique: true,
        },

        cardHolderName: {
            type: String,
            required: true,
            trim: true,
        },

        expiryMonth: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },

        expiryYear: {
            type: Number,
            required: true,
        },

        // Never returned in API responses, only used to verify card-present transactions
        cvvHash: {
            type: String,
            required: true,
            select: false,
        },

        status: {
            type: String,
            enum: ["Active", "Blocked"],
            default: "Active",
        },

        issuedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

cardSchema.index({ account: 1 });

export const Card = mongoose.model("Card", cardSchema);
