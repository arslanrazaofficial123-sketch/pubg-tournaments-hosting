import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    inGameName: { type: String, required: false, trim: true },
    whatsapp: { type: String, required: false, trim: true },
    password: { type: String, required: false },
    recoveryPassword: { type: String, required: false },
    email: { type: String, required: false, unique: true, index: true, sparse: true, trim: true, lowercase: true },
    googleId: { type: String, required: false, unique: true, index: true, sparse: true },
    name: { type: String, required: false, trim: true },
    avatar: { type: String, required: false },
    bio: { type: String, required: false, maxlength: 500 },
    walletBalance: { type: Number, default: 0, min: 0 },
    teamData: {
      type: {
        teamName: { type: String, default: "" },
        teamLogo: { type: String, default: "" },
        format: { type: String, enum: ["solo", "duo", "squad"], default: "squad" },
        players: [{
          uid: { type: String, default: "" },
          inGameName: { type: String, default: "" },
          picture: { type: String, default: "" },
        }],
      },
      required: false,
      default: undefined,
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = mongoose.model("User", userSchema);
