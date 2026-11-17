import mongoose, { Schema } from "mongoose";

// One finished tournament on the homepage: champion poster + final rankings picture.
const showcaseSchema = new Schema(
  {
    tournamentName: { type: String, required: true },
    winnerTeam: { type: String, default: "" },
    dateLabel: { type: String, default: "" },
    organizer: { type: String, default: "" },
    championUrl: { type: String, default: "" },
    rankingsUrl: { type: String, default: "" },
    youtubeUrl: { type: String, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ShowcaseModel = mongoose.model("Showcase", showcaseSchema);
