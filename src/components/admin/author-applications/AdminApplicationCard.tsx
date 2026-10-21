"use client";

import { useState, useTransition } from "react";
import {
  type AdminAuthorApplicationItem,
} from "@/lib/data/author-applications";
import {
  approveAuthorApplicationAction,
  rejectAuthorApplicationAction,
  type AdminReviewActionResult,
} from "@/actions/author-applications";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  User,
  ShieldAlert,
  Loader2,
} from "lucide-react";

interface AdminApplicationCardProps {
  application: AdminAuthorApplicationItem;
  currentAdminId: string;
  onActionFeedback?: (feedback: AdminReviewActionResult | null) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "পর্যালোচনাধীন",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  APPROVED: {
    label: "অনুমোদিত",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "প্রত্যাখ্যাত",
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
};

export function AdminApplicationCard({
  application,
  currentAdminId,
  onActionFeedback,
}: AdminApplicationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedback, setFeedback] = useState<AdminReviewActionResult | null>(null);

  const [isPending, startTransition] = useTransition();

  const isSelfApplication = application.userId === currentAdminId;
  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const handleApprove = () => {
    setFeedback(null);
    onActionFeedback?.(null);
    startTransition(async () => {
      const res = await approveAuthorApplicationAction(application._id);
      setFeedback(res);
      onActionFeedback?.(res);
      setShowApproveDialog(false);
    });
  };

  const handleReject = () => {
    setFeedback(null);
    onActionFeedback?.(null);
    startTransition(async () => {
      const res = await rejectAuthorApplicationAction(
        application._id,
        rejectionReason
      );
      setFeedback(res);
      onActionFeedback?.(res);
      setShowRejectDialog(false);
    });
  };

  const formattedDate = new Date(application.createdAt).toLocaleDateString(
    "bn-BD",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div
      id={`application-card-${application._id}`}
      className="rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-border sm:p-6"
    >
      {/* Top Banner for Action Feedback (fallback when standalone) */}
      {feedback && !onActionFeedback && (
        <div
          role="status"
          className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium font-[family-name:var(--font-bengali)] ${
            feedback.success
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            )}
            <span>{feedback.message || feedback.error}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline-offset-4 hover:underline"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Card Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          {/* Avatar */}
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {application.applicantImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={application.applicantImage}
                alt={application.applicantName}
                className="size-11 rounded-full object-cover"
              />
            ) : (
              <User className="size-6 text-foreground/50" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                {application.displayName}
              </h2>
              {application.applicantName &&
                application.applicantName !== application.displayName && (
                  <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                    (অ্যাকাউন্ট: {application.applicantName})
                  </span>
                )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" />
                {application.registeredEmail}
              </span>
              <span>জমা: {formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 sm:self-start">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold font-[family-name:var(--font-bengali)] ${statusConfig.badgeClass}`}
          >
            <StatusIcon className="size-3.5" />
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="mt-4 grid gap-3 rounded-lg border border-border/40 bg-muted/20 p-3.5 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-foreground/60" />
          <span className="font-[family-name:var(--font-bengali)]">
            ফোন:{" "}
            <strong className="font-medium text-foreground">
              {application.phone || "দেওয়া হয়নি"}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 shrink-0 text-foreground/60" />
          <span className="font-[family-name:var(--font-bengali)]">
            পেশা:{" "}
            <strong className="font-medium text-foreground">
              {application.occupation || "দেওয়া হয়নি"}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-foreground/60" />
          <span className="truncate font-[family-name:var(--font-bengali)]">
            ঠিকানা:{" "}
            <strong className="font-medium text-foreground">
              {application.address || "দেওয়া হয়নি"}
            </strong>
          </span>
        </div>
      </div>

      {/* Social Links Summary */}
      {((application.socialLinks && application.socialLinks.length > 0) || application.socialUrl) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-foreground/70 font-[family-name:var(--font-bengali)]">
            সোশ্যাল লিংক:
          </span>
          {application.socialLinks && application.socialLinks.length > 0 ? (
            application.socialLinks.map((link, idx) => (
              <a
                key={`${link.platform}-${link.url}-${idx}`}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:border-brand/40 hover:bg-brand/5"
              >
                <span>{link.platform || link.url}</span>
                <ExternalLink className="size-3" />
              </a>
            ))
          ) : application.socialUrl ? (
            <a
              href={application.socialUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:border-brand/40 hover:bg-brand/5"
            >
              <span>{application.socialUrl}</span>
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      )}

      {/* Expandable Section */}
      {isExpanded && (
        <div className="mt-5 space-y-4 border-t border-border/50 pt-4 text-sm">
          {/* Bio */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]">
              লেখক পরিচিতি (Bio)
            </h3>
            <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-muted/15 p-3 text-sm leading-relaxed text-foreground font-[family-name:var(--font-bengali)]">
              {application.bio}
            </p>
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]">
              আবেদন করার কারণ (Reason)
            </h3>
            <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-muted/15 p-3 text-sm leading-relaxed text-foreground font-[family-name:var(--font-bengali)]">
              {application.reason}
            </p>
          </div>

          {/* Full Address */}
          {application.address && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]">
                পূর্ণাঙ্গ ঠিকানা
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80 font-[family-name:var(--font-bengali)]">
                {application.address}
              </p>
            </div>
          )}

          {/* Review Details if already reviewed */}
          {(application.status === "APPROVED" ||
            application.status === "REJECTED") && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                পর্যালোচনা তথ্য:
              </p>
              <div className="mt-2 space-y-1 font-[family-name:var(--font-bengali)]">
                {application.reviewedBy && (
                  <p>
                    পর্যালোচক:{" "}
                    <span className="font-medium text-foreground">
                      {application.reviewedBy.name} ({application.reviewedBy.email})
                    </span>
                  </p>
                )}
                {application.reviewedAt && (
                  <p>
                    তারিখ:{" "}
                    <span className="font-medium text-foreground">
                      {new Date(application.reviewedAt).toLocaleDateString(
                        "bn-BD",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </p>
                )}
                {application.rejectionReason && (
                  <div className="mt-2 rounded border border-destructive/20 bg-destructive/5 p-2.5 text-destructive">
                    <p className="font-semibold">প্রত্যাখ্যানের কারণ:</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {application.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Actions Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
        {/* Toggle details button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground font-[family-name:var(--font-bengali)]"
        >
          {isExpanded ? (
            <>
              সংক্ষিপ্ত করুন <ChevronUp className="size-3.5 ml-1" />
            </>
          ) : (
            <>
              পূর্ণাঙ্গ বিবরণ দেখুন <ChevronDown className="size-3.5 ml-1" />
            </>
          )}
        </Button>

        {/* Action Buttons for PENDING */}
        {application.status === "PENDING" && (
          <div className="flex items-center gap-2">
            {isSelfApplication ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 font-[family-name:var(--font-bengali)]">
                <ShieldAlert className="size-4" />
                নিজের আবেদন পর্যালোচনা নিষিদ্ধ
              </span>
            ) : (
              <>
                <Button
                  id={`reject-btn-${application._id}`}
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowRejectDialog(true)}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 font-[family-name:var(--font-bengali)]"
                >
                  <XCircle className="size-3.5 mr-1" />
                  প্রত্যাখ্যান
                </Button>

                <Button
                  id={`approve-btn-${application._id}`}
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowApproveDialog(true)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 font-[family-name:var(--font-bengali)]"
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="size-3.5 mr-1" />
                  )}
                  অনুমোদন
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Approve Confirmation Dialog */}
      {showApproveDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
              আবেদন অনুমোদন নিশ্চিত করুন
            </h3>
            <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
              আপনি কি <strong>&quot;{application.displayName}&quot;</strong>-এর লেখক
              আবেদনটি অনুমোদন করতে চান?
            </p>
            <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300 font-[family-name:var(--font-bengali)]">
              ✓ আবেদনকারীর ভূমিকা &quot;AUTHOR&quot;-এ উন্নীত হবে।
              <br />
              ✓ সিস্টেম স্বয়ংক্রিয়ভাবে লেখক প্রোফাইল তৈরি করবে।
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setShowApproveDialog(false)}
                className="font-[family-name:var(--font-bengali)]"
              >
                বাতিল
              </Button>
              <Button
                id={`confirm-approve-btn-${application._id}`}
                size="sm"
                disabled={isPending}
                onClick={handleApprove}
                className="bg-emerald-600 text-white hover:bg-emerald-700 font-[family-name:var(--font-bengali)]"
              >
                {isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                হ্যাঁ, অনুমোদন করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog with Reason */}
      {showRejectDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
              আবেদন প্রত্যাখ্যান নিশ্চিত করুন
            </h3>
            <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
              আপনি কি <strong>&quot;{application.displayName}&quot;</strong>-এর লেখক
              আবেদনটি প্রত্যাখ্যান করতে চান?
            </p>

            <div className="mt-4">
              <label
                htmlFor={`rejection-reason-${application._id}`}
                className="block text-xs font-medium text-foreground mb-1.5 font-[family-name:var(--font-bengali)]"
              >
                প্রত্যাখ্যানের কারণ (ঐচ্ছিক):
              </label>
              <textarea
                id={`rejection-reason-${application._id}`}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="প্রত্যাখ্যানের কারণ লিখুন..."
                maxLength={1000}
                rows={3}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
              />
              <span className="mt-1 block text-right text-[10px] text-muted-foreground">
                {rejectionReason.length}/১০০০
              </span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setShowRejectDialog(false)}
                className="font-[family-name:var(--font-bengali)]"
              >
                বাতিল
              </Button>
              <Button
                id={`confirm-reject-btn-${application._id}`}
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleReject}
                className="font-[family-name:var(--font-bengali)]"
              >
                {isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                প্রত্যাখ্যান করুন
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
