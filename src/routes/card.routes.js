import { Router } from "express";
import {
    issueCard,
    getMyCards,
    getCardById,
    blockCard,
    unblockCard,
} from "../controllers/card.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:accountId/issue").post(verifyJWT, issueCard);
router.route("/").get(verifyJWT, getMyCards);
router.route("/:cardId").get(verifyJWT, getCardById);
router.route("/:cardId/block").patch(verifyJWT, blockCard);
router.route("/:cardId/unblock").patch(verifyJWT, unblockCard);

export default router;
