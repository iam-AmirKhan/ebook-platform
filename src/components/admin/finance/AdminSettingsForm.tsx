"use client";

import { useState } from "react";
import { updatePlatformSettingsAction } from "@/actions/admin-finance";
import { Button } from "@/components/ui/button";
import type { AdminPlatformSettings } from "@/lib/data/platform-settings";
import { CheckCircle2, AlertCircle, Percent, Smartphone } from "lucide-react";

interface AdminSettingsFormProps {
  settings: AdminPlatformSettings;
}

export function AdminSettingsForm({ settings }: AdminSettingsFormProps) {
  const [commissionPercent, setCommissionPercent] = useState<number>(
    settings.commissionPercent
  );
  const [bkashEnabled, setBkashEnabled] = useState(settings.bkashEnabled);
  const [nagadEnabled, setNagadEnabled] = useState(settings.nagadEnabled);
  const [bkashAccountNumber, setBkashAccountNumber] = useState(
    settings.bkashAccountNumber
  );
  const [nagadAccountNumber, setNagadAccountNumber] = useState(
    settings.nagadAccountNumber
  );
  const [bkashInstructions, setBkashInstructions] = useState(
    settings.bkashInstructions
  );
  const [nagadInstructions, setNagadInstructions] = useState(
    settings.nagadInstructions
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (commissionPercent < 0 || commissionPercent > 100) {
      setFeedback({
        type: "error",
        message: "কমিশন শতকরা হার অবশ্যই ০ থেকে ১০০ এর মধ্যে হতে হবে।",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("commissionPercent", String(commissionPercent));
      formData.set("bkashEnabled", bkashEnabled ? "true" : "false");
      formData.set("nagadEnabled", nagadEnabled ? "true" : "false");
      formData.set("bkashAccountNumber", bkashAccountNumber.trim());
      formData.set("nagadAccountNumber", nagadAccountNumber.trim());
      formData.set("bkashInstructions", bkashInstructions.trim());
      formData.set("nagadInstructions", nagadInstructions.trim());

      const res = await updatePlatformSettingsAction(null, formData);

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "সেটিংস সফলভাবে সংরক্ষিত হয়েছে!",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "সেটিংস সংরক্ষণ করা যায়নি।",
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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {feedback && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-4 text-xs font-[family-name:var(--font-bengali)] ${
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

      {/* Commission Setting Card */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 text-brand">
          <Percent className="size-5" />
          <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
            প্ল্যাটফর্ম কমিশন হার (Platform Commission)
          </h3>
        </div>

        <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
          প্রতিটি সফল বই বিক্রয়ের উপর প্ল্যাটফর্ম কত শতাংশ কমিশন রাখবে তা নির্ধারণ করুন। নতুন বিক্রয়ের সময় এই হার স্ন্যাপশট হিসেবে লেজারে জমা হবে (অতীতের লেনদেন অপরিবর্তিত থাকবে)।
        </p>

        <div className="w-full sm:w-64">
          <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
            কমিশন শতকরা হার (%) *
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              required
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(Number(e.target.value))}
              className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <span className="absolute right-3.5 top-2.5 text-sm font-bold text-muted-foreground">
              %
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
            ডিফল্ট: ৩০% (লেখক পাবেন ৭০%)
          </span>
        </div>
      </div>

      {/* bKash Payment Settings */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5 text-pink-600 dark:text-pink-400">
            <Smartphone className="size-5" />
            <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
              bKash (বিকাশ) ম্যানুয়াল পেমেন্ট সেটিংস
            </h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)]">
            <input
              type="checkbox"
              checked={bkashEnabled}
              onChange={(e) => setBkashEnabled(e.target.checked)}
              className="size-4 rounded border-border text-brand focus:ring-brand"
            />
            <span>চেকআউটে বিকাশ সক্রিয় রাখুন</span>
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
              বিকাশ অ্যাকাউন্ট নম্বর (নম্বরটি ক্রেতাদের দেখানো হবে) *
            </label>
            <input
              type="text"
              value={bkashAccountNumber}
              onChange={(e) => setBkashAccountNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
              ক্রেতাদের জন্য পেমেন্ট নির্দেশনা (Instructions)
            </label>
            <textarea
              rows={3}
              value={bkashInstructions}
              onChange={(e) => setBkashInstructions(e.target.value)}
              placeholder="bKash অ্যাপ বা *247# ডায়াল করে Send Money করার নির্দেশনা..."
              className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)] leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Nagad Payment Settings */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5 text-orange-600 dark:text-orange-400">
            <Smartphone className="size-5" />
            <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
              Nagad (নগদ) ম্যানুয়াল পেমেন্ট সেটিংস
            </h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)]">
            <input
              type="checkbox"
              checked={nagadEnabled}
              onChange={(e) => setNagadEnabled(e.target.checked)}
              className="size-4 rounded border-border text-brand focus:ring-brand"
            />
            <span>চেকআউটে নগদ সক্রিয় রাখুন</span>
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
              নগদ অ্যাকাউন্ট নম্বর (নম্বরটি ক্রেতাদের দেখানো হবে) *
            </label>
            <input
              type="text"
              value={nagadAccountNumber}
              onChange={(e) => setNagadAccountNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
              ক্রেতাদের জন্য পেমেন্ট নির্দেশনা (Instructions)
            </label>
            <textarea
              rows={3}
              value={nagadInstructions}
              onChange={(e) => setNagadInstructions(e.target.value)}
              placeholder="Nagad অ্যাপ বা *167# ডায়াল করে Send Money করার নির্দেশনা..."
              className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)] leading-relaxed"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 px-8 font-[family-name:var(--font-bengali)]"
        >
          {isSubmitting ? "সংরক্ষণ হচ্ছে..." : "সেটিংস সংরক্ষণ করুন"}
        </Button>
      </div>
    </form>
  );
}
