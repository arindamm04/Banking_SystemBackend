import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        message: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            enum: ["Transaction", "Account", "Security", "General"],
            default: "General",
        },

        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
