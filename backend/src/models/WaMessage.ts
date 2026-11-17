import mongoose, { Schema } from "mongoose";

// Outgoing WhatsApp messages waiting for the free WhatsApp gateway (runs on the organiser's PC) to pick up.
const waMessageSchema = new Schema(
  {
    to: { type: String, required: true },
    text: { type: String, required: true },
    teamName: { type: String, default: "" },
    matchId: { type: String, default: "", index: true },
    status: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending", index: true },
    tries: { type: Number, default: 0 },
    lockedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

export const WaMessageModel = mongoose.model("WaMessage", waMessageSchema);

export const WaHeartbeat = mongoose.model(
  "WaHeartbeat",
  new Schema({ key: { type: String, unique: true }, at: Date, connected: Boolean, number: String }, { timestamps: false })
);
