import { Schema, model } from "mongoose";

const productionPlayerSchema = new Schema(
  {
    uid: { type: String, required: true },
    photo: { type: String, required: true },
    bytes: { type: Number, default: 0 },
  },
  { _id: false },
);

const productionTeamSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, required: true, index: true },
    teamName: { type: String, required: true },
    teamLogo: { type: String, required: true },
    logoBytes: { type: Number, default: 0 },
    players: { type: [productionPlayerSchema], default: [] },
    // "organizer" = added from the production desk, "link" = submitted via the public share link
    source: { type: String, enum: ["organizer", "link"], default: "organizer" },
    // sha256 of the team's private edit token (link submissions only)
    editTokenHash: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

export const ProductionTeamModel = model("ProductionTeam", productionTeamSchema);
