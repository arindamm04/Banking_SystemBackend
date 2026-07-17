import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Card } from "../models/card.model.js";
import { Account } from "../models/account.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateCardNumber, generateCVV, maskCardNumber } from "../utils/generateCardNumber.js";

const CARD_VALIDITY_YEARS = 5;
const MAX_GENERATION_ATTEMPTS = 5;

const toMaskedCard = (card) => ({
    ...card,
    cardNumber: maskCardNumber(card.cardNumber),
});

/**
 * Issue a new debit card for one of the logged-in user's own accounts
 */
const issueCard = asyncHandler(async (req, res) => {

    const { accountId } = req.params;

    if (!mongoose.isValidObjectId(accountId)) {
        throw new ApiError(400, "Invalid Account ID");
    }

    const account = await Account.findOne({
        _id: accountId,
        user: req.user._id,
    });

    if (!account) {
        throw new ApiError(404, "Account not found or access denied");
    }

    if (account.status !== "Active") {
        throw new ApiError(400, `Account is ${account.status}, cannot issue a card`);
    }

    const existingActiveCard = await Card.findOne({
        account: accountId,
        status: "Active",
    });

    if (existingActiveCard) {
        throw new ApiError(409, "This account already has an active card");
    }

    const cvv = generateCVV();
    const cvvHash = await bcrypt.hash(cvv, 10);

    const now = new Date();
    const expiryMonth = now.getMonth() + 1;
    const expiryYear = now.getFullYear() + CARD_VALIDITY_YEARS;

    let card;

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {

        try {

            card = await Card.create({
                account: account._id,
                user: req.user._id,
                cardNumber: generateCardNumber(),
                cardHolderName: req.user.fullName,
                expiryMonth,
                expiryYear,
                cvvHash,
            });

            break;

        } catch (error) {

            if (error.code === 11000 && attempt < MAX_GENERATION_ATTEMPTS - 1) {
                continue;
            }

            throw error;
        }
    }

    // Full card number and CVV are only ever shown once, at issuance
    return res.status(201).json(
        new ApiResponse(
            201,
            {
                _id: card._id,
                account: card.account,
                cardNumber: card.cardNumber,
                cvv,
                cardHolderName: card.cardHolderName,
                expiryMonth: card.expiryMonth,
                expiryYear: card.expiryYear,
                status: card.status,
                issuedAt: card.issuedAt,
            },
            "Card issued successfully. Save these details now — the full card number and CVV will not be shown again."
        )
    );

});

/**
 * List all of the logged-in user's cards (masked)
 */
const getMyCards = asyncHandler(async (req, res) => {

    const cards = await Card.find({ user: req.user._id })
        .select("-__v")
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json(
        new ApiResponse(
            200,
            cards.map(toMaskedCard),
            cards.length ? "Cards fetched successfully" : "No cards found"
        )
    );

});

/**
 * Get a single card by id (masked)
 */
const getCardById = asyncHandler(async (req, res) => {

    const { cardId } = req.params;

    if (!mongoose.isValidObjectId(cardId)) {
        throw new ApiError(400, "Invalid Card ID");
    }

    const card = await Card.findOne({
        _id: cardId,
        user: req.user._id,
    })
        .select("-__v")
        .lean();

    if (!card) {
        throw new ApiError(404, "Card not found or access denied");
    }

    return res.status(200).json(
        new ApiResponse(200, toMaskedCard(card), "Card fetched successfully")
    );

});

/**
 * Block a card
 */
const blockCard = asyncHandler(async (req, res) => {

    const { cardId } = req.params;

    if (!mongoose.isValidObjectId(cardId)) {
        throw new ApiError(400, "Invalid Card ID");
    }

    const card = await Card.findOne({ _id: cardId, user: req.user._id });

    if (!card) {
        throw new ApiError(404, "Card not found or access denied");
    }

    if (card.status === "Blocked") {
        throw new ApiError(400, "Card is already blocked");
    }

    card.status = "Blocked";
    await card.save();

    return res.status(200).json(
        new ApiResponse(200, toMaskedCard(card.toObject()), "Card blocked successfully")
    );

});

/**
 * Unblock a card
 */
const unblockCard = asyncHandler(async (req, res) => {

    const { cardId } = req.params;

    if (!mongoose.isValidObjectId(cardId)) {
        throw new ApiError(400, "Invalid Card ID");
    }

    const card = await Card.findOne({ _id: cardId, user: req.user._id });

    if (!card) {
        throw new ApiError(404, "Card not found or access denied");
    }

    if (card.status === "Active") {
        throw new ApiError(400, "Card is already active");
    }

    card.status = "Active";
    await card.save();

    return res.status(200).json(
        new ApiResponse(200, toMaskedCard(card.toObject()), "Card unblocked successfully")
    );

});

export { issueCard, getMyCards, getCardById, blockCard, unblockCard };
