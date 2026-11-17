import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { TournamentModel } from "../models/Tournament.js";
import { seedTournaments } from "./seedTournaments.js";

async function seed() {
  await connectDatabase();
  await TournamentModel.deleteMany({});
  await TournamentModel.insertMany(seedTournaments);
  console.log(`Seeded ${seedTournaments.length} tournaments`);
  await disconnectDatabase();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
