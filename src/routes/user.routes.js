import { Router } from "express";
import {
    updateProfile,
    getUserById,
    getAllUsers,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

router.route("/profile").patch(verifyJWT, updateProfile);
router.route("/").get(verifyJWT, verifyAdmin, getAllUsers);
router.route("/:userId").get(verifyJWT, verifyAdmin, getUserById);

export default router;
