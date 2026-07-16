import { Counter } from "../models/counter.model.js";

const generateAccountNumber = async (session) => {

    const counter = await Counter.findByIdAndUpdate(
        "accountNumber",
        {
            $inc: {
                sequenceValue: 1
            }
        },
        {
            new: true,
            upsert: true,
            session
        }
    );

    const year = new Date().getFullYear();

    const sequence = counter.sequenceValue
        .toString()
        .padStart(6, "0");

    return `${year}${sequence}`;
};

export {generateAccountNumber}