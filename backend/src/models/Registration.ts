import { Schema, model } from "mongoose";

const registrationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, required: true },
    teamName: { type: String },
    group: { type: String, required: true },
    whatsapp: { type: String, required: true },
    receiptImage: { type: String, required: true },
    transactionId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    members: [
      {
        uid: { type: String, required: true },
        inGameName: { type: String, required: true },
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
