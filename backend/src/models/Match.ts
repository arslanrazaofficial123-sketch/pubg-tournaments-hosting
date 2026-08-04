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
  },
  { timestamps: true },
);

export type MatchDocument = InferSchemaType<typeof matchSchema>;

export const MatchModel = mongoose.model("Match", matchSchema);
