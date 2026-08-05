import { ReviewModel } from "../models/Review.js";
import { v4 as uuidv4 } from "uuid";

export async function createReview(payload: {
  name: string;
  tournament: string;
  rating: number;
  text: string;
  helpful?: number;
  status?: "pending" | "approved" | "rejected";
}) {
  const reviewId = `review-${uuidv4().substring(0, 8)}`;
  const review = new ReviewModel({
    id: reviewId,
    ...payload,
  });
  await review.save();
  return review.toObject();
}

export async function getApprovedReviews() {
  return ReviewModel.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getAllReviews(status?: string) {
  const query: any = {};
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query.status = status;
  }
  return ReviewModel.find(query).sort({ createdAt: -1 }).lean();
}

export async function updateReviewStatus(
  reviewId: string,
  status: "pending" | "approved" | "rejected",
) {
  const review = await ReviewModel.findOneAndUpdate(
    { id: reviewId },
    { status },
    { new: true },
  );
  return review ? review.toObject() : null;
}

export async function deleteReviewById(reviewId: string) {
  const result = await ReviewModel.deleteOne({ id: reviewId });
  return result.deletedCount > 0;
}

export async function incrementReviewHelpful(reviewId: string) {
  const review = await ReviewModel.findOneAndUpdate(
    { id: reviewId, status: "approved" },
    { $inc: { helpful: 1 } },
    { new: true },
  );
  return review ? review.toObject() : null;
}

export async function getReviewStats() {
  const [total, approved, avg] = await Promise.all([
    ReviewModel.countDocuments({}),
    ReviewModel.countDocuments({ status: "approved" }),
    ReviewModel.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]),
  ]);

  const average = avg.length > 0 ? Math.round(avg[0].avgRating * 10) / 10 : 0;
  const distribution = await ReviewModel.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);
  const bars = [5, 4, 3, 2, 1].map((stars) => {
    const found = distribution.find((d) => d._id === stars);
    const count = found ? (found as any).count : 0;
    const pct = approved > 0 ? Math.round((count / approved) * 1000) / 10 : 0;
    return { stars, pct };
  });

  return { total, approved, average, bars };
}