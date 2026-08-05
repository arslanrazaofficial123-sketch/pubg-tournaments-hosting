"use client";

import { useEffect, useState } from "react";
import { ContentPage, ContentSection } from "@/components/layout/ContentPage";
import { Star, ThumbsUp, MessageSquareQuote, CheckCircle2, Loader2 } from "lucide-react";
import { getReviews, submitReview, likeReview } from "@/services/api/reviews";
import type { Review, ReviewStats } from "@/types/review";

const EMPTY_STATS: ReviewStats = {
  total: 0,
  approved: 0,
  average: 0,
  bars: [],
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getReviews().then((res) => {
      if (cancelled) return;
      setReviews(res.reviews);
      setStats(res.stats);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const renderStars = (count: number, size = 12) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={i < count ? "fill-amber-400 text-amber-400" : "text-text-primary/20"}
      />
    ));

  const initialsOf = (name: string) =>
    (name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/)[0] || "EP")
      .slice(0, 1)
      .toUpperCase() || "E";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please pick a rating.");
      return;
    }
    setError("");
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await submitReview({
        name: (formData.get("name") as string).trim() || "Anonymous_Player",
        tournament: (formData.get("tournament") as string) || "EPIX Tournament",
        rating,
        text: (formData.get("text") as string).trim(),
      });
      form.reset();
      setRating(0);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (review: Review) => {
    try {
      const updated = await likeReview(review.id);
      setReviews((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, helpful: updated.helpful } : r)),
      );
    } catch {
      // Silently ignore network failures on the like button.
    }
  };

  return (
    <ContentPage
      heading="Player Reviews"
      description="Real feedback from the EPIX community — every review from verified tournament players."
    >
      {/* Rating Summary */}
      <section className="rounded-xl border border-amber-400/20 bg-bg-secondary p-6 sm:p-8">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="text-center">
            <div className="text-6xl font-black text-amber-400">
              {loading ? "—" : stats.average.toFixed(1)}
            </div>
            <div className="mt-2 flex items-center justify-center gap-0.5 text-amber-400">
              {renderStars(Math.round(stats.average), 14)}
            </div>
            <p className="mt-2 text-xs text-text-primary/50">
              Based on {loading ? 0 : stats.approved} verified reviews
            </p>
          </div>
          <div className="space-y-2.5">
            {(loading ? [5, 4, 3, 2, 1].map((s) => ({ stars: s, pct: 0 })) : stats.bars).map(
              (bar) => (
                <div
                  key={bar.stars}
                  className="flex items-center gap-3 text-xs text-text-primary/50"
                >
                  <span className="w-6 shrink-0 font-bold">{bar.stars}★</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                      style={{ width: loading ? "0%" : `${bar.pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono">
                    {loading ? "—" : `${bar.pct}%`}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <ContentSection title="Latest Reviews">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-text-primary/50">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-bold text-text-primary/80">No reviews yet</p>
            <p className="mt-2 text-sm text-text-primary/50">
              Be the first to review an EPIX tournament below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="flex flex-col rounded-2xl border border-border bg-bg-secondary p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent to-purple-400 text-sm font-extrabold text-white">
                    {initialsOf(review.name)}
                  </div>
                  <div className="min-w-0">
                    <b className="block truncate text-sm text-text-primary">{review.name}</b>
                    <small className="text-[11.5px] text-text-primary/45">
                      Verified player ·{" "}
                      {new Date(review.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </small>
                  </div>
                  <span className="ml-auto flex shrink-0 items-center gap-0.5 text-amber-400">
                    {renderStars(review.rating)}
                  </span>
                </div>

                <span className="mt-3 self-start rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-accent">
                  {review.tournament}
                </span>

                <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-text-primary/70">
                  {review.text}
                </p>

                <button
                  type="button"
                  onClick={() => handleHelpful(review)}
                  className="mt-4 flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-text-primary/50 transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <ThumbsUp size={13} />
                  {review.helpful} found this helpful
                </button>
              </div>
            ))}
          </div>
        )}
      </ContentSection>

      {/* Write a Review */}
      <ContentSection title="Write a Review">
        <p className="text-xs text-text-primary/50">
          Played an EPIX tournament? Tell the community how it went. Your review will appear
          after verification.
        </p>
        {submitted ? (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm font-semibold text-emerald-300">
            <CheckCircle2 size={20} />
            Thanks for your review! It will appear on this page after verification.
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-primary/50">
                  Your Name / IGN
                </label>
                <input
                  name="name"
                  required
                  type="text"
                  placeholder="e.g. Vortex_King"
                  className="w-full rounded-lg border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-primary/30 focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-primary/50">
                  Tournament
                </label>
                <select
                  name="tournament"
                  required
                  className="w-full rounded-lg border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                >
                  <option value="EPIX Champions Cup #3">EPIX Champions Cup #3</option>
                  <option value="EPIX Solo Showdown">EPIX Solo Showdown</option>
                  <option value="EPIX Duo Clash">EPIX Duo Clash</option>
                  <option value="EPIX Weekly Cup #12">EPIX Weekly Cup #12</option>
                  <option value="Season 3 Grand Finals">Season 3 Grand Finals</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-primary/50">
                Your Rating
              </label>
              <div className="flex gap-1.5 text-2xl">
                {Array.from({ length: 5 }, (_, i) => {
                  const value = i + 1;
                  const active = (hoverRating || rating) >= value;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${value} star${value > 1 ? "s" : ""}`}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(value)}
                      className={`transition-transform duration-150 hover:scale-110 ${
                        active
                          ? "text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.55)]"
                          : "text-text-primary/15"
                      }`}
                    >
                      <Star className={active ? "fill-amber-400 text-amber-400" : ""} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-primary/50">
                Your Review
              </label>
              <textarea
                name="text"
                required
                rows={4}
                placeholder="How was the tournament? Fair lobbies, payouts, organization..."
                className="w-full resize-y rounded-lg border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-primary/30 focus:border-accent"
              />
            </div>

            {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-bg-primary shadow-lg shadow-accent/20 transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MessageSquareQuote size={16} />
                )}
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
              <span className="text-xs text-text-primary/50">
                Your review will appear after verification.
              </span>
            </div>
          </form>
        )}
      </ContentSection>
    </ContentPage>
  );
}