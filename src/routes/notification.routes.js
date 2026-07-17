import { Router } from "express";
import {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(verifyJWT, getMyNotifications);
router.route("/read-all").patch(verifyJWT, markAllAsRead);
router.route("/:notificationId/read").patch(verifyJWT, markAsRead);
router.route("/:notificationId").delete(verifyJWT, deleteNotification);

export default router;
