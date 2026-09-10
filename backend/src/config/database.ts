import mongoose from "mongoose";
import { env } from "./env.js";
import { UserModel } from "../models/User.js";

let indexesSynced = false;

export async function connectDatabase() {
  if (mongoose.connection.readyState >= 1) {
    console.log("MongoDB already connected");
    return;
  }
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected");
  if (!indexesSynced) {
    try {
      await UserModel.syncIndexes();
      indexesSynced = true;
      console.log("UserModel indexes synchronized successfully");
    } catch (error) {
      console.error("Failed to synchronize UserModel indexes:", error);
    }
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
