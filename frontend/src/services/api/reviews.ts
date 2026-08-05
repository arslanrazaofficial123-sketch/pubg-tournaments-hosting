import { apiClient } from "./client";
import type { Review, ReviewsResponse } from "@/types/review";

export async function getReviews(): Promise<ReviewsResponse> {
  try {
    return await apiClient<ReviewsResponse>("/reviews");
  } catch {
    return { reviews: [], stats: { total: 0, approved: 0, average: 0, bars: [] } };
  }
}

export async function submitReview(payload: {
  name: string;
  tournament: string;
  rating: number;
  text: string;
}): Promise<Review> {
  return apiClient<Review>("/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function likeReview(reviewId: string): Promise<Review> {
  return apiClient<Review>(`/reviews/${reviewId}/helpful`, {
    method: "POST",
  });
}

export async function getAdminReviews(
  status?: string,
): Promise<Review[]> {
  try {
    let url = "/reviews/admin/all";
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      url += `?status=${status}`;
    }
    return await apiClient<Review[]>(url);
  } catch {
    return [];
  }
}

export async function updateReviewStatus(
  reviewId: string,
  status: "pending" | "approved" | "rejected",
): Promise<Review> {
  return apiClient<Review>(`/reviews/${reviewId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function deleteReview(reviewId: string): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(`/reviews/${reviewId}`, {
    method: "DELETE",
  });
}