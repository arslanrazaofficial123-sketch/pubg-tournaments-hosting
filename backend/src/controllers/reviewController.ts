import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createReview,
  getApprovedReviews,
  getAllReviews,
  updateReviewStatus,
  deleteReviewById,
  incrementReviewHelpful,
  getReviewStats,
} from "../services/reviewService.js";

export const getPublicReviews = asyncHandler(async (req: Request, res: Response) => {
  const [reviews, stats] = await Promise.all([getApprovedReviews(), getReviewStats()]);
  res.json({ reviews, stats });
});

export const createNewReview = asyncHandler(async (req: Request, res: Response) => {
  const { name, tournament, rating, text } = req.body;

  if (!name || !tournament || rating === undefined || !text) {
    res.status(400).json({ message: "name, tournament, rating, and text are required fields" });
    return;
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ message: "rating must be a number between 1 and 5" });
    return;
  }

  const review = await createReview({
    name,
    tournament,
    rating: Math.round(rating),
    text,
  });

  res.status(201).json(review);
});

export const likeReview = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const review = await incrementReviewHelpful(id);
  if (!review) {
    res.status(404).json({ message: "Review not found" });
    return;
  }
  res.json(review);
});

export const getAdminReviews = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const reviews = await getAllReviews(status);
  res.json(reviews);
});

export const changeReviewStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!status || !["pending", "approved", "rejected"].includes(status)) {
    res.status(400).json({ message: "status must be pending, approved, or rejected" });
    return;
  }

  const review = await updateReviewStatus(id, status);
  if (!review) {
    res.status(404).json({ message: "Review not found" });
    return;
  }
  res.json(review);
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const deleted = await deleteReviewById(id);
  if (!deleted) {
    res.status(404).json({ message: "Review not found" });
    return;
  }
  res.json({ success: true, message: "Review deleted successfully" });
});