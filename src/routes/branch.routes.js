import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";
import { createBranch } from "../controllers/branch.controller.js";
import { getAllBranches } from "../controllers/branch.controller.js";
import { getBranchById } from "../controllers/branch.controller.js";
import { updateBranch } from "../controllers/branch.controller.js";

const router = Router();

router.route("/create").post(verifyJWT, verifyAdmin, createBranch);
router.route("/").get(verifyJWT, getAllBranches);
router.route("/:branchId").get(verifyJWT, getBranchById);
router.route("/:branchId").patch(verifyJWT, verifyAdmin, updateBranch);

export default router;