import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createBranch } from "../controllers/branch.controller.js";
import { getAllBranches } from "../controllers/branch.controller.js";
import { getBranchById } from "../controllers/branch.controller.js";
import { updateBranch } from "../controllers/branch.controller.js";

const router = Router();

router.route("/create").post(verifyJWT, createBranch);
router.route("/").get(verifyJWT, getAllBranches);
router.route("/:branchId").get(verifyJWT, getBranchById);
router.route("/:branchId").patch(verifyJWT, updateBranch);

export default router;