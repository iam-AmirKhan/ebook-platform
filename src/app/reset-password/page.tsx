"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Missing token state
  if (!token) {
    return (
      <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-[family-name:var(--font-bengali)]">
          অবৈধ অথবা অনুপস্থিত টোকেন
        </h1>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-[family-name:var(--font-bengali)] leading-relaxed">
          পাসওয়ার্ড রিসেট করার কোনো বৈধ লিঙ্ক পাওয়া যায়নি। অনুগ্রহ করে পুনরায় রিসেটের জন্য আবেদন করুন।
        </p>
        <div className="mt-6">
          <Link href="/forgot-password">
            <Button className="w-full font-[family-name:var(--font-bengali)]">
              পুনরায় রিসেট লিঙ্ক চান
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 8) {
      setFeedback({
        type: "error",
        message: "পাসওয়ার্ড অবশ্যই কমপক্ষে ৮ অক্ষরের হতে হবে।",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড একই হতে হবে।",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("newPassword", newPassword);
      formData.set("confirmPassword", confirmPassword);

      const res = await resetPasswordAction(null, formData);

      if (res.success) {
        setFeedback({
          type: "success",
          message:
            res.message ||
            "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...",
        });
        setTimeout(() => {
          router.push("/login?resetSuccess=true");
        }, 1500);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "সার্ভারে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-[family-name:var(--font-bengali)]">
          নতুন পাসওয়ার্ড নির্ধারণ
        </h1>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-[family-name:var(--font-bengali)]">
          আপনার অ্যাকাউন্টের জন্য একটি শক্তিশালী নতুন পাসওয়ার্ড তৈরি করুন।
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-5 flex items-start gap-2.5 rounded-lg border p-3.5 text-xs font-[family-name:var(--font-bengali)] leading-relaxed ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
              : "border-red-500/30 bg-red-50/60 text-red-700 dark:bg-red-950/30 dark:text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {feedback?.type === "success" ? (
        <div className="mt-4 text-center">
          <Link href="/login?resetSuccess=true">
            <Button className="w-full font-[family-name:var(--font-bengali)] gap-1.5">
              <span>সাইন ইন পেজে যান</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 font-[family-name:var(--font-bengali)]"
            >
              নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) *
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-gray-700 dark:focus:ring-gray-100"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 font-[family-name:var(--font-bengali)]"
            >
              নতুন পাসওয়ার্ড নিশ্চিত করুন *
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-gray-700 dark:focus:ring-gray-100"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-[family-name:var(--font-bengali)] font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                সংরক্ষণ হচ্ছে...
              </span>
            ) : (
              "নতুন পাসওয়ার্ড সংরক্ষণ করুন"
            )}
          </Button>

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-[family-name:var(--font-bengali)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>লগইন পেজে ফিরে যান</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 dark:bg-gray-950">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            লোড হচ্ছে...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
