import mongoose from "mongoose";
import { env } from "./env.js";
import { UserModel } from "../models/User.js";

export async function connectDatabase() {
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected");
  try {
    await UserModel.syncIndexes();
    console.log("UserModel indexes synchronized successfully");
  } catch (error) {
    console.error("Failed to synchronize UserModel indexes:", error);
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
