import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors"

import authRouter from "./routes/auth.routes.js";
import branchRouter from "./routes/branch.routes.js";
import accountRouter from "./routes/account.routes.js";
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

export{app}








/*const express = require("express")




const app = express()


module.exports = app*/