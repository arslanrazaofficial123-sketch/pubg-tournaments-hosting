import { Schema, model } from "mongoose";

const dataDeletionRequestSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    emailOrUsername: { type: String, required: true, trim: true },
    whatsappOrPhone: { type: String, required: true, trim: true },
    teamName: { type: String, trim: true, default: "" },
    reason: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "verified", "processing", "completed", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

dataDeletionRequestSchema.index({ status: 1 });
dataDeletionRequestSchema.index({ createdAt: -1 });

export const DataDeletionRequestModel = model(
  "DataDeletionRequest",
  dataDeletionRequestSchema,
);

export type DataDeletionRequest = {
  id: string;
  fullName: string;
  emailOrUsername: string;
  whatsappOrPhone: string;
  teamName: string;
  reason: string;
  status: "pending" | "verified" | "processing" | "completed" | "rejected";
  adminNote: string;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
