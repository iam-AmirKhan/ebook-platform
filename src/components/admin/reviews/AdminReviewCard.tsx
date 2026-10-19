"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  BookOpen,
  User,
  ShieldCheck,
} from "lucide-react";
import type { AdminReviewItem } from "@/lib/data/admin-reviews";
import {
  approveReview,
  rejectReview,
  updateReviewByAdmin,
  deleteReviewByAdmin,
} from "@/actions/admin-reviews";

interface AdminReviewCardProps {
  review: AdminReviewItem;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "অপেক্ষমাণ",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  APPROVED: {
    label: "অনুমোদিত",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  PUBLISHED: {
    label: "অনুমোদিত",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "প্রত্যাখ্যাত",
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  HIDDEN: {
    label: "প্রত্যাখ্যাত",
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
};

export function AdminReviewCard({ review, onRefresh }: AdminReviewCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editComment, setEditComment] = useState(review.comment);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const statusInfo = STATUS_CONFIG[review.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusInfo.icon;

  const handleApprove = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await approveReview(review._id);
      if (res.success) {
        setMessage({ text: res.message || "অনুমোদিত হয়েছে।" });
        if (onRefresh) onRefresh();
      } else {
        setMessage({ text: res.error || "অনুমোদন ব্যর্থ হয়েছে।", error: true });
      }
    });
  };

  const handleReject = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await rejectReview(review._id);
      if (res.success) {
        setMessage({ text: res.message || "প্রত্যাখ্যাত হয়েছে।" });
        if (onRefresh) onRefresh();
      } else {
        setMessage({ text: res.error || "প্রত্যাখ্যান ব্যর্থ হয়েছে।", error: true });
      }
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await updateReviewByAdmin(review._id, {
        rating: editRating,
        comment: editComment,
      });
      if (res.success) {
        setMessage({ text: res.message || "হালনাগাদ সম্পন্ন।" });
        setIsEditing(false);
        if (onRefresh) onRefresh();
      } else {
        setMessage({ text: res.error || "হালনাগাদ ব্যর্থ হয়েছে।", error: true });
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই রিভিউটি মুছে ফেলতে চান?")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteReviewByAdmin(review._id);
      if (res.success) {
        setMessage({ text: "মুছে ফেলা হয়েছে।" });
        if (onRefresh) onRefresh();
      } else {
        setMessage({ text: res.error || "মুছতে ব্যর্থ হয়েছে।", error: true });
      }
    });
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs transition-colors hover:border-border font-[family-name:var(--font-bengali)]">
      {/* Header: User, Book, and Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {/* User info */}
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="size-3.5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground block">
                {review.user.name}
              </span>
              <span className="text-xs text-muted-foreground font-sans">
                {review.user.email}
              </span>
            </div>
          </div>

          <span className="text-muted-foreground/30 hidden sm:inline">•</span>

          {/* Book Link */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="size-3.5 text-brand" />
            <span>বই:</span>
            <Link
              href={`/books/${review.book.slug}`}
              target="_blank"
              className="font-semibold text-foreground hover:text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>{review.book.title}</span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badgeClass}`}
        >
          <StatusIcon className="size-3" />
          {statusInfo.label}
        </span>
      </div>

      {/* Message feedback */}
      {message && (
        <div
          className={`mt-3 rounded-lg p-2.5 text-xs font-medium ${
            message.error
              ? "border border-destructive/30 bg-destructive/10 text-destructive"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Body: Rating & Comment OR Edit Form */}
      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">রেটিং:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEditRating(star)}
                  className="rounded p-0.5 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <Star
                    className={`size-5 ${
                      star <= editRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-foreground ml-2">{editRating} তারা</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              রিভিউ মন্তব্য:
            </label>
            <textarea
              rows={3}
              required
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-brand px-3.5 py-1.5 text-xs font-semibold text-background hover:bg-brand/90 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {isPending && <Loader2 className="size-3 animate-spin" />}
              সংরক্ষণ করুন
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              বাতিল
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3.5 space-y-2">
          {/* Star display */}
          <div className="flex items-center gap-1 text-amber-500">
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
            <span className="ml-1 text-xs font-bold text-foreground">
              ({review.rating} / ৫)
            </span>
          </div>

          {/* Comment text */}
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line bg-muted/10 p-3 rounded-lg border border-border/40">
            {review.comment}
          </p>

          {/* Timestamps & Moderation audit info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
            <span>
              জমা হয়েছে:{" "}
              {new Date(review.createdAt).toLocaleDateString("bn-BD", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {review.moderatedAt && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3 text-brand" />
                  মডারেশন:{" "}
                  {new Date(review.moderatedAt).toLocaleDateString("bn-BD", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {review.moderatedByName && ` (${review.moderatedByName})`}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
        <div className="flex items-center gap-2">
          {review.status !== "APPROVED" && review.status !== "PUBLISHED" && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              অনুমোদন করুন (Approve)
            </button>
          )}

          {review.status !== "REJECTED" && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleReject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3.5" />}
              প্রত্যাখ্যান (Reject)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setEditRating(review.rating);
                setEditComment(review.comment);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Edit3 className="size-3.5 text-muted-foreground" />
              সম্পাদনা
            </button>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            aria-label="মুছে ফেলুন"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            মুছুন
          </button>
        </div>
      </div>
    </div>
  );
}
