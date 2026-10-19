"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { Star, Clock, AlertCircle, CheckCircle2, Edit3, MessageSquare } from "lucide-react";
import { submitBookReview } from "@/actions/reviews";
import type { BookReview, BookRatingSummary } from "@/types/book-details";
import type { ActionResult } from "@/types/author";

interface ReviewSectionProps {
  bookId: string;
  bookTitle: string;
  reviews: BookReview[];
  ratingSummary: BookRatingSummary;
  isOwned: boolean;
  isLoggedIn: boolean;
  userReview?: BookReview | null;
}

export function ReviewSection({
  bookId,
  reviews,
  ratingSummary,
  isOwned,
  isLoggedIn,
  userReview,
}: ReviewSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(userReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentText, setCommentText] = useState(userReview?.comment ?? "");

  const initialState: ActionResult = { success: false };
  const [state, formAction, isPending] = useActionState(submitBookReview, initialState);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setIsEditing(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  const activeRating = hoverRating || selectedRating;

  return (
    <div className="space-y-8 font-[family-name:var(--font-bengali)]">
      {/* ── 1. Rating Summary Header ── */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs sm:p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
          {/* Left: Overall Score */}
          <div className="flex flex-col items-center justify-center text-center md:col-span-4 md:border-r md:border-border/60 md:pr-6">
            <span className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              {ratingSummary.totalReviews > 0 ? ratingSummary.averageRating.toFixed(1) : "০.০"}
            </span>
            <div className="my-2 flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`size-5 ${
                    star <= Math.round(ratingSummary.averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {ratingSummary.totalReviews > 0
                ? `${ratingSummary.totalReviews}টি অনুমোদিত পর্যালোচনা`
                : "এখনো কোনো পর্যালোচনা নেই"}
            </p>
          </div>

          {/* Right: Star Breakdown Bars */}
          <div className="flex flex-col gap-2 md:col-span-8 md:pl-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingSummary.breakdown[stars] || 0;
              const percentage =
                ratingSummary.totalReviews > 0
                  ? Math.round((count / ratingSummary.totalReviews) * 100)
                  : 0;

              return (
                <div key={stars} className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex w-7 items-center justify-end gap-1 font-semibold text-foreground">
                    {stars} <Star className="size-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 2. User Review Submission / Status ── */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-xs">
        <h3 className="mb-4 text-lg font-bold text-foreground">
          আপনার পর্যালোচনা
        </h3>

        {!isLoggedIn ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              বইটি পড়ে থাকলে আপনার রেটিং ও মূল্যবান মতামত জানাতে সাইন ইন করুন।
            </p>
            <Link
              href={`/login`}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-foreground/85"
            >
              সাইন ইন করুন
            </Link>
          </div>
        ) : !isOwned ? (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              শুধুমাত্র বইটি সফলভাবে ক্রয়কারী পাঠকরাই পর্যালোচনা ও রেটিং জমা দিতে পারেন।
            </p>
          </div>
        ) : (
          <div>
            {/* If user already submitted a review and not currently editing */}
            {userReview && !isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    {userReview.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <Clock className="size-3.5" />
                        অনুমোদনের অপেক্ষায় (Pending Moderation)
                      </span>
                    )}
                    {userReview.status === "APPROVED" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        অনুমোদিত ও প্রকাশিত (Approved)
                      </span>
                    )}
                    {userReview.status === "REJECTED" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive">
                        <AlertCircle className="size-3.5" />
                        প্রত্যাখ্যাত (Rejected)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRating(userReview.rating);
                      setCommentText(userReview.comment);
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    <Edit3 className="size-3.5" />
                    পর্যালোচনা সম্পাদনা করুন
                  </button>
                </div>

                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-4 ${
                        star <= userReview.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xs font-bold text-foreground">
                    {userReview.rating} তারকা
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {userReview.comment}
                </p>

                {userReview.status === "PENDING" && (
                  <p className="text-xs text-muted-foreground">
                    * আপনার পর্যালোচনাটি যাচাইয়ের পর সবার জন্য প্রকাশ করা হবে।
                  </p>
                )}
              </div>
            ) : (
              /* Review submission form (New or Editing) */
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="bookId" value={bookId} />
                <input type="hidden" name="rating" value={selectedRating} />

                {/* Rating Stars Picker */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    আপনার রেটিং দিন <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} তারা`}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setSelectedRating(star)}
                        className="rounded p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <Star
                          className={`size-7 ${
                            star <= activeRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-3 text-sm font-bold text-foreground">
                      {activeRating} তারা
                    </span>
                  </div>
                  {state.fieldErrors?.rating && (
                    <p className="mt-1 text-xs text-destructive font-medium">
                      {state.fieldErrors.rating[0]}
                    </p>
                  )}
                </div>

                {/* Review Textarea */}
                <div>
                  <label htmlFor="review-comment" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    আপনার রিভিউ লিখুন <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="review-comment"
                    name="comment"
                    rows={4}
                    required
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={1000}
                    placeholder="বইটি কেমন লাগল? কী কী বিষয় ভালো লেগেছে এবং অন্যান্য পাঠকদের জন্য আপনার পরামর্শ কী?"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>ন্যূনতম ৩ অক্ষর</span>
                    <span>{commentText.length}/১০০০ অক্ষর</span>
                  </div>
                  {state.fieldErrors?.comment && (
                    <p className="mt-1 text-xs text-destructive font-medium">
                      {state.fieldErrors.comment[0]}
                    </p>
                  )}
                </div>

                {/* Feedback message */}
                {state.error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                    {state.error}
                  </div>
                )}
                {state.success && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    {state.message}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-background transition-all hover:bg-brand/90 hover:shadow-sm disabled:opacity-50"
                  >
                    {isPending ? "জমা হচ্ছে..." : userReview ? "পর্যালোচনা আপডেট করুন" : "পর্যালোচনা জমা দিন"}
                  </button>

                  {userReview && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      বাতিল করুন
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── 3. Approved Reviews List ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-lg font-bold text-foreground">
            পাঠকদের প্রকাশিত মতামত ({reviews.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            শুধুমাত্র অনুমোদিত পর্যালোচনা প্রদর্শিত হচ্ছে
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center">
            <MessageSquare className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">এখনো কোনো পর্যালোচনা প্রকাশিত হয়নি</p>
            <p className="mt-1 text-xs text-muted-foreground">
              বইটি পড়া শুরু করুন এবং প্রথম পাঠক হিসেবে আপনার মূল্যবান মতামত জানান।
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-5 shadow-2xs transition-colors hover:border-border"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                      {review.reviewerName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-foreground block">
                        {review.reviewerName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("bn-BD", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-3.5 ${
                          star <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-1 text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
