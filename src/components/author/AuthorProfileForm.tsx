"use client";

import { useState, useRef } from "react";
import { updateAuthorProfileAction } from "@/actions/author-finance";
import {
  requestAuthorEmailChangeAction,
  cancelAuthorEmailChangeAction,
} from "@/actions/author-email";
import { Button } from "@/components/ui/button";
import type { AuthorProfileData } from "@/types/author";
import {
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Trash2,
  Mail,
  ShieldCheck,
  Loader2,
  Clock,
} from "lucide-react";

interface AuthorProfileFormProps {
  profile: AuthorProfileData;
}

export function AuthorProfileForm({ profile }: AuthorProfileFormProps) {
  // Profile form state
  const [penName, setPenName] = useState(profile.penName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [profileImage, setProfileImage] = useState(profile.profileImage ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email change state
  const [isEmailChanging, setIsEmailChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(
    profile.pendingEmail ?? null
  );

  // -------------------------------------------------------------------------
  // Handle Gallery Photo Selection
  // -------------------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedback(null);

    // Client-side validation: formats
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFeedback({
        type: "error",
        message: "শুধুমাত্র JPEG, PNG অথবা WebP ফরম্যাটের ছবি গ্রহণযোগ্য।",
      });
      return;
    }

    // Client-side validation: size (max 3MB)
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFeedback({
        type: "error",
        message: "ছবির সাইজ সর্বোচ্চ ৩ মেগাবাইট (3MB) হতে পারে।",
      });
      return;
    }

    setSelectedFile(file);
    setRemoveImage(false);

    // Create object URL for instant preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleCancelSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveExistingPhoto = () => {
    handleCancelSelectedFile();
    setProfileImage("");
    setRemoveImage(true);
  };

  // -------------------------------------------------------------------------
  // Submit Profile Changes (Pen Name, Bio, Photo)
  // -------------------------------------------------------------------------
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!penName.trim() || penName.trim().length < 2) {
      setFeedback({
        type: "error",
        message: "লেখকের নাম অবশ্যই কমপক্ষে ২ অক্ষরের হতে হবে।",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("penName", penName.trim());
      formData.set("bio", bio.trim());

      if (removeImage) {
        formData.set("removeImage", "true");
        formData.set("profileImage", "");
      } else if (selectedFile) {
        formData.set("avatarFile", selectedFile);
      } else {
        formData.set("profileImage", profileImage.trim());
      }

      const res = await updateAuthorProfileAction(null, formData);

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "প্রোফাইল সফলভাবে আপডেট করা হয়েছে!",
        });
        setSelectedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        if (removeImage) {
          setProfileImage("");
          setRemoveImage(false);
        }
      } else {
        setFeedback({
          type: "error",
          message: res.error || "প্রোফাইল আপডেট করা যায়নি।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "সার্ভারে ত্রুটি দেখা দিয়েছে। আবার চেষ্টা করুন।",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Handle Email Change Request
  // -------------------------------------------------------------------------
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);

    if (!newEmail.trim()) {
      setEmailFeedback({
        type: "error",
        message: "দয়া করে নতুন ইমেইল ঠিকানা দিন।",
      });
      return;
    }

    setEmailSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("newEmail", newEmail.trim());

      const res = await requestAuthorEmailChangeAction(null, formData);

      if (res.success) {
        setEmailFeedback({
          type: "success",
          message: res.message || "ভেরিফিকেশন লিঙ্ক পাঠানো হয়েছে!",
        });
        setPendingEmail(newEmail.trim().toLowerCase());
        setIsEmailChanging(false);
        setNewEmail("");
      } else {
        setEmailFeedback({
          type: "error",
          message: res.error || "ইমেইল পরিবর্তনের অনুরোধ সম্পন্ন করা যায়নি।",
        });
      }
    } catch {
      setEmailFeedback({
        type: "error",
        message: "সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleCancelPendingEmail = async () => {
    setEmailSubmitting(true);
    setEmailFeedback(null);
    try {
      const res = await cancelAuthorEmailChangeAction();
      if (res.success) {
        setPendingEmail(null);
        setEmailFeedback({
          type: "success",
          message: "অপেক্ষমান অনুরোধটি বাতিল করা হয়েছে।",
        });
      } else {
        setEmailFeedback({
          type: "error",
          message: res.error || "অনুরোধ বাতিল করা যায়নি।",
        });
      }
    } catch {
      setEmailFeedback({
        type: "error",
        message: "সার্ভারে ত্রুটি দেখা দিয়েছে।",
      });
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Active display photo calculation
  const displayedPhoto = previewUrl || (!removeImage && profileImage ? profileImage : null);

  return (
    <div className="space-y-8">
      {/* ── Section 1: Author Profile & Gallery Photo ── */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-2xs">
        <div className="border-b border-border/60 pb-5">
          <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
            লেখক প্রোফাইল ও পরিচিতি (Author Profile)
          </h3>
          <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            পাঠকদের কাছে প্রদর্শিত আপনার নাম, বায়ো ও প্রোফাইল ছবি আপডেট করুন।
          </p>
        </div>

        {feedback && (
          <div
            className={`mt-5 flex items-start gap-2.5 rounded-xl border p-4 text-xs font-[family-name:var(--font-bengali)] ${
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="mt-6 space-y-6">
          {/* Profile Photo: Gallery Upload & Preview */}
          <div>
            <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-2">
              প্রোফাইল ছবি (Profile Photo)
            </label>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              {/* Thumbnail Preview */}
              <div className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-full border-2 border-border/80 bg-muted shadow-xs">
                {displayedPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayedPhoto}
                    alt="প্রোফাইল প্রিভিউ"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted text-muted-foreground/60">
                    <Upload className="size-8 stroke-[1.5]" />
                  </div>
                )}
              </div>

              {/* Upload Actions */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Accessible Gallery Input */}
                  <input
                    ref={fileInputRef}
                    id="author-gallery-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="sr-only"
                    aria-label="গ্যালারি থেকে ছবি নির্বাচন করুন"
                  />
                  <label
                    htmlFor="author-gallery-file-input"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted font-[family-name:var(--font-bengali)] shadow-2xs"
                  >
                    <Upload className="size-3.5" />
                    <span>গ্যালারি থেকে ছবি নির্বাচন করুন</span>
                  </label>

                  {/* Cancel Selected File */}
                  {selectedFile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelSelectedFile}
                      className="text-xs font-[family-name:var(--font-bengali)] text-muted-foreground hover:text-foreground gap-1"
                    >
                      <X className="size-3.5" />
                      বাতিল করুন
                    </Button>
                  )}

                  {/* Remove Photo */}
                  {displayedPhoto && !selectedFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveExistingPhoto}
                      className="text-xs font-[family-name:var(--font-bengali)] text-destructive hover:bg-destructive/10 gap-1"
                    >
                      <Trash2 className="size-3.5" />
                      ছবি মুছে ফেলুন
                    </Button>
                  )}
                </div>

                {selectedFile && (
                  <p className="text-[11px] font-medium text-brand font-[family-name:var(--font-bengali)]">
                    নতুন ছবি নির্বাচন করা হয়েছে: <strong>{selectedFile.name}</strong> (সংরক্ষণে ক্লিক করুন)
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">
                  সমর্থিত ফরম্যাট: JPEG, PNG, WebP (সর্বোচ্চ সাইজ: ৩ মেগাবাইট)।
                </p>
              </div>
            </div>

            {/* Optional URL input fallback */}
            <div className="mt-3">
              <label
                htmlFor="profileImage"
                className="block text-[11px] font-medium text-muted-foreground font-[family-name:var(--font-bengali)] mb-1"
              >
                অথবা ছবির সরাসরি ওয়েব লিঙ্ক দিন (ঐচ্ছিক)
              </label>
              <input
                id="profileImage"
                type="url"
                value={profileImage}
                onChange={(e) => {
                  setProfileImage(e.target.value);
                  setRemoveImage(false);
                }}
                disabled={!!selectedFile}
                placeholder="https://example.com/avatar.jpg"
                className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2 text-xs text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-mono disabled:opacity-50"
              />
            </div>
          </div>

          {/* Pen Name */}
          <div>
            <label
              htmlFor="penName"
              className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5"
            >
              লেখকের প্রদর্শিত নাম (Pen Name) *
            </label>
            <input
              id="penName"
              type="text"
              required
              value={penName}
              onChange={(e) => setPenName(e.target.value)}
              className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)]"
            />
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5"
            >
              লেখকের পরিচিতি (Bio)
            </label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="আপনার লেখক পরিচিতি এবং সাহিত্যকর্ম সম্পর্কে সংক্ষেপে লিখুন..."
              className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)] leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-[family-name:var(--font-bengali)]"
            >
              {isSubmitting ? "সংরক্ষণ হচ্ছে..." : "প্রোফাইল সংরক্ষণ করুন"}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Section 2: Account Email Settings ── */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-2xs">
        <div className="border-b border-border/60 pb-5">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-brand" />
            <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
              অ্যাকাউন্ট ইমেইল সেটিংস (Account Email)
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            আপনার লগইন এবং নোটিফিকেশনের মূল ইমেইল ঠিকানা পরিচালনা করুন।
          </p>
        </div>

        {/* Email Feedback */}
        {emailFeedback && (
          <div
            className={`mt-5 flex items-start gap-2.5 rounded-xl border p-4 text-xs font-[family-name:var(--font-bengali)] ${
              emailFeedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {emailFeedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <span>{emailFeedback.message}</span>
          </div>
        )}

        {/* Pending Verification Notice */}
        {pendingEmail && (
          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-50/50 p-4 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 font-[family-name:var(--font-bengali)]">
            <div className="flex items-start gap-2.5">
              <Clock className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">
                  অপেক্ষমান ইমেইল যাচাইকরণ অনুরোধ:
                </p>
                <p>
                  <strong className="font-mono text-foreground">{pendingEmail}</strong> ঠিকানায় একটি ভেরিফিকেশন লিঙ্ক পাঠানো হয়েছে। উক্ত লিঙ্কে ক্লিক না করা পর্যন্ত আপনার বর্তমান সক্রিয় ইমেইল (<strong>{profile.email}</strong>) কার্যকর থাকবে।
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={emailSubmitting}
                    onClick={handleCancelPendingEmail}
                    className="text-xs border-amber-500/40 hover:bg-amber-100/50 dark:hover:bg-amber-900/40"
                  >
                    {emailSubmitting ? "বাতিল হচ্ছে..." : "অনুরোধটি বাতিল করুন"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OAuth Protection vs Editable Email */}
        <div className="mt-6 space-y-5">
          {profile.isOAuthUser ? (
            /* Google OAuth Account - Safe Warning */
            <div className="rounded-xl border border-blue-500/20 bg-blue-50/40 p-4 text-xs text-blue-900 dark:bg-blue-950/20 dark:text-blue-300 font-[family-name:var(--font-bengali)]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="size-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-semibold text-sm">
                    গুগল সাইন-ইন অ্যাকাউন্ট (Google OAuth Connected)
                  </p>
                  <p className="leading-relaxed">
                    আপনার অ্যাকাউন্টটি গুগল পরিচয়ের সাথে সরাসরি সংযুক্ত (ইমেইল: <code className="font-mono">{profile.email}</code>)। গুগল লগইন অক্ষুণ্ণ রাখতে এবং অ্যাকাউন্ট বিচ্ছিন্ন হওয়া রোধ করতে গুগল অ্যাকাউন্টের মূল ইমেইল পরিবর্তন সমর্থিত নয়।
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Credentials User - Editable Email */
            <div>
              <div className="grid gap-4 sm:grid-cols-2 items-end">
                <div>
                  <label
                    htmlFor="currentEmailDisplay"
                    className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5"
                  >
                    বর্তমান সক্রিয় ইমেইল (Active Email)
                  </label>
                  <input
                    id="currentEmailDisplay"
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full rounded-lg border border-border/50 bg-muted/40 px-3.5 py-2.5 text-sm text-foreground font-mono"
                  />
                </div>

                <div>
                  {!isEmailChanging && !pendingEmail && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEmailChanging(true);
                        setEmailFeedback(null);
                      }}
                      className="font-[family-name:var(--font-bengali)] text-xs h-10 w-full sm:w-auto"
                    >
                      ইমেইল পরিবর্তন করুন
                    </Button>
                  )}
                </div>
              </div>

              {/* Change Email Form Accordion */}
              {isEmailChanging && (
                <form
                  onSubmit={handleEmailSubmit}
                  className="mt-5 rounded-xl border border-border/80 bg-background p-4 sm:p-5 space-y-4"
                >
                  <h4 className="text-xs font-bold text-foreground font-[family-name:var(--font-bengali)]">
                    নতুন ইমেইল ঠিকানা প্রদান করুন:
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
                    নতুন ঠিকানায় একটি ভেরিফিকেশন লিঙ্ক পাঠানো হবে। লিঙ্কটিতে ক্লিক করে নিশ্চিত করার পর এটি আপনার নতুন লগইন ইমেইল হিসেবে কার্যকর হবে।
                  </p>

                  <div>
                    <input
                      id="newEmailInput"
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="নতুন ইমেইল দিন (যেমন: author@example.com)"
                      className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEmailChanging(false);
                        setNewEmail("");
                        setEmailFeedback(null);
                      }}
                      className="font-[family-name:var(--font-bengali)] text-xs"
                    >
                      বাতিল
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={emailSubmitting}
                      className="font-[family-name:var(--font-bengali)] text-xs"
                    >
                      {emailSubmitting ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="size-3.5 animate-spin" />
                          অনুরোধ পাঠানো হচ্ছে...
                        </span>
                      ) : (
                        "ভেরিফিকেশন লিঙ্ক পাঠান"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
