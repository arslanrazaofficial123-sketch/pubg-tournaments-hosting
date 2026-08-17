import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    inGameName: { type: String, required: false, unique: true, index: true, trim: true, sparse: true },
    whatsapp: { type: String, required: false, unique: true, index: true, sparse: true },
    password: { type: String, required: false },
    recoveryPassword: { type: String, required: false },
    email: { type: String, required: false, unique: true, index: true, sparse: true, trim: true, lowercase: true },
    googleId: { type: String, required: false, unique: true, index: true, sparse: true },
    name: { type: String, required: false, trim: true },
    avatar: { type: String, required: false },
    bio: { type: String, required: false, maxlength: 500 },
    walletBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = mongoose.model("User", userSchema);
