import dotenv from "dotenv";

import connectDB from "./config/db.js"
import {app} from "./app.js"

dotenv.config({
    path: './.env'
})

connectDB()
.then(() => {

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    });

})
.catch((error) => {

    console.log("MongoDB connection failed", error);

});








/*require("dotenv").config()

const app = require("./app")
const connectToDB = require("./config/db")

connectToDB()

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
*/