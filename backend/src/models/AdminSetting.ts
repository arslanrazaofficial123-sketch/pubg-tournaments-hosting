import mongoose, { Schema } from "mongoose";

const adminSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

export const AdminSettingModel = mongoose.model("AdminSetting", adminSettingSchema);
