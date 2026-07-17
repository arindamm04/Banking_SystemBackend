import { Notification } from "../models/notification.model.js";
import { sendEmail } from "./email.service.js";
import { logger } from "../utils/logger.js";

// Best-effort side channel: a notification failure must never break the
// primary operation (e.g. a deposit) that triggered it, so all errors here
// are logged and swallowed rather than thrown.
const notifyUser = async ({ user, title, message, type = "General", email = null }) => {

    try {

        await Notification.create({ user, title, message, type });

        if (email) {
            await sendEmail({
                to: email,
                subject: title,
                text: message,
                html: `<p>${message}</p>`,
            }).catch((error) => {
                logger.warn(`Notification email skipped for ${email}: ${error.message}`);
            });
        }

    } catch (error) {
        logger.error(`Failed to create notification for user ${user}: ${error.message}`);
    }

};

export { notifyUser };
