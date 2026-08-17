import { Schema, model } from "mongoose";

const registrationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, required: true },
    teamName: { type: String },
    teamLogo: { type: String },
    group: { type: String, required: true },
    whatsapp: { type: String, required: true },
    receiptImage: { type: String, required: false },
    transactionId: { type: String, required: false },
    paymentMethod: {
      type: String,
      enum: ["manual", "wallet"],
      default: "manual",
    },
    entryFee: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    members: [
      {
        uid: { type: String, required: true },
        inGameName: { type: String, required: true },
        picture: { type: String },
      },
    ],
    kills: { type: Number, default: 0 },
    chickenDinner: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const RegistrationModel = model("Registration", registrationSchema);
