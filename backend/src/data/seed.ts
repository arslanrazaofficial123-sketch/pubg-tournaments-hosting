import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { TournamentModel } from "../models/Tournament.js";
import { ReviewModel } from "../models/Review.js";
import { seedTournaments } from "./seedTournaments.js";
import { seedReviews } from "./seedReviews.js";

async function seed() {
  await connectDatabase();
  await TournamentModel.deleteMany({});
  await TournamentModel.insertMany(seedTournaments);
  console.log(`Seeded ${seedTournaments.length} tournaments`);

  await ReviewModel.deleteMany({});
  await ReviewModel.insertMany(seedReviews);
  console.log(`Seeded ${seedReviews.length} reviews`);

  await disconnectDatabase();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
