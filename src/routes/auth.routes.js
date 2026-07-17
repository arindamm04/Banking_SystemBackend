import { Router } from "express";

import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    sendVerificationOtp,
    verifyOtp,
} from "../controllers/auth.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Public Routes
 */
router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/send-verification-otp").post(sendVerificationOtp);

router.route("/verify-otp").post(verifyOtp);

/**
 * Protected Routes
 */
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/current-user").get(
    verifyJWT,
    getCurrentUser
);

router.route("/change-password").patch(
    verifyJWT,
    changeCurrentPassword
);

export default router;