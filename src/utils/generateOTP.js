import crypto from "crypto";

const generateOTP = (length = 6) => {

    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;

    return crypto.randomInt(min, max + 1).toString();
};

export { generateOTP };
