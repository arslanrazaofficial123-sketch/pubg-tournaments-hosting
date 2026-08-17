import { Schema, model } from "mongoose";

const walletTransactionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    uid: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["deposit", "withdraw", "entryFee", "prize", "refund"],
      required: true,
    },
    // Positive for credits, negative for debits.
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    description: { type: String, default: "" },
    tournamentId: { type: String },
    registrationId: { type: String },
    // Deposit fields
    externalTransactionId: { type: String },
    note: { type: String },
    screenshotUrl: { type: String },
    // Withdraw fields
    paymentMethod: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    // Admin audit
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

export const WalletTransactionModel = model(
  "WalletTransaction",
  walletTransactionSchema,
);