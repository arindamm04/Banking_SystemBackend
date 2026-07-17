import { Router } from "express";
import {
    addBeneficiary,
    getMyBeneficiaries,
    getBeneficiaryById,
    updateBeneficiary,
    removeBeneficiary,
} from "../controllers/beneficiary.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(verifyJWT, addBeneficiary);
router.route("/").get(verifyJWT, getMyBeneficiaries);
router.route("/:beneficiaryId").get(verifyJWT, getBeneficiaryById);
router.route("/:beneficiaryId").patch(verifyJWT, updateBeneficiary);
router.route("/:beneficiaryId").delete(verifyJWT, removeBeneficiary);

export default router;
