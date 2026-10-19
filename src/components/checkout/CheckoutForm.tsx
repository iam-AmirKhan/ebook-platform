"use client";

import { useState } from "react";
import Link from "next/link";
import { createManualOrderAction } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { BkashLogo, NagadLogo } from "@/components/checkout/PaymentLogos";
import type { PublicPaymentSettings } from "@/lib/data/platform-settings";
import {
  Clock,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Info,
  RefreshCw,
} from "lucide-react";

interface CheckoutFormProps {
  book: {
    _id: string;
    title: string;
    slug: string;
    price: number;
    currency: string;
    coverImage: string | null;
  };
  settings: PublicPaymentSettings;
  userEmail: string;
  initialPendingOrder?: {
    _id: string;
    orderNumber?: string;
    paymentMethod: "BKASH" | "NAGAD" | string;
    transactionId?: string | null;
    senderNumber?: string | null;
    total: number;
    createdAt: string | Date;
  } | null;
}

export function CheckoutForm({
  book,
  settings,
  userEmail,
  initialPendingOrder,
}: CheckoutFormProps) {
  const hasBkash = settings.bkashEnabled;
  const hasNagad = settings.nagadEnabled;
  const defaultMethod = hasBkash ? "BKASH" : hasNagad ? "NAGAD" : null;

  const [paymentMethod, setPaymentMethod] = useState<"BKASH" | "NAGAD" | null>(
    (initialPendingOrder?.paymentMethod as "BKASH" | "NAGAD") || defaultMethod
  );
  const [senderNumber, setSenderNumber] = useState(initialPendingOrder?.senderNumber || "");
  const [transactionId, setTransactionId] = useState(initialPendingOrder?.transactionId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // If initialPendingOrder exists, show pending status view by default
  const [pendingStatusResult, setPendingStatusResult] = useState<{
    orderId: string;
    orderNumber: string;
    paymentMethod: string;
    amount: number;
    transactionId: string;
    message: string;
  } | null>(
    initialPendingOrder
      ? {
          orderId: String(initialPendingOrder._id),
          orderNumber:
            initialPendingOrder.orderNumber ||
            String(initialPendingOrder._id).slice(-6).toUpperCase(),
          paymentMethod: initialPendingOrder.paymentMethod,
          amount: initialPendingOrder.total,
          transactionId: initialPendingOrder.transactionId || "",
          message:
            "আপনার পেমেন্ট তথ্য জমা হয়েছে। আমরা Transaction ID যাচাই করছি। Admin অনুমোদন দিলে বইটি পড়তে পারবেন। অনুগ্রহ করে অপেক্ষা করুন—আবার টাকা পাঠানোর প্রয়োজন নেই, যদি না Support থেকে বলা হয়।",
        }
      : null
  );

  const [showEditForm, setShowEditForm] = useState(false);

  const activeAccountNumber =
    paymentMethod === "BKASH"
      ? settings.bkashAccountNumber
      : paymentMethod === "NAGAD"
      ? settings.nagadAccountNumber
      : "";

  const activeInstructions =
    paymentMethod === "BKASH"
      ? settings.bkashInstructions
      : paymentMethod === "NAGAD"
      ? settings.nagadInstructions
      : "";

  const handleCopyNumber = () => {
    if (!activeAccountNumber) return;
    navigator.clipboard.writeText(activeAccountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizedTxId = transactionId.replace(/\s+/g, "").toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!paymentMethod) {
      setErrorMessage("অনুগ্রহ করে একটি পেমেন্ট মাধ্যম নির্বাচন করুন (bKash অথবা Nagad)।");
      return;
    }

    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(senderNumber.trim())) {
      setErrorMessage("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)।");
      return;
    }

    if (!normalizedTxId || normalizedTxId.length < 4) {
      setErrorMessage("সঠিক ট্রানজেকশন আইডি (TrxID) প্রদান করুন।");
      return;
    }

    if (!/^[A-Z0-9]+$/.test(normalizedTxId)) {
      setErrorMessage("TrxID শুধুমাত্র ইংরেজি বর্ণ ও সংখ্যা হতে হবে।");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("bookId", book._id);
      formData.set("paymentMethod", paymentMethod);
      formData.set("senderNumber", senderNumber.trim());
      formData.set("transactionId", normalizedTxId);

      const res = await createManualOrderAction(null, formData);

      if (res.success && res.orderId) {
        setPendingStatusResult({
          orderId: res.orderId,
          orderNumber: res.orderNumber || res.orderId.slice(-6).toUpperCase(),
          paymentMethod: res.paymentMethod || paymentMethod,
          amount: res.amount || book.price,
          transactionId: res.transactionId || normalizedTxId,
          message:
            res.message ||
            "আপনার পেমেন্ট তথ্য জমা হয়েছে। আমরা Transaction ID যাচাই করছি। Admin অনুমোদন দিলে বইটি পড়তে পারবেন। অনুগ্রহ করে অপেক্ষা করুন—আবার টাকা পাঠানোর প্রয়োজন নেই, যদি না Support থেকে বলা হয়।",
        });
        setShowEditForm(false);
      } else {
        setErrorMessage(res.error || "অর্ডার সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
    } catch {
      setErrorMessage("সার্ভারে ত্রুটি দেখা দিয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PENDING STATUS VIEW (Post-submission or when returning to checkout)
  // ──────────────────────────────────────────────────────────────────────────
  if (pendingStatusResult && !showEditForm) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-50/40 p-6 sm:p-8 dark:bg-amber-950/20 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="size-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 font-[family-name:var(--font-bengali)]">
                যাচাইাধীন (PENDING)
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground">
                #{pendingStatusResult.orderNumber}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-bold text-foreground font-[family-name:var(--font-bengali)]">
              পেমেন্ট তথ্য যাচাই করা হচ্ছে
            </h2>
          </div>
        </div>

        {/* Calm Confirmation Message Box */}
        <div className="rounded-xl border border-amber-500/20 bg-card p-4.5 text-xs sm:text-sm text-foreground/90 font-[family-name:var(--font-bengali)] leading-relaxed shadow-xs">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            “{pendingStatusResult.message}”
          </p>
        </div>

        {/* Order Details Summary */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2.5 text-xs font-[family-name:var(--font-bengali)]">
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">বইয়ের শিরোনাম:</span>
            <span className="font-semibold text-foreground text-right">{book.title}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">প্রদেয় মূল্য:</span>
            <span className="font-mono font-bold text-foreground">
              {book.currency} {pendingStatusResult.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">পেমেন্ট মাধ্যম:</span>
            <span className="font-bold text-foreground uppercase">{pendingStatusResult.paymentMethod}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">ট্রানজেকশন আইডি (TrxID):</span>
            <span className="font-mono font-bold text-brand uppercase">{pendingStatusResult.transactionId}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">ক্রেতার অ্যাকাউন্ট:</span>
            <span className="font-mono text-muted-foreground">{userEmail}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/account" className="flex-1">
            <Button className="w-full font-[family-name:var(--font-bengali)]">
              আমার অর্ডারের স্ট্যাটাস দেখুন
            </Button>
          </Link>
          <Link href={`/books/${book.slug}`} className="flex-1">
            <Button variant="outline" className="w-full font-[family-name:var(--font-bengali)]">
              বইয়ের পাতায় ফিরে যান
            </Button>
          </Link>
        </div>

        {/* Resubmission option if user made a typo */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setShowEditForm(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand font-[family-name:var(--font-bengali)] transition-colors"
          >
            <RefreshCw className="size-3" />
            <span>ভুল তথ্য দিয়েছেন? TrxID সংশোধন বা নতুন তথ্য জমা দিন</span>
          </button>
        </div>
      </div>
    );
  }

  // If no manual payment methods are enabled by admin
  if (!hasBkash && !hasNagad) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-50/40 p-6 text-center dark:bg-amber-950/20">
        <AlertCircle className="mx-auto size-8 text-amber-600 dark:text-amber-400" />
        <h3 className="mt-3 text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
          পেমেন্ট সাময়িকভাবে অনুপলব্ধ
        </h3>
        <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          বর্তমানে কোনো ম্যানুয়াল পেমেন্ট মেথড সক্রিয় নেই। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।
        </p>
        <Link href={`/books/${book.slug}`} className="mt-4 inline-block">
          <Button variant="outline" size="sm" className="font-[family-name:var(--font-bengali)]">
            বইয়ের পাতায় ফিরে যান
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive font-[family-name:var(--font-bengali)]">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Indicators */}
      <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-4 text-center font-[family-name:var(--font-bengali)]">
        <div className={`flex flex-col items-center gap-1 ${paymentMethod ? "text-brand" : "text-muted-foreground"}`}>
          <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold">১</span>
          <span className="text-[11px] font-semibold">মাধ্যম নির্বাচন</span>
        </div>
        <div className={`flex flex-col items-center gap-1 ${paymentMethod ? "text-brand" : "text-muted-foreground"}`}>
          <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold">২</span>
          <span className="text-[11px] font-semibold">টাকা পাঠান</span>
        </div>
        <div className={`flex flex-col items-center gap-1 ${transactionId ? "text-brand" : "text-muted-foreground"}`}>
          <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold">৩</span>
          <span className="text-[11px] font-semibold">TrxID ও নিশ্চিতকরণ</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* STEP 1: Select Payment Method                             */}
      {/* ────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-foreground font-[family-name:var(--font-bengali)]">
            ধাপ ১: পেমেন্ট মাধ্যম বেছে নিন
          </label>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            প্রদেয় মোট: {book.currency} {book.price.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {hasBkash && (
            <button
              type="button"
              onClick={() => setPaymentMethod("BKASH")}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                paymentMethod === "BKASH"
                  ? "border-[#E2136E] bg-pink-50/40 dark:bg-pink-950/20 ring-2 ring-[#E2136E]"
                  : "border-border/60 bg-card hover:border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <BkashLogo className="h-7 w-auto" />
                <div>
                  <p className="text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                    বিকাশ সেন্ড মানি
                  </p>
                </div>
              </div>
              <span
                className={`size-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === "BKASH"
                    ? "border-[#E2136E] bg-[#E2136E] text-white"
                    : "border-muted-foreground/40"
                }`}
              >
                {paymentMethod === "BKASH" && <div className="size-1.5 rounded-full bg-white" />}
              </span>
            </button>
          )}

          {hasNagad && (
            <button
              type="button"
              onClick={() => setPaymentMethod("NAGAD")}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                paymentMethod === "NAGAD"
                  ? "border-[#F7931E] bg-orange-50/40 dark:bg-orange-950/20 ring-2 ring-[#F7931E]"
                  : "border-border/60 bg-card hover:border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <NagadLogo className="h-7 w-auto" />
                <div>
                  <p className="text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                    নগদ সেন্ড মানি
                  </p>
                </div>
              </div>
              <span
                className={`size-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === "NAGAD"
                    ? "border-[#F7931E] bg-[#F7931E] text-white"
                    : "border-muted-foreground/40"
                }`}
              >
                {paymentMethod === "NAGAD" && <div className="size-1.5 rounded-full bg-white" />}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* STEP 2: Send Money Instructions                           */}
      {/* ────────────────────────────────────────────────────────── */}
      {paymentMethod && (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground font-[family-name:var(--font-bengali)] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand" />
              ধাপ ২: সেন্ড মানি করার নির্দেশনা
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground font-[family-name:var(--font-bengali)]">
              Send Money / পার্সোনাল
            </span>
          </div>

          {/* Account Number with Copy Button */}
          <div>
            <span className="block text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)] mb-1">
              আমাদের {paymentMethod === "BKASH" ? "বিকাশ" : "নগদ"} নম্বর:
            </span>
            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background px-4 py-3">
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-foreground">
                {activeAccountNumber || "নম্বর পাওয়া যায়নি"}
              </span>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="inline-flex items-center gap-1 rounded bg-muted/80 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted font-[family-name:var(--font-bengali)] transition-colors"
                title="নম্বর কপি করুন"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">কপি হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>কপি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Explicit User Instructions */}
          <div className="rounded-lg bg-card border border-border/50 p-3.5 space-y-2 text-xs font-[family-name:var(--font-bengali)] leading-relaxed">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <ArrowRight className="size-3.5 text-brand shrink-0" />
              আপনার {paymentMethod === "BKASH" ? "bKash" : "Nagad"} অ্যাপ ওপেন করে উপরের নম্বরে ঠিক{" "}
              <strong className="text-brand font-mono font-bold">
                {book.currency} {book.price.toLocaleString()}
              </strong>{" "}
              টাকা সেন্ড মানি (Send Money) করুন।
            </p>
            {activeInstructions && (
              <p className="text-muted-foreground whitespace-pre-wrap pl-5 border-l-2 border-border/60">
                {activeInstructions}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <Info className="size-3.5 text-muted-foreground shrink-0" />
              <span>ম্যানুয়াল যাচাইকরণ: এটি অটোমেটিক গেটওয়ে নয়। প্রেরিত TrxID টি অ্যাডমিন যাচাই করবেন।</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* STEP 3: Submit Transaction ID & Review                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {paymentMethod && (
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-foreground font-[family-name:var(--font-bengali)]">
            ধাপ ৩: লেনদেনের তথ্য ও নিশ্চিতকরণ
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="senderNumber"
                className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5"
              >
                যে নম্বর থেকে টাকা পাঠিয়েছেন (প্রেরক নম্বর) *
              </label>
              <input
                id="senderNumber"
                type="text"
                required
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="transactionId"
                className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5"
              >
                ট্রানজেকশন আইডি (TrxID) *
              </label>
              <input
                id="transactionId"
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="যেমন: 9J8A7K2L"
                className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground uppercase placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-mono"
              />
            </div>
          </div>

          {/* Pre-Submission Review Box */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2 text-xs font-[family-name:var(--font-bengali)]">
            <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
              জমা দেওয়ার পূর্বে তথ্য যাচাই করুন:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
              <div className="rounded bg-background p-2 border border-border/50">
                <span className="block text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">মাধ্যম</span>
                <span className="font-bold text-foreground">{paymentMethod}</span>
              </div>
              <div className="rounded bg-background p-2 border border-border/50">
                <span className="block text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">পরিমাণ</span>
                <span className="font-bold text-foreground">{book.currency} {book.price.toLocaleString()}</span>
              </div>
              <div className="rounded bg-background p-2 border border-border/50">
                <span className="block text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">প্রেরক নম্বর</span>
                <span className="font-bold text-foreground truncate block">{senderNumber || "—"}</span>
              </div>
              <div className="rounded bg-background p-2 border border-border/50">
                <span className="block text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">TrxID</span>
                <span className="font-bold text-brand uppercase truncate block">{normalizedTxId || "—"}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !normalizedTxId || !senderNumber}
              className="w-full h-12 text-sm font-semibold font-[family-name:var(--font-bengali)] shadow-sm"
            >
              {isSubmitting
                ? "পেমেন্ট তথ্য প্রক্রিয়াধীন..."
                : `পেমেন্ট নিশ্চিত করুন ও জমা দিন (${book.currency} ${book.price.toLocaleString()})`}
            </Button>
            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
              <ShieldCheck className="size-3.5 text-brand" />
              <span>নিরাপদ যাচাইকরণ: অ্যাডমিন অনুমোদন দিলে বইটি {userEmail} অ্যাকাউন্টে সক্রিয় হবে।</span>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
