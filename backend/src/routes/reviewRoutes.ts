import { Router } from "express";
import {
  getPublicReviews,
  createNewReview,
  likeReview,
  getAdminReviews,
  changeReviewStatus,
  deleteReview,
} from "../controllers/reviewController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", getPublicReviews);
router.post("/", createNewReview);
router.post("/:id/helpful", likeReview);

router.get("/admin/all", requireAdmin, getAdminReviews);
router.put("/:id/status", requireAdmin, changeReviewStatus);
router.delete("/:id", requireAdmin, deleteReview);

export default router;