import mongoose, { Schema, type InferSchemaType } from "mongoose";

const tournamentImagesSchema = new Schema(
  {
    card: { type: String, required: true },
    modal: { type: String, required: true },
  },
  { _id: false },
);

const tournamentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ["registration_open", "upcoming", "ongoing", "ended"],
      required: true,
    },
    description: { type: String, required: true },
    prizePool: { type: String, required: true },
    format: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    region: { type: String, required: true },
    maxTeams: { type: Number, required: true },
    registeredTeams: { type: Number, required: true },
    registrationDeadline: { type: String, required: true },
    registrationFee: { type: String, required: true },
    numDays: { type: Number, required: true },
    numGroups: { type: Number, required: true },
    teamsPerGroup: { type: Number, required: true },
    tournamentId: { type: String, required: true },
    images: { type: tournamentImagesSchema, required: true },
  },
  { timestamps: true },
);

export type TournamentDocument = InferSchemaType<typeof tournamentSchema>;

export const TournamentModel = mongoose.model("Tournament", tournamentSchema);
