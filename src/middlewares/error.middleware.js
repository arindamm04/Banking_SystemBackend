import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {

    let error = err;

    // Normalize known non-ApiError failures into an ApiError shape
    if (!(error instanceof ApiError)) {

        if (error.name === "CastError") {
            error = new ApiError(400, `Invalid ${error.path}: ${error.value}`);

        } else if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            error = new ApiError(400, messages.join(", ") || "Validation failed", messages);

        } else if (error.code === 11000) {
            const field = Object.keys(error.keyValue || {})[0];
            error = new ApiError(409, `${field ? field + " " : ""}already exists`);

        } else if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            error = new ApiError(401, "Invalid or expired token");

        } else {
            error = new ApiError(
                500,
                process.env.NODE_ENV === "production"
                    ? "Internal Server Error"
                    : error.message || "Internal Server Error"
            );
        }
    }

    logger.error(`${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}`);

    return res.status(error.statusCode).json({
        statusCode: error.statusCode,
        message: error.message,
        success: false,
        errors: error.errors || [],
        ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
    });
};

export { errorHandler };
