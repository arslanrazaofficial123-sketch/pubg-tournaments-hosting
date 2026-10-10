import { Schema, model } from "mongoose";

const productionPlayerSchema = new Schema(
  {
    uid: { type: String, required: true },
    photo: { type: String, required: true },
  },
  { _id: false },
);

const productionTeamSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, required: true },
    teamName: { type: String, required: true },
    teamLogo: { type: String, required: true },
    players: { type: [productionPlayerSchema], default: [] },
  },
  { timestamps: true },
);

export const ProductionTeamModel = model("ProductionTeam", productionTeamSchema);
