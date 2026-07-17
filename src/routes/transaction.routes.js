import { Router } from "express";
import {
    deposit,
    withdraw,
    transfer,
    getTransactionHistory,
    getTransactionById,
} from "../controllers/transaction.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:accountId/deposit").post(verifyJWT, deposit);
router.route("/:accountId/withdraw").post(verifyJWT, withdraw);
router.route("/:accountId/transfer").post(verifyJWT, transfer);
router.route("/:accountId/history").get(verifyJWT, getTransactionHistory);
router.route("/:transactionId").get(verifyJWT, getTransactionById);

export default router;
