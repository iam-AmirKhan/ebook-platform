"use client";

import { useState } from "react";
import { updateAuthorProfileAction } from "@/actions/author-finance";
import { Button } from "@/components/ui/button";
import type { AuthorProfileData } from "@/types/author";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AuthorProfileFormProps {
  profile: AuthorProfileData;
}

export function AuthorProfileForm({ profile }: AuthorProfileFormProps) {
  const [penName, setPenName] = useState(profile.penName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [profileImage, setProfileImage] = useState(profile.profileImage ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
      formData.set("profileImage", profileImage.trim());

      const res = await updateAuthorProfileAction(null, formData);

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "প্রোফাইল সফলভাবে আপডেট করা হয়েছে!",
        });
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

  return (
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

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
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

          <div>
            <label
              htmlFor="registeredEmail"
              className="block text-xs font-semibold text-muted-foreground font-[family-name:var(--font-bengali)] mb-1.5"
            >
              নিবন্ধিত ইমেইল (পরিবর্তনযোগ্য নয়)
            </label>
            <input
              id="registeredEmail"
              type="email"
              disabled
              value={profile.email}
              className="w-full rounded-lg border border-border/40 bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground cursor-not-allowed font-mono"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="profileImage"
            className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5"
          >
            প্রোফাইল ছবির লিঙ্ক (Image URL)
          </label>
          <input
            id="profileImage"
            type="url"
            value={profileImage}
            onChange={(e) => setProfileImage(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-mono"
          />
          <span className="text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">
            একটি সর্বজনীন ছবির সরাসরি ওয়েব লিঙ্ক দিন (ঐচ্ছিক)।
          </span>
        </div>

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
  );
}
