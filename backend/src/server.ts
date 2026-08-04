import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { TournamentModel } from "./models/Tournament.js";
import { seedTournaments } from "./data/seedTournaments.js";

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`API server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
