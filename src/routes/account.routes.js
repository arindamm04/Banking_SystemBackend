import { Router } from "express";
import { createAccount, 
    getMyAccounts,
    getAccountById, 
    updateAccount, 
    freezeAccount, 
    unfreezeAccount,
    closeAccount,
    getAccountBalance } from "../controllers/account.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(verifyJWT, createAccount);
router.route("/my-accounts").get(verifyJWT,getMyAccounts);
router.route("/:accountId").get(verifyJWT, getAccountById);
router.route("/:accountId").patch(verifyJWT, updateAccount);
router.route("/:accountId/freeze").patch(verifyJWT, freezeAccount);
router.route("/:accountId/unfreeze").patch(verifyJWT, unfreezeAccount);
router.route("/:accountId/close").patch(verifyJWT, closeAccount);
router.route("/:accountId/balance").get(verifyJWT, getAccountBalance);
export default router;