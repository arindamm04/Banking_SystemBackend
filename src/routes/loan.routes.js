import { Router } from "express";
import {
    applyForLoan,
    getMyLoans,
    getAllLoans,
    getLoanById,
    reviewLoan,
    disburseLoan,
    makePayment,
    getLoanPayments,
} from "../controllers/loan.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

router.route("/:accountId/apply").post(verifyJWT, applyForLoan);
router.route("/").get(verifyJWT, getMyLoans);
router.route("/admin/all").get(verifyJWT, verifyAdmin, getAllLoans);
router.route("/:loanId").get(verifyJWT, getLoanById);
router.route("/:loanId/payments").get(verifyJWT, getLoanPayments);
router.route("/:loanId/review").patch(verifyJWT, verifyAdmin, reviewLoan);
router.route("/:loanId/disburse").post(verifyJWT, verifyAdmin, disburseLoan);
router.route("/:loanId/pay").post(verifyJWT, makePayment);

export default router;
