import mongoose, { Schema, type InferSchemaType } from "mongoose";

const matchSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, required: true },
    day: { type: Number, required: true },
    title: { type: String, required: true },
    map: {
      type: String,
      enum: ["Erangel", "Miramar", "Sanhok", "Vikendi", "Nusa", "Karakin", "Rondo"],
      required: true,
    },
    time: { type: String, required: true },
    date: { type: String, required: true },
    groups: { type: [String], default: [] },
    roomId: { type: String, default: "" },
    roomPassword: { type: String, default: "" },
    revealAt: { type: String, default: "" },
    // send the room ID and password by itself as soon as revealAt passes
    autoSend: { type: Boolean, default: true },
    // when the credentials actually went out, and how that went (so nothing is sent twice)
    credentialsSentAt: { type: String, default: "" },
    lastSendReport: {
      type: new Schema(
        {
          at: { type: String, default: "" },
          by: { type: String, default: "" },
          total: { type: Number, default: 0 },
          sent: { type: Number, default: 0 },
          failed: { type: Number, default: 0 },
          noNumber: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

export type MatchDocument = InferSchemaType<typeof matchSchema>;

export const MatchModel = mongoose.model("Match", matchSchema);
