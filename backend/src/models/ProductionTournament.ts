import { Schema, model } from "mongoose";

const productionTournamentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

export const ProductionTournamentModel = model("ProductionTournament", productionTournamentSchema);
