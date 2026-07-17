import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * List the logged-in user's notifications (paginated)
 */
const getMyNotifications = asyncHandler(async (req, res) => {

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = { user: req.user._id };

    if (req.query.unreadOnly === "true") {
        filter.isRead = false;
    }

    const [notifications, totalItems, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("-__v")
            .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notifications,
                unreadCount,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                },
            },
            "Notifications fetched successfully"
        )
    );

});

/**
 * Mark a single notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {

    const { notificationId } = req.params;

    if (!mongoose.isValidObjectId(notificationId)) {
        throw new ApiError(400, "Invalid Notification ID");
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: req.user._id },
        { $set: { isRead: true } },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, "Notification not found or access denied");
    }

    return res.status(200).json(
        new ApiResponse(200, notification, "Notification marked as read")
    );

});

/**
 * Mark all of the logged-in user's notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {

    await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { $set: { isRead: true } }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "All notifications marked as read")
    );

});

/**
 * Delete a notification
 */
const deleteNotification = asyncHandler(async (req, res) => {

    const { notificationId } = req.params;

    if (!mongoose.isValidObjectId(notificationId)) {
        throw new ApiError(400, "Invalid Notification ID");
    }

    const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        user: req.user._id,
    });

    if (!notification) {
        throw new ApiError(404, "Notification not found or access denied");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Notification deleted successfully")
    );

});

export { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };
