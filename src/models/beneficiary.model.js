import mongoose from "mongoose";

const beneficiarySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },

        // Snapshot of the payee's account number at the time it was added
        accountNumber: {
            type: String,
            required: true,
            trim: true,
        },

        // Snapshot of the payee's name at the time it was added
        accountHolderName: {
            type: String,
            trim: true,
        },

        nickname: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },

        status: {
            type: String,
            enum: ["Active", "Blocked"],
            default: "Active",
        },
    },
    {
        timestamps: true,
    }
);

// A user cannot save the same payee account twice
beneficiarySchema.index({ user: 1, accountNumber: 1 }, { unique: true });

export const Beneficiary = mongoose.model("Beneficiary", beneficiarySchema);
