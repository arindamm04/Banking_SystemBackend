import nodemailer from "nodemailer";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

let transporter;

const getTransporter = () => {

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {

    try {

        return await getTransporter().sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html,
        });

    } catch (error) {

        logger.error(`Email send failed to ${to}: ${error.message}`);
        throw new ApiError(500, "Failed to send email");
    }
};

export { sendEmail };
