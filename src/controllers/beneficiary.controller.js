import mongoose from "mongoose";
import { Beneficiary } from "../models/beneficiary.model.js";
import { Account } from "../models/account.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Add a new beneficiary (saved payee account)
 */
const addBeneficiary = asyncHandler(async (req, res) => {

    const { accountNumber, nickname } = req.body;

    if (!accountNumber || typeof accountNumber !== "string") {
        throw new ApiError(400, "Account number is required");
    }

    if (!nickname || typeof nickname !== "string" || !nickname.trim()) {
        throw new ApiError(400, "Nickname is required");
    }

    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length > 50) {
        throw new ApiError(400, "Nickname cannot exceed 50 characters");
    }

    const account = await Account.findOne({ accountNumber })
        .populate({ path: "user", select: "fullName" });

    if (!account) {
        throw new ApiError(404, "Recipient account not found");
    }

    if (String(account.user._id) === String(req.user._id)) {
        throw new ApiError(400, "Cannot add your own account as a beneficiary");
    }

    const existingBeneficiary = await Beneficiary.findOne({
        user: req.user._id,
        accountNumber: account.accountNumber,
    });

    if (existingBeneficiary) {
        throw new ApiError(409, "This account is already saved as a beneficiary");
    }

    const beneficiary = await Beneficiary.create({
        user: req.user._id,
        account: account._id,
        accountNumber: account.accountNumber,
        accountHolderName: account.user.fullName,
        nickname: trimmedNickname,
    });

    return res.status(201).json(
        new ApiResponse(201, beneficiary, "Beneficiary added successfully")
    );

});

/**
 * List all of the logged-in user's beneficiaries
 */
const getMyBeneficiaries = asyncHandler(async (req, res) => {

    const beneficiaries = await Beneficiary.find({ user: req.user._id })
        .select("-__v")
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json(
        new ApiResponse(
            200,
            beneficiaries,
            beneficiaries.length
                ? "Beneficiaries fetched successfully"
                : "No beneficiaries found"
        )
    );

});

/**
 * Get a single beneficiary by id
 */
const getBeneficiaryById = asyncHandler(async (req, res) => {

    const { beneficiaryId } = req.params;

    if (!mongoose.isValidObjectId(beneficiaryId)) {
        throw new ApiError(400, "Invalid Beneficiary ID");
    }

    const beneficiary = await Beneficiary.findOne({
        _id: beneficiaryId,
        user: req.user._id,
    })
        .select("-__v")
        .lean();

    if (!beneficiary) {
        throw new ApiError(404, "Beneficiary not found or access denied");
    }

    return res.status(200).json(
        new ApiResponse(200, beneficiary, "Beneficiary fetched successfully")
    );

});

/**
 * Update a beneficiary's nickname and/or status
 */
const updateBeneficiary = asyncHandler(async (req, res) => {

    const { beneficiaryId } = req.params;

    if (!mongoose.isValidObjectId(beneficiaryId)) {
        throw new ApiError(400, "Invalid Beneficiary ID");
    }

    const { nickname, status } = req.body;

    if (nickname === undefined && status === undefined) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    const beneficiary = await Beneficiary.findOne({
        _id: beneficiaryId,
        user: req.user._id,
    });

    if (!beneficiary) {
        throw new ApiError(404, "Beneficiary not found or access denied");
    }

    if (nickname !== undefined) {

        if (typeof nickname !== "string" || !nickname.trim()) {
            throw new ApiError(400, "Nickname must be a non-empty string");
        }

        const trimmedNickname = nickname.trim();

        if (trimmedNickname.length > 50) {
            throw new ApiError(400, "Nickname cannot exceed 50 characters");
        }

        beneficiary.nickname = trimmedNickname;
    }

    if (status !== undefined) {

        if (!["Active", "Blocked"].includes(status)) {
            throw new ApiError(400, "Status must be either Active or Blocked");
        }

        beneficiary.status = status;
    }

    await beneficiary.save();

    return res.status(200).json(
        new ApiResponse(200, beneficiary, "Beneficiary updated successfully")
    );

});

/**
 * Remove a beneficiary
 */
const removeBeneficiary = asyncHandler(async (req, res) => {

    const { beneficiaryId } = req.params;

    if (!mongoose.isValidObjectId(beneficiaryId)) {
        throw new ApiError(400, "Invalid Beneficiary ID");
    }

    const beneficiary = await Beneficiary.findOneAndDelete({
        _id: beneficiaryId,
        user: req.user._id,
    });

    if (!beneficiary) {
        throw new ApiError(404, "Beneficiary not found or access denied");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Beneficiary removed successfully")
    );

});

export {
    addBeneficiary,
    getMyBeneficiaries,
    getBeneficiaryById,
    updateBeneficiary,
    removeBeneficiary,
};
