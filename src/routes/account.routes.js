import { Router } from "express";
import { createAccount, getMyAccounts } from "../controllers/account.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(verifyJWT, createAccount);
router.route("/my-accounts").get(verifyJWT,getMyAccounts);

export default router;