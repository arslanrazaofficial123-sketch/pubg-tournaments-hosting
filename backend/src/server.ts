import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { sendErrorAlert } from "./services/emailService.js";
import { UserModel } from "./models/User.js";

let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 60_000;

function canSendAlert(): boolean {
  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return false;
  lastAlertAt = now;
  return true;
}

function reportUnhandled(source: string, error: unknown) {
  if (!env.smtpUser || !env.alertEmail || !canSendAlert()) return;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[${source}]`, error);
  sendErrorAlert({
    source,
    message,
    stack,
    url: "server process",
    statusCode: 500,
  }).catch((emailErr) => {
    console.error("Failed to send error alert email:", emailErr);
  });
}

process.on("unhandledRejection", (reason) => {
  reportUnhandled("Backend / Unhandled Rejection", reason);
});

process.on("uncaughtException", (error) => {
  reportUnhandled("Backend / Uncaught Exception", error);
});

async function bootstrap() {
  try {
    await connectDatabase();
    const indexes = await UserModel.collection.indexes();
    for (const idx of indexes) {
      const keys = Object.keys(idx.key);
      if (idx.unique && (keys.includes("inGameName") || keys.includes("whatsapp"))) {
        await UserModel.collection.dropIndex(idx.name!);
        console.log(`Dropped unique index: ${idx.name}`);
      }
    }
  } catch (error) {
    reportUnhandled("Backend / Database Connection", error);
    throw error;
  }

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`API server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  reportUnhandled("Backend / Startup", error);
  console.error("Failed to start server:", error);
  process.exit(1);
});