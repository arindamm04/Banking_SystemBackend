import crypto from "crypto";

// Standard Luhn check digit, used by all real card networks
const luhnCheckDigit = (digits) => {

    let sum = 0;
    let shouldDouble = true;

    for (let i = digits.length - 1; i >= 0; i--) {

        let digit = digits[i];

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }

    return (10 - (sum % 10)) % 10;
};

// Generates a 16-digit, Luhn-valid card number: 6-digit issuer prefix +
// 9 random digits + 1 Luhn check digit.
const generateCardNumber = () => {

    const issuerPrefix = "460000";

    let numberWithoutCheckDigit = issuerPrefix;

    for (let i = 0; i < 9; i++) {
        numberWithoutCheckDigit += crypto.randomInt(0, 10).toString();
    }

    const digits = numberWithoutCheckDigit.split("").map(Number);
    const checkDigit = luhnCheckDigit(digits);

    return numberWithoutCheckDigit + checkDigit.toString();
};

const generateCVV = () => {
    return crypto.randomInt(100, 1000).toString();
};

const maskCardNumber = (cardNumber) => {
    return `**** **** **** ${cardNumber.slice(-4)}`;
};

export { generateCardNumber, generateCVV, maskCardNumber };
