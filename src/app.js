import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors"

import authRouter from "./routes/auth.routes.js";
import branchRouter from "./routes/branch.routes.js";
import accountRouter from "./routes/account.routes.js";
import userRouter from "./routes/user.routes.js";
import transactionRouter from "./routes/transaction.routes.js";
import beneficiaryRouter from "./routes/beneficiary.routes.js";
import cardRouter from "./routes/card.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import loanRouter from "./routes/loan.routes.js";
import { ApiError } from "./utils/ApiError.js";
import { errorHandler } from "./middlewares/error.middleware.js";
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({
    limit: "16kb",
}));

app.use(express.urlencoded({
    extended: true,
    limit: "16kb",
}));

app.use(cookieParser());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/branches", branchRouter);
app.use("/api/v1/accounts", accountRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/beneficiaries", beneficiaryRouter);
app.use("/api/v1/cards", cardRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/loans", loanRouter);

app.use((req, res, next) => {
    next(new ApiError(404, "Route not found"));
});

app.use(errorHandler);

export{app}








/*const express = require("express")




const app = express()


module.exports = app*/