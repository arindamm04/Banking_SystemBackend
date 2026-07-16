import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
    {
        branchName: {
            type: String,
            required: true,
            trim: true,
        },

        branchCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        ifscCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        address: {
            street: {
                type: String,
                required: true,
                trim: true,
            },

            city: {
                type: String,
                required: true,
                trim: true,
            },

            state: {
                type: String,
                required: true,
                trim: true,
            },

            pincode: {
                type: String,
                required: true,
                trim: true,
            },

            country: {
                type: String,
                default: "India",
                trim: true,
            },
        },

        contactNumber: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        managerName: {
            type: String,
            required: true,
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Branch = mongoose.model("Branch", branchSchema);