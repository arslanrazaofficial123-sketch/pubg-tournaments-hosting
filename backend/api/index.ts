import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { env } from "../src/config/env.js";

let isConnected = false;

async function ensureDb() {
  if (isConnected) return;
  await connectDatabase();
  isConnected = true;
}

const app = createApp();

export default async function handler(req: any, res: any) {
  await ensureDb();
  return app(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
