import mongoose  from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            required: [true, "Phone number is required"],
            unique: true,
            trim: true,
        },

        password: {
            type: String,
            required: [true, "Password is required"],
        },

        aadhaarNumber: {
            type: String,
            required: [true, "Aadhaar number is required"],
            unique: true,
            trim: true,
        },

        panNumber: {
            type: String,
            required: [true, "PAN number is required"],
            unique: true,
            uppercase: true,
            trim: true,
        },

        address: {
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: {

                type: String,
                default: "India"
            }
        },

        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer",
        },

        refreshToken: {
            type: String,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },


    },
    {timestamps:true});

//Hash Password Before Saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

//Compare Password During Login

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

//Generate Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            role: this.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

//Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};





export const User = mongoose.model("User", userSchema);