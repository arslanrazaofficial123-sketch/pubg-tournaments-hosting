import { Schema, model } from "mongoose";

const shopOrderSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    packageId: { type: Number, required: true },
    packageLabel: { type: String, required: true },
    ucAmount: { type: Number, required: true },
    price: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["manual", "wallet"], required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded"],
      default: "pending",
    },
    // Customer info
    pubgUid: { type: String, required: true },
    inGameName: { type: String, required: true },
    email: { type: String, default: undefined },
    // Manual payment fields
    transactionId: { type: String },
    receiptUrl: { type: String },
    // Wallet payment fields
    walletDeducted: { type: Boolean, default: false },
    // Admin fields
    processedBy: { type: String },
    processedAt: { type: Date },
    adminNote: { type: String },
  },
  { timestamps: true },
);

shopOrderSchema.index({ pubgUid: 1, createdAt: -1 });
shopOrderSchema.index({ status: 1 });
shopOrderSchema.index({ transactionId: 1 });

export const ShopOrderModel = model("ShopOrder", shopOrderSchema);
export type ShopOrder = {
  id: string;
  packageId: number;
  packageLabel: string;
  ucAmount: number;
  price: number;
  paymentMethod: "manual" | "wallet";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  pubgUid: string;
  inGameName: string;
  email?: string | null;
  transactionId?: string | null;
  receiptUrl?: string | null;
  walletDeducted: boolean;
  processedBy?: string | null;
  processedAt?: Date | null;
  adminNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
};