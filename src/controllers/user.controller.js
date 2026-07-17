import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Update Own Profile
 */
const updateProfile = asyncHandler(async (req, res) => {

    const {
        fullName,
        phone,
        address,
        email,
        aadhaarNumber,
        panNumber,
        role,
    } = req.body;

    if (
        email !== undefined ||
        aadhaarNumber !== undefined ||
        panNumber !== undefined ||
        role !== undefined
    ) {
        throw new ApiError(
            400,
            "Email, Aadhaar number, PAN number and role cannot be updated"
        );
    }

    if (fullName === undefined && phone === undefined && address === undefined) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    const updateFields = {};

    if (fullName !== undefined) {
        updateFields.fullName = fullName;
    }

    if (phone !== undefined) {

        const existingPhone = await User.findOne({
            phone,
            _id: { $ne: req.user._id },
        });

        if (existingPhone) {
            throw new ApiError(409, "Phone number already in use");
        }

        updateFields.phone = phone;
    }

    if (address !== undefined) {
        const existingAddress = req.user.address
            ? req.user.address.toObject()
            : {};

        updateFields.address = { ...existingAddress, ...address };
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser,
            "Profile updated successfully"
        )
    );

});

/**
 * Get User By Id (Admin Only)
 */
const getUserById = asyncHandler(async (req, res) => {

    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const user = await User.findById(userId)
        .select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "User fetched successfully"
        )
    );

});

/**
 * Get All Users (Admin Only)
 */
const getAllUsers = asyncHandler(async (req, res) => {

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

    const [users, total] = await Promise.all([
        User.find({})
            .select("-password -refreshToken")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        User.countDocuments({}),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            "Users fetched successfully"
        )
    );

});

export { updateProfile, getUserById, getAllUsers };
