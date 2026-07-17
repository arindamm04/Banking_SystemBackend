import { ApiError } from "../utils/ApiError.js";

// Must run after verifyJWT — relies on req.user being populated.
const verifyAdmin = (req, res, next) => {

    if (!req.user) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (req.user.role !== "admin") {
        throw new ApiError(403, "Access denied: admin privileges required");
    }

    next();
};

export { verifyAdmin };
