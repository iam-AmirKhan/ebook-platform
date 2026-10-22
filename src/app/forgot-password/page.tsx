"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!email.trim() || !email.includes("@")) {
      setFeedback({
        type: "error",
        message: "দয়া করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", email.trim().toLowerCase());

      const res = await requestPasswordResetAction(null, formData);

      if (res.success) {
        setFeedback({
          type: "success",
          message:
            res.message ||
            "যদি এই ইমেইলটি আমাদের প্ল্যাটফর্মে নিবন্ধিত থাকে, তবে পাসওয়ার্ড রিসেট করার লিঙ্ক পাঠানো হয়েছে।",
        });
        setEmail("");
      } else {
        setFeedback({
          type: "error",
          message: res.error || "পাসওয়ার্ড রিসেট অনুরোধ ব্যর্থ হয়েছে।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "সার্ভারে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-[family-name:var(--font-bengali)]">
            পাসওয়ার্ড পুনরুদ্ধার
          </h1>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-[family-name:var(--font-bengali)] leading-relaxed">
            আপনার অ্যাকাউন্টের নিবন্ধিত ইমেইল ঠিকানা প্রদান করুন। আমরা আপনাকে একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠাব।
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 font-[family-name:var(--font-bengali)]"
            >
              নিবন্ধিত ইমেইল (Registered Email)
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="আপনার ইমেইল ঠিকানা লিখুন"
              className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-gray-700 dark:focus:ring-gray-100 font-mono"
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
                পাঠানো হচ্ছে...
              </span>
            ) : (
              "রিসেট লিঙ্ক পাঠান"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-[family-name:var(--font-bengali)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>লগইন পেজে ফিরে যান</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
