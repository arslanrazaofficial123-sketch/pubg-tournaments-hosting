import { Schema, model } from "mongoose";

const productionTournamentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    // Public share code used in /p/<slug>. Generated lazily for older tournaments.
    slug: { type: String, unique: true, sparse: true },
    acceptingUploads: { type: Boolean, default: true },
    deadline: { type: Date, default: null },
  },
  { timestamps: true },
);

export const ProductionTournamentModel = model("ProductionTournament", productionTournamentSchema);
