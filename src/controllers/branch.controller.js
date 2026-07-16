import mongoose from "mongoose";

import { Branch } from "../models/branch.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//create the branch
const createBranch = asyncHandler(async (req, res) => {

    const {
        branchName,
        branchCode,
        ifscCode,
        address,
        contactNumber,
        email,
        managerName
    } = req.body;

    if (
        !branchName ||
        !branchCode ||
        !ifscCode ||
        !address?.street ||
        !address?.city ||
        !address?.state ||
        !address?.pincode ||
        !contactNumber ||
        !email ||
        !managerName
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existingBranch = await Branch.findOne({
        $or: [
            { branchCode },
            { ifscCode }
        ]
    });

    if (existingBranch) {
        throw new ApiError(
            409,
            "Branch already exists"
        );
    }

    const branch = await Branch.create({
        branchName,
        branchCode,
        ifscCode,
        address,
        contactNumber,
        email,
        managerName
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            branch,
            "Branch created successfully"
        )
    );

});



//get all branches

const getAllBranches = asyncHandler(async (req, res) => {

    const branches = await Branch.find({});

    return res.status(200).json(
        new ApiResponse(
            200,
            branches,
            "Branches fetched successfully"
        )
    );

});

//get branch by id
const getBranchById = asyncHandler(async (req, res) => {

    const { branchId } = req.params;

    if (!mongoose.isValidObjectId(branchId)) {
        throw new ApiError(400, "Invalid Branch ID");
    }

    const branch = await Branch.findById(branchId);

    if (!branch) {
        throw new ApiError(404, "Branch not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            branch,
            "Branch fetched successfully"
        )
    );

});

//updateBranch
const updateBranch = asyncHandler(async (req, res) => {
    const { branchId } = req.params;

    if (!mongoose.isValidObjectId(branchId)) {
        throw new ApiError(400, "Invalid branch ID");
    }

    const existingBranch = await Branch.findById(branchId);

    if (!existingBranch) {
        throw new ApiError(404, "Branch not found");
    }

    const {
        branchName,
        branchCode,
        ifscCode,
        address,
        contactNumber,
        email,
        managerName,
        isActive,
    } = req.body;

    // Check duplicate branchCode
    if (branchCode && branchCode !== existingBranch.branchCode) {
        const branchCodeExists = await Branch.findOne({
            branchCode: branchCode.toUpperCase(),
            _id: { $ne: branchId },
        });

        if (branchCodeExists) {
            throw new ApiError(409, "Branch code already exists");
        }
    }

    // Check duplicate IFSC
    if (ifscCode && ifscCode !== existingBranch.ifscCode) {
        const ifscExists = await Branch.findOne({
            ifscCode: ifscCode.toUpperCase(),
            _id: { $ne: branchId },
        });

        if (ifscExists) {
            throw new ApiError(409, "IFSC code already exists");
        }
    }

    const updatedBranch = await Branch.findByIdAndUpdate(
        branchId,
        {
            ...(branchName && { branchName }),
            ...(branchCode && { branchCode: branchCode.toUpperCase() }),
            ...(ifscCode && { ifscCode: ifscCode.toUpperCase() }),
            ...(address && { address }),
            ...(contactNumber && { contactNumber }),
            ...(email && { email: email.toLowerCase() }),
            ...(managerName && { managerName }),
            ...(typeof isActive === "boolean" && { isActive }),
        },
        {
            new: true,
            runValidators: true,
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedBranch,
            "Branch updated successfully"
        )
    );
});

export {createBranch,
    getAllBranches, getBranchById, updateBranch}

