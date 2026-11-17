import mongoose from "mongoose";
import { env } from "./env.js";
import { UserModel } from "../models/User.js";

let indexesSynced = false;

export async function connectDatabase() {
  if (mongoose.connection.readyState >= 1) {
    console.log("MongoDB already connected");
    return;
  }
  // Keep the pool small: a free Atlas M0 cluster allows only ~500 connections in total.
  await mongoose.connect(env.mongoUri, { maxPoolSize: 10, minPoolSize: 0, maxIdleTimeMS: 30000, serverSelectionTimeoutMS: 15000 });
  console.log("MongoDB connected");
  if (!indexesSynced) {
    indexesSynced = true;
    // Index maintenance must never block a request (cold starts used to wait 10-30s here).
    UserModel.syncIndexes()
      .then(() => console.log("UserModel indexes synchronized successfully"))
      .catch((error) => console.error("Failed to synchronize UserModel indexes:", error));
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
