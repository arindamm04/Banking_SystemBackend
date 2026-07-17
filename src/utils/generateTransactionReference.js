import { Counter } from "../models/counter.model.js";

const generateTransactionReference = async (session) => {

    const counter = await Counter.findByIdAndUpdate(
        "transactionRef",
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

    return `TXN${year}${sequence}`;
};

export { generateTransactionReference };
