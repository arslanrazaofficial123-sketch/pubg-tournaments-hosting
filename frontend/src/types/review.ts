export interface Review {
  id: string;
  name: string;
  tournament: string;
  rating: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  total: number;
  approved: number;
  average: number;
  bars: Array<{ stars: number; pct: number }>;
}

export interface ReviewsResponse {
  reviews: Review[];
  stats: ReviewStats;
}