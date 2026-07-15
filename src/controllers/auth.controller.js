import jwt from "jsonwebtoken"
import {User} from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Generate Access & Refresh Tokens
 */
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({
            validateBeforeSave: false,
        });

        return {
            accessToken,
            refreshToken,
        };

    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh tokens"
        );
    }
};

/**
 * Register User
 */
const registerUser = asyncHandler(async (req, res) => {

    const {
        fullName,
        email,
        phone,
        password,
        aadhaarNumber,
        panNumber,
        address
    } = req.body;

    // Check required fields
    if (
        !fullName ||
        !email ||
        !phone ||
        !password ||
        !aadhaarNumber ||
        !panNumber ||
        !address
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check duplicate user
    const existingUser = await User.findOne({
        $or: [
            { email },
            { phone },
            { aadhaarNumber },
            { panNumber }
        ]
    });

    if (existingUser) {
        throw new ApiError(
            409,
            "User with email, phone, Aadhaar or PAN already exists"
        );
    }

    // Create user
    const user = await User.create({
        fullName,
        email,
        phone,
        password,
        aadhaarNumber,
        panNumber,
        address
    });

    // Fetch created user without sensitive data
    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            createdUser,
            "User registered successfully"
        )
    );

});


/**
 * Login User
 */
const loginUser = asyncHandler(async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(
            400,
            "Email and Password are required"
        );
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(
            404,
            "User does not exist"
        );
    }

    // Compare password
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(
            401,
            "Invalid user credentials"
        );
    }

    // Generate tokens
    const {
        accessToken,
        refreshToken,
    } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken");

    const options = {
        httpOnly: true,
        //secure: true,
        secure: process.env.NODE_ENV ==="production",
        sameSite: "strict",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );

});


/**
 * Logout User
 */
const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully"
            )
        );
});


/**
 * Refresh Access Token
 */
const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken =
        req.cookies.refreshToken ||
        req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(
            401,
            "Unauthorized request"
        );
    }

    try {

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(
                401,
                "Invalid Refresh Token"
            );
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(
                401,
                "Refresh Token has expired or is invalid"
            );
        }

        const options = {
            httpOnly: true,
            //secure: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        };

        const {
            accessToken,
            refreshToken
        } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken
                    },
                    "Access token refreshed successfully"
                )
            );

    } catch (error) {

        throw new ApiError(
            401,
            error?.message || "Invalid refresh token"
        );

    }

});

/**
 * Get Current Logged In User
 */
const getCurrentUser = asyncHandler(async (req, res) => {

    return res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            "Current user fetched successfully"
        )
    );

});


/**
 * Change Password
 */
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const {
        oldPassword,
        newPassword,
        confirmPassword
    } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
        throw new ApiError(
            400,
            "All password fields are required"
        );
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(
            400,
            "New Password and Confirm Password do not match"
        );
    }

    const user = await User.findById(req.user._id);

    const isPasswordCorrect =
        await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(
            400,
            "Old password is incorrect"
        );
    }

    user.password = newPassword;

    await user.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    );

});

export {
    registerUser,
    loginUser,
    generateAccessAndRefreshTokens,
    logoutUser,
    refreshAccessToken, 
    getCurrentUser, 
    changeCurrentPassword
};

