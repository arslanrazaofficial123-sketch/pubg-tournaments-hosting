import mongoose, { Schema, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tournament: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    helpful: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type ReviewDocument = InferSchemaType<typeof reviewSchema>;

export const ReviewModel = mongoose.model("Review", reviewSchema);
