"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type AdminAuthorApplicationItem,
} from "@/lib/data/author-applications";
import {
  approveAuthorApplicationAction,
  rejectAuthorApplicationAction,
  adminRejectAuthorAction,
  adminUpdateAuthorDetailsAction,
  adminHideAuthorAction,
  adminRestoreAuthorAction,
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
  Pencil,
  EyeOff,
  RotateCcw,
  Sparkles,
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
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  APPROVED: {
    label: "অনুমোদিত ও সক্রিয়",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  HIDDEN: {
    label: "লুকানো লেখক",
    badgeClass:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    icon: EyeOff,
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
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Form states for rejection
  const [rejectionReason, setRejectionReason] = useState("");

  // Track optimistic edits; retain until server props match or a different application card is loaded
  const [editedFields, setEditedFields] = useState<Partial<AdminAuthorApplicationItem> | null>(null);

  const [prevApp, setPrevApp] = useState(application);
  if (prevApp._id !== application._id) {
    // Navigated to a completely different application card
    setPrevApp(application);
    setEditedFields(null);
  } else if (prevApp !== application) {
    setPrevApp(application);
    // If server props have caught up with local edits, clear local overlay
    if (
      editedFields &&
      application.displayName === editedFields.displayName &&
      (editedFields.phone === undefined || application.phone === editedFields.phone) &&
      (editedFields.occupation === undefined || application.occupation === editedFields.occupation) &&
      (editedFields.address === undefined || application.address === editedFields.address) &&
      (editedFields.socialUrl === undefined || application.socialUrl === editedFields.socialUrl) &&
      (editedFields.bio === undefined || application.bio === editedFields.bio)
    ) {
      setEditedFields(null);
    }
  }

  const currentDisplayName = editedFields?.displayName ?? application.displayName;
  const currentPhone = editedFields?.phone ?? application.phone ?? "";
  const currentOccupation = editedFields?.occupation ?? application.occupation ?? "";
  const currentAddress = editedFields?.address ?? application.address ?? "";
  const currentSocialUrl = editedFields?.socialUrl ?? application.socialUrl ?? "";
  const currentBio = editedFields?.bio ?? application.bio ?? "";

  // Form states for editing dialog
  const [editDisplayName, setEditDisplayName] = useState(currentDisplayName);
  const [editPhone, setEditPhone] = useState(currentPhone);
  const [editOccupation, setEditOccupation] = useState(currentOccupation);
  const [editAddress, setEditAddress] = useState(currentAddress);
  const [editSocialUrl, setEditSocialUrl] = useState(currentSocialUrl);
  const [editBio, setEditBio] = useState(currentBio);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<AdminReviewActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSelfApplication = application.userId === currentAdminId;
  const statusKey = application.isAuthorHidden
    ? "HIDDEN"
    : application.status || "PENDING";
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const isProfileIncomplete =
    !currentDisplayName?.trim() ||
    currentDisplayName.trim().length < 2 ||
    !currentBio?.trim();

  const handleApprove = () => {
    setFeedback(null);
    onActionFeedback?.(null);
    startTransition(async () => {
      const res = await approveAuthorApplicationAction(
        application.applicationId || application._id
      );
      setFeedback(res);
      onActionFeedback?.(res);
      setShowApproveDialog(false);
      if (res.success) {
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    setFeedback(null);
    onActionFeedback?.(null);
    startTransition(async () => {
      let res: AdminReviewActionResult;
      if (application.hasApplication && application.status === "PENDING") {
        const targetId = application.applicationId || application._id;
        res = await rejectAuthorApplicationAction(
          targetId,
          rejectionReason
        );
      } else {
        const targetId = application.authorId || application._id;
        res = await adminRejectAuthorAction(
          targetId,
          rejectionReason
        );
      }
      setFeedback(res);
      onActionFeedback?.(res);
      setShowRejectDialog(false);
      if (res.success) {
        router.refresh();
      }
    });
  };

  const handleHide = () => {
    setFeedback(null);
    onActionFeedback?.(null);
    startTransition(async () => {
      const targetId = application.authorId || application._id;
      const res = await adminHideAuthorAction(targetId);
      setFeedback(res);
      onActionFeedback?.(res);
      setShowHideDialog(false);
      if (res.success) {
        router.refresh();
      }
    });
  };

  const handleRestore = () => {
    setFeedback(null);
    onActionFeedback?.(null);
    startTransition(async () => {
      const targetId = application.authorId || application._id;
      const res = await adminRestoreAuthorAction(targetId);
      setFeedback(res);
      onActionFeedback?.(res);
      setShowRestoreDialog(false);
      if (res.success) {
        router.refresh();
      }
    });
  };

  const handleOpenEdit = () => {
    setEditDisplayName(currentDisplayName);
    setEditPhone(currentPhone);
    setEditOccupation(currentOccupation);
    setEditAddress(currentAddress);
    setEditSocialUrl(currentSocialUrl);
    setEditBio(currentBio);
    setEditFormError(null);
    setShowEditDialog(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError(null);

    if (!editDisplayName.trim() || editDisplayName.trim().length < 2) {
      setEditFormError("লেখক হিসেবে নাম কমপক্ষে ২ অক্ষরের হতে হবে।");
      return;
    }

    startTransition(async () => {
      const targetId =
        application.authorId || application.applicationId || application._id;
      const res = await adminUpdateAuthorDetailsAction({
        targetId,
        authorId: application.authorId || undefined,
        applicationId: application.applicationId || undefined,
        displayName: editDisplayName.trim(),
        phone: editPhone.trim(),
        occupation: editOccupation.trim(),
        address: editAddress.trim(),
        socialUrl: editSocialUrl.trim(),
        bio: editBio.trim(),
      });

      if (!res.success) {
        setEditFormError(res.error || "আপডেট ব্যর্থ হয়েছে।");
      } else {
        setEditedFields({
          displayName: editDisplayName.trim(),
          phone: editPhone.trim(),
          occupation: editOccupation.trim(),
          address: editAddress.trim(),
          socialUrl: editSocialUrl.trim(),
          bio: editBio.trim(),
        });
        setFeedback(res);
        onActionFeedback?.(res);
        setShowEditDialog(false);
        router.refresh();
      }
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
      className={`rounded-xl border bg-card p-5 shadow-xs transition-all hover:border-border sm:p-6 ${
        application.isAuthorHidden
          ? "border-rose-500/30 bg-rose-500/[0.02]"
          : "border-border/60"
      }`}
    >
      {/* Banner for Action Feedback */}
      {feedback && (
        <div
          role="status"
          id={`action-feedback-${application._id}`}
          className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium font-[family-name:var(--font-bengali)] ${
            feedback.success
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
                {currentDisplayName}
              </h2>
              {application.applicantName &&
                application.applicantName !== currentDisplayName && (
                  <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                    (অ্যাকাউন্ট: {application.applicantName})
                  </span>
                )}
              {!application.hasApplication && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300 font-[family-name:var(--font-bengali)]">
                  <Sparkles className="size-2.5" />
                  সরাসরি তৈরি / ডেমো লেখক
                </span>
              )}
              {application.isOrphaned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 font-[family-name:var(--font-bengali)]">
                  <AlertCircle className="size-2.5" />
                  ইউজার অনুপস্থিত (ম্যানুয়াল রিভিউ প্রয়োজন)
                </span>
              )}
              {isProfileIncomplete && (
                <span
                  id={`incomplete-profile-badge-${application._id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 font-[family-name:var(--font-bengali)]"
                >
                  <AlertCircle className="size-2.5" />
                  অসম্পূর্ণ প্রোফাইল
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" />
                {application.registeredEmail}
              </span>
              <span>তৈরি: {formattedDate}</span>
              {application.hiddenAt && (
                <span className="text-rose-600 dark:text-rose-400">
                  লুকানো হয়েছে:{" "}
                  {new Date(application.hiddenAt).toLocaleDateString("bn-BD")}
                </span>
              )}
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
              {currentPhone || "দেওয়া হয়নি"}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 shrink-0 text-foreground/60" />
          <span className="font-[family-name:var(--font-bengali)]">
            পেশা:{" "}
            <strong className="font-medium text-foreground">
              {currentOccupation || "দেওয়া হয়নি"}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-foreground/60" />
          <span className="truncate font-[family-name:var(--font-bengali)]">
            ঠিকানা:{" "}
            <strong className="font-medium text-foreground">
              {currentAddress || "দেওয়া হয়নি"}
            </strong>
          </span>
        </div>
      </div>

      {/* Social Links Summary */}
      {((application.socialLinks && application.socialLinks.length > 0) ||
        currentSocialUrl) && (
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
          ) : currentSocialUrl ? (
            <a
              href={currentSocialUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:border-brand/40 hover:bg-brand/5"
            >
              <span>{currentSocialUrl}</span>
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
              {currentBio || "কোনো পরিচিতি উল্লেখ নেই।"}
            </p>
          </div>

          {/* Reason if submitted application */}
          {application.hasApplication && application.reason && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]">
                আবেদন করার কারণ (Reason)
              </h3>
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-muted/15 p-3 text-sm leading-relaxed text-foreground font-[family-name:var(--font-bengali)]">
                {application.reason}
              </p>
            </div>
          )}

          {/* Full Address */}
          {currentAddress && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]">
                পূর্ণাঙ্গ ঠিকানা
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80 font-[family-name:var(--font-bengali)]">
                {currentAddress}
              </p>
            </div>
          )}

          {/* Review Details if already reviewed */}
          {(application.status === "APPROVED" ||
            application.status === "REJECTED") &&
            application.reviewedBy && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                  পর্যালোচনা তথ্য:
                </p>
                <div className="mt-2 space-y-1 font-[family-name:var(--font-bengali)]">
                  <p>
                    পর্যালোচক:{" "}
                    <span className="font-medium text-foreground">
                      {application.reviewedBy.name} ({application.reviewedBy.email})
                    </span>
                  </p>
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
        {/* Left: Toggle details button */}
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

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Universal Edit Action */}
          <Button
            id={`edit-btn-${application._id}`}
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleOpenEdit}
            className="border-border/60 hover:bg-muted font-[family-name:var(--font-bengali)]"
          >
            <Pencil className="size-3.5 mr-1" />
            সম্পাদনা
          </Button>

          {/* Action Buttons for genuine PENDING applications */}
          {application.hasApplication && application.status === "PENDING" && (
            <>
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
            </>
          )}

          {/* Action for Active Approved Authors (Hide & Reject) */}
          {application.status !== "PENDING" &&
            application.status !== "REJECTED" &&
            !application.isAuthorHidden &&
            (application.isAuthorActive || application.status === "APPROVED") && (
            <>
              {isSelfApplication ? (
                <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                  অ্যাডমিন অ্যাকাউন্ট সুরক্ষিত
                </span>
              ) : (
                <>
                  <Button
                    id={`hide-btn-${application._id}`}
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setShowHideDialog(true)}
                    className="border-rose-500/30 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 font-[family-name:var(--font-bengali)]"
                  >
                    <EyeOff className="size-3.5 mr-1" />
                    লুকান
                  </Button>

                  <Button
                    id={`reject-author-btn-${application._id}`}
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setShowRejectDialog(true)}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 font-[family-name:var(--font-bengali)]"
                  >
                    <XCircle className="size-3.5 mr-1" />
                    প্রত্যাখ্যান
                  </Button>
                </>
              )}
            </>
          )}

          {/* Action for Hidden Authors (Restore & Reject) */}
          {application.isAuthorHidden && (
            <>
              {isSelfApplication ? (
                <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                  অ্যাডমিন অ্যাকাউন্ট সুরক্ষিত
                </span>
              ) : (
                <>
                  <Button
                    id={`restore-btn-${application._id}`}
                    size="sm"
                    disabled={isPending}
                    onClick={() => setShowRestoreDialog(true)}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 font-[family-name:var(--font-bengali)]"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <RotateCcw className="size-3.5 mr-1" />
                    )}
                    পুনরুদ্ধার
                  </Button>

                  <Button
                    id={`reject-author-btn-${application._id}`}
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setShowRejectDialog(true)}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 font-[family-name:var(--font-bengali)]"
                  >
                    <XCircle className="size-3.5 mr-1" />
                    প্রত্যাখ্যান
                  </Button>
                </>
              )}
            </>
          )}

          {/* Action for Rejected Authors (Restore if author record exists / rejected author workflow) */}
          {application.status === "REJECTED" &&
            (!!application.authorId || application.isAuthorRejected) && (
            <>
              {isSelfApplication ? (
                <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                  অ্যাডমিন অ্যাকাউন্ট সুরক্ষিত
                </span>
              ) : (
                <Button
                  id={`restore-rejected-btn-${application._id}`}
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowRestoreDialog(true)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 font-[family-name:var(--font-bengali)]"
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="size-3.5 mr-1" />
                  )}
                  পুনরুদ্ধার
                </Button>
              )}
            </>
          )}
        </div>
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
              আপনি কি <strong>&quot;{currentDisplayName}&quot;</strong>-এর লেখক
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
              {application.hasApplication && application.status === "PENDING"
                ? "আবেদন প্রত্যাখ্যান নিশ্চিত করুন"
                : "লেখক প্রত্যাখ্যান নিশ্চিত করুন"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
              {application.hasApplication && application.status === "PENDING"
                ? `আপনি কি "${currentDisplayName}"-এর লেখক আবেদনটি প্রত্যাখ্যান করতে চান?`
                : `আপনি কি "${currentDisplayName}"-কে লেখক তালিকা থেকে প্রত্যাখ্যান করতে চান?`}
            </p>

            <div className="mt-3 space-y-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive font-[family-name:var(--font-bengali)]">
              <p>✓ লেখকের স্ট্যাটাস &quot;REJECTED&quot;-এ পরিবর্তিত হবে।</p>
              <p>✓ লেখক ও তার বই পাবলিক সার্চ ও লিস্টিং থেকে সাময়িকভাবে অপসারিত হবে।</p>
              <p>✓ পূর্ববর্তী ক্রেতাদের বই পড়ার অধিকার এবং সমস্ত লেনদেন অটুট থাকবে।</p>
              <p>✓ অ্যাডমিন ড্যাশবোর্ডের &quot;প্রত্যাখ্যাত&quot; তালিকা থেকে যে কোনো সময় পুনরুদ্ধার করা যাবে।</p>
            </div>

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

      {/* Hide Author Confirmation Dialog */}
      {showHideDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
              লেখক লুকানো নিশ্চিত করুন
            </h3>
            <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
              আপনি কি নিশ্চিত যে <strong>&quot;{currentDisplayName}&quot;</strong>-কে
              লেখক তালিকা থেকে লুকাতে চান?
            </p>
            <div className="mt-3 space-y-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-800 dark:text-rose-300 font-[family-name:var(--font-bengali)]">
              {!application.isOrphaned && (
                <p>✓ ব্যবহারকারীর রোল &quot;AUTHOR&quot; থেকে &quot;USER&quot;-এ পরিবর্তিত হবে।</p>
              )}
              <p>✓ লেখক ও তার সকল বই পাবলিক ডিসকভারি ও সার্চ থেকে সাময়িকভাবে অপসারিত হবে।</p>
              <p>✓ পূর্ববর্তী ক্রেতাদের বই পড়ার অধিকার এবং সকল অর্ডার/লেনদেনের তথ্য অটুট থাকবে।</p>
              <p>✓ যে কোনো সময় অ্যাডমিন ড্যাশবোর্ড থেকে লেখককে পুনরুদ্ধার করা যাবে।</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setShowHideDialog(false)}
                className="font-[family-name:var(--font-bengali)]"
              >
                বাতিল
              </Button>
              <Button
                id={`confirm-hide-btn-${application._id}`}
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleHide}
                className="font-[family-name:var(--font-bengali)]"
              >
                {isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                {application.isOrphaned ? "লুকান" : "লুকান (USER-এ পরিবর্তন)"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Author Confirmation Dialog */}
      {showRestoreDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
              লেখক পুনরুদ্ধার নিশ্চিত করুন
            </h3>
            <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
              আপনি কি <strong>&quot;{currentDisplayName}&quot;</strong>-এর লেখক
              স্ট্যাটাস পুনরুদ্ধার করতে চান?
            </p>
            <div className="mt-3 space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300 font-[family-name:var(--font-bengali)]">
              <p>✓ লেখকের স্ট্যাটাস পুনরায় সক্রিয় (ACTIVE) অবস্থায় ফিরে আসবে।</p>
              <p>✓ সংশ্লিষ্ট ব্যবহারকারী থাকলে তার ভূমিকা পুনরায় &quot;AUTHOR&quot;-এ উন্নীত হবে।</p>
              <p>✓ লেখক প্রোফাইল এবং পূর্বে প্রকাশিত বইসমূহ পুনরায় পাবলিক লিস্টিংয়ে দৃশ্যমান হবে।</p>
              <p>✓ পূর্বে ড্রাফট বা স্বাধীনভাবে লুকানো বইসমূহ অপরিবর্তিত থাকবে।</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setShowRestoreDialog(false)}
                className="font-[family-name:var(--font-bengali)]"
              >
                বাতিল
              </Button>
              <Button
                id={`confirm-restore-btn-${application._id}`}
                size="sm"
                disabled={isPending}
                onClick={handleRestore}
                className="bg-emerald-600 text-white hover:bg-emerald-700 font-[family-name:var(--font-bengali)]"
              >
                {isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                পুনরুদ্ধার সম্পন্ন করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Author Details Dialog */}
      {showEditDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                লেখকের তথ্য সম্পাদনা করুন
              </h3>
              <button
                type="button"
                onClick={() => setShowEditDialog(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {editFormError && (
              <div
                role="alert"
                className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-[family-name:var(--font-bengali)]"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              {/* Display Name */}
              <div>
                <label
                  htmlFor={`edit-name-${application._id}`}
                  className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]"
                >
                  লেখক হিসেবে নাম (Display / Pen Name) <span className="text-destructive">*</span>
                </label>
                <input
                  id={`edit-name-${application._id}`}
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                  placeholder="লেখকের নাম..."
                />
              </div>

              {/* Phone & Occupation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`edit-phone-${application._id}`}
                    className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]"
                  >
                    ফোন নম্বর
                  </label>
                  <input
                    id={`edit-phone-${application._id}`}
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                    placeholder="যেমন: +8801700000000"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`edit-occupation-${application._id}`}
                    className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]"
                  >
                    পেশা / পদবী
                  </label>
                  <input
                    id={`edit-occupation-${application._id}`}
                    type="text"
                    value={editOccupation}
                    onChange={(e) => setEditOccupation(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                    placeholder="যেমন: শিক্ষক, লেখক"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor={`edit-address-${application._id}`}
                  className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]"
                >
                  ঠিকানা
                </label>
                <input
                  id={`edit-address-${application._id}`}
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                  placeholder="শহর, দেশ..."
                />
              </div>

              {/* Social URL */}
              <div>
                <label
                  htmlFor={`edit-social-${application._id}`}
                  className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]"
                >
                  সোশ্যাল মিডিয়া প্রোফাইল লিংক
                </label>
                <input
                  id={`edit-social-${application._id}`}
                  type="url"
                  value={editSocialUrl}
                  onChange={(e) => setEditSocialUrl(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://facebook.com/... বা https://linkedin.com/in/..."
                />
              </div>

              {/* Bio */}
              <div>
                <label
                  htmlFor={`edit-bio-${application._id}`}
                  className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]"
                >
                  লেখক পরিচিতি (Bio)
                </label>
                <textarea
                  id={`edit-bio-${application._id}`}
                  rows={3}
                  maxLength={1000}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                  placeholder="লেখক পরিচিতি লিখুন..."
                />
                <span className="mt-1 block text-right text-[10px] text-muted-foreground">
                  {editBio.length}/১০০০
                </span>
              </div>

              {/* Protected Read-only Fields Information */}
              <div className="rounded-lg border border-border/40 bg-muted/30 p-2.5 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
                <p>
                  <strong>সংরক্ষিত তথ্য:</strong> ইমেইল (
                  <span className="font-mono text-foreground">{application.registeredEmail}</span>
                  ), ইউজার আইডি (
                  <span className="font-mono text-foreground">{application.userId}</span>
                  ) এবং ভূমিকা অপরিবর্তনশীল রাখা হয়েছে।
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-5 flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowEditDialog(false)}
                  className="font-[family-name:var(--font-bengali)]"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  id={`save-edit-btn-${application._id}`}
                  disabled={isPending}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 font-[family-name:var(--font-bengali)]"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  সংরক্ষণ করুন
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
