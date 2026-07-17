import jwt from "jsonwebtoken"
import bcrypt from "bcrypt";
import {User} from "../models/user.models.js";
import { Otp } from "../models/otp.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateOTP } from "../utils/generateOTP.js";
import { sendEmail } from "../services/email.service.js";
import {
    OTP_EXPIRY_MINUTES,
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_COOLDOWN_SECONDS,
} from "../constants.js";

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
        //console.log("Detected Error:", error);
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
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
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

/**
 * Send Email Verification OTP
 */
const sendVerificationOtp = asyncHandler(async (req, res) => {

    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    if (user.isVerified) {
        throw new ApiError(409, "Email already verified");
    }

    const cooldownStart = new Date(
        Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000
    );

    const recentOtp = await Otp.findOne({
        user: user._id,
        purpose: "email-verification",
        isUsed: false,
        createdAt: { $gte: cooldownStart },
    });

    if (recentOtp) {
        throw new ApiError(
            429,
            `Please wait before requesting another OTP`
        );
    }

    // Invalidate any previously issued, unused OTPs
    await Otp.deleteMany({
        user: user._id,
        purpose: "email-verification",
        isUsed: false,
    });

    const otp = generateOTP(6);
    const otpHash = await bcrypt.hash(otp, 10);

    await Otp.create({
        user: user._id,
        email: user.email,
        otpHash,
        purpose: "email-verification",
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    await sendEmail({
        to: user.email,
        subject: "Verify your email",
        text: `Your verification OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
        html: `<p>Your verification OTP is <strong>${otp}</strong>.</p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Verification OTP sent successfully"
        )
    );

});

/**
 * Verify Email OTP
 */
const verifyOtp = asyncHandler(async (req, res) => {

    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    const otpDoc = await Otp.findOne({
        email,
        purpose: "email-verification",
        isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
        throw new ApiError(400, "No pending OTP request found for this email");
    }

    if (otpDoc.expiresAt < new Date()) {
        throw new ApiError(400, "OTP has expired, please request a new one");
    }

    const isOtpValid = await bcrypt.compare(otp, otpDoc.otpHash);

    if (!isOtpValid) {

        otpDoc.attempts += 1;

        if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
            otpDoc.isUsed = true;
            await otpDoc.save();
            throw new ApiError(429, "Too many incorrect attempts, please request a new OTP");
        }

        await otpDoc.save();
        throw new ApiError(400, "Invalid OTP");
    }

    otpDoc.isUsed = true;
    await otpDoc.save();

    await User.findByIdAndUpdate(otpDoc.user, { isVerified: true });

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Email verified successfully"
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
    changeCurrentPassword,
    sendVerificationOtp,
    verifyOtp,
};

