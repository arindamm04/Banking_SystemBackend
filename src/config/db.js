
import mongoose from "mongoose";
import  { DB_NAME } from "../constants.js"

import dns from "dns"

dns.setServers(["8.8.8.8", "1.1.1.1"]);


const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${process.env.DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
        console.log("DB_NAME:", DB_NAME);
        
        
    } catch (error) {
        console.log("MONGODB connection error", error)
        process.exit(1)
        
    }
};

export default connectDB;



















/*const mongoose = require("mongoose")

const dns = require("dns")

dns.setServers(["8.8.8.8", "1.1.1.1"])



function connectToDB() {

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("server is connected to DB")
        })
        .catch(err => {
            console.log("Error connecting to DB")
            process.exit(1)
        })

}


module.exports = connectToDB*/