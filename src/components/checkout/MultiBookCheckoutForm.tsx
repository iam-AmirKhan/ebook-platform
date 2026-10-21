"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { BkashLogo, NagadLogo } from "@/components/checkout/PaymentLogos";
import type { PublicPaymentSettings } from "@/lib/data/platform-settings";
import {
  createMultiBookOrderAction,
  validateCartAction,
  type ValidatedCartBook,
} from "@/actions/payments";
import {
  Clock,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Info,
  Loader2,
  ShoppingBag,
} from "lucide-react";

interface MultiBookCheckoutFormProps {
  settings: PublicPaymentSettings;
  userEmail: string;
}

export function MultiBookCheckoutForm({
  settings,
  userEmail,
}: MultiBookCheckoutFormProps) {
  const { items, removeItem, clearCart, isLoaded } = useCart();
  const [isPending, startTransition] = useTransition();

  const hasBkash = settings.bkashEnabled;
  const hasNagad = settings.nagadEnabled;
  const defaultMethod = hasBkash ? "BKASH" : hasNagad ? "NAGAD" : null;

  const [paymentMethod, setPaymentMethod] = useState<"BKASH" | "NAGAD" | null>(defaultMethod);
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Server validation state
  const [validatedBooks, setValidatedBooks] = useState<ValidatedCartBook[]>([]);
  const [ownedBookIds, setOwnedBookIds] = useState<string[]>([]);
  const [unavailableBookIds, setUnavailableBookIds] = useState<string[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);

  // Pending submission result
  const [pendingResult, setPendingResult] = useState<{
    orderId: string;
    orderNumber: string;
    paymentMethod: string;
    amount: number;
    transactionId: string;
    message: string;
    items: { title: string; price: number }[];
  } | null>(null);

  // Run server validation for all cart items
  useEffect(() => {
    if (!isLoaded || items.length === 0) return;

    let isSubscribed = true;
    const bookIds = items.map((it) => it.bookId);

    validateCartAction(bookIds)
      .then((res) => {
        if (!isSubscribed) return;
        if (res.success) {
          setValidatedBooks(res.items);
          setOwnedBookIds(res.ownedBookIds);
          setUnavailableBookIds(res.unavailableBookIds);
          setServerTotal(res.grandTotal);
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [items, isLoaded]);

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

  // Combine items with server prices
  const displayItems = items.map((clientItem) => {
    const serverMatch = validatedBooks.find((b) => b.bookId === clientItem.bookId);
    const isOwned = ownedBookIds.includes(clientItem.bookId);
    const isUnavailable = unavailableBookIds.includes(clientItem.bookId);

    return {
      ...clientItem,
      price: serverMatch ? serverMatch.price : clientItem.price,
      isOwned,
      isUnavailable,
    };
  });

  const eligibleItems = displayItems.filter((it) => !it.isOwned && !it.isUnavailable);
  const grandTotal =
    serverTotal > 0
      ? serverTotal
      : eligibleItems.reduce((acc, it) => acc + it.price, 0);

  const hasIssues = ownedBookIds.length > 0 || unavailableBookIds.length > 0;

  const handleRemoveProblematic = () => {
    startTransition(() => {
      [...ownedBookIds, ...unavailableBookIds].forEach((id) => {
        removeItem(id);
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (eligibleItems.length === 0) {
      setErrorMessage("আপনার কার্টে কোনো উপযুক্ত বই নেই।");
      return;
    }

    if (hasIssues) {
      setErrorMessage("চেকআউট করার পূর্বে অনুগ্রহ করে ইতিমধ্যে কেনা বা অনুপলব্ধ বইগুলো কার্ট থেকে সরিয়ে নিন।");
      return;
    }

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
      formData.set("bookIdsJson", JSON.stringify(eligibleItems.map((it) => it.bookId)));
      formData.set("paymentMethod", paymentMethod);
      formData.set("senderNumber", senderNumber.trim());
      formData.set("transactionId", normalizedTxId);

      const res = await createMultiBookOrderAction(null, formData);

      if (res.success && res.orderId) {
        // Snapshot items for confirmation view
        const orderedItems = eligibleItems.map((it) => ({
          title: it.title,
          price: it.price,
        }));

        setPendingResult({
          orderId: res.orderId,
          orderNumber: res.orderNumber || res.orderId.slice(-6).toUpperCase(),
          paymentMethod: res.paymentMethod || paymentMethod,
          amount: res.amount || grandTotal,
          transactionId: res.transactionId || normalizedTxId,
          message:
            res.message ||
            "আপনার পেমেন্ট তথ্য জমা হয়েছে। আমরা Transaction ID যাচাই করছি। Admin অনুমোদন দিলে সকল বই পড়তে পারবেন। অনুগ্রহ করে অপেক্ষা করুন—আবার টাকা পাঠানোর প্রয়োজন নেই, যদি না Support থেকে বলা হয়।",
          items: orderedItems,
        });

        // Clear cart only AFTER successful order creation
        clearCart();
      } else {
        setErrorMessage(
          res.error || "অর্ডার প্রক্রিয়া সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।"
        );
      }
    } catch {
      setErrorMessage("সার্ভারে ত্রুটি দেখা দিয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENDING ORDER SUBMISSION RESULT VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (pendingResult) {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-amber-50/40 p-6 sm:p-10 dark:bg-amber-950/20 space-y-7 font-[family-name:var(--font-bengali)] shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="size-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                যাচাইাধীন (PENDING)
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground">
                #{pendingResult.orderNumber}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              পেমেন্ট তথ্য যাচাই করা হচ্ছে
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              একটিমাত্র অর্ডারে আপনার নির্বাচিত {pendingResult.items.length}টি বই সংযুক্ত হয়েছে
            </p>
          </div>
        </div>

        {/* Reassuring Confirmation Message */}
        <div className="rounded-2xl border border-amber-500/20 bg-card p-5 text-sm text-foreground/90 leading-relaxed shadow-xs">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            “{pendingResult.message}”
          </p>
        </div>

        {/* Multi-Book Order Breakdown */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3.5 text-xs">
          <div className="border-b border-border/40 pb-2">
            <span className="font-bold text-foreground block mb-2">
              অর্ডারের বইসমূহ ({pendingResult.items.length}টি):
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {pendingResult.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-muted-foreground">
                  <span className="truncate pr-2 font-medium text-foreground">
                    {idx + 1}. {it.title}
                  </span>
                  <span className="font-mono font-bold text-foreground shrink-0">
                    ৳ {it.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">সর্বমোট প্রদেয়:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              BDT {pendingResult.amount.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">পেমেন্ট মাধ্যম:</span>
            <span className="font-bold text-foreground uppercase">{pendingResult.paymentMethod}</span>
          </div>

          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">ট্রানজেকশন আইডি (TrxID):</span>
            <span className="font-mono font-bold text-brand uppercase">{pendingResult.transactionId}</span>
          </div>

          <div className="flex justify-between pt-1 text-[11px]">
            <span className="text-muted-foreground">ক্রেতার অ্যাকাউন্ট:</span>
            <span className="font-mono text-muted-foreground">{userEmail}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/account" className="flex-1">
            <Button className="w-full h-11 font-semibold">
              আমার অর্ডারের স্ট্যাটাস দেখুন
            </Button>
          </Link>
          <Link href="/books" className="flex-1">
            <Button variant="outline" className="w-full h-11 font-semibold">
              আরও বই ব্রাউজ করুন
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EMPTY CART CHECK
  // ──────────────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/80 bg-card p-12 text-center font-[family-name:var(--font-bengali)]">
        <ShoppingBag className="mx-auto size-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-bold text-foreground">আপনার কার্টে কোনো বই নেই</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          চেকআউট সম্পন্ন করার আগে অনুগ্রহ করে কার্টে বই যোগ করুন।
        </p>
        <Link href="/books" className="mt-6 inline-block">
          <Button>বইয়ের ক্যাটালগ দেখুন</Button>
        </Link>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MULTI-BOOK CHECKOUT FORM
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-8 md:grid-cols-12 font-[family-name:var(--font-bengali)]">
      {/* Left Column: Multi-Book Order Summary */}
      <div className="md:col-span-5">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h2 className="text-base font-bold text-foreground">
              অর্ডার সারসংক্ষেপ
            </h2>
            <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
              {eligibleItems.length}টি বই
            </span>
          </div>

          {/* Book Items List */}
          <div className="max-h-[360px] overflow-y-auto space-y-3.5 pr-1 divide-y divide-border/30">
            {displayItems.map((item, idx) => (
              <div key={item.bookId} className={`flex gap-3 pt-3 first:pt-0 ${item.isOwned || item.isUnavailable ? "opacity-60" : ""}`}>
                <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted">
                  {item.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground p-1 text-center">
                      {item.title}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between min-w-0 flex-1">
                  <div>
                    <h3 className="text-xs font-semibold text-foreground line-clamp-1">
                      {idx + 1}. {item.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {item.authorName}
                    </p>
                    {item.isOwned && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        ইতিমধ্যে কেনা হয়েছে
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs font-bold text-foreground mt-1">
                    {item.currency} {item.price.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Issues Alert in Summary */}
          {hasIssues && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 p-3 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200 space-y-2">
              <p>আপনার কার্টে কেনা বা অনুপলব্ধ বই রয়েছে।</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveProblematic}
                disabled={isPending}
                className="w-full h-7 text-xs border-amber-500/40"
              >
                অনুপযুক্ত বইগুলো বাদ দিন
              </Button>
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-border/40 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>মোট বই</span>
              <span className="font-mono font-bold text-foreground">{eligibleItems.length}টি</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>ডেলিভারি মাধ্যম</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">ডিজিটাল লাইব্রেরি এক্সেস</span>
            </div>
            <div className="flex justify-between border-t border-border/40 pt-2 text-base font-bold text-foreground">
              <span>সর্বমোট প্রদেয়</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                BDT {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand shrink-0" />
            <span>
              একটিমাত্র লেনদেনের মাধ্যমে সব বইয়ের পেমেন্ট সম্পন্ন হবে।
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Single Manual Payment Form */}
      <div className="md:col-span-7">
        <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              ম্যানুয়াল পেমেন্ট সম্পন্ন করুন
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              bKash অথবা Nagad এর মাধ্যমে সর্বমোট <strong>BDT {grandTotal.toLocaleString()}</strong> টাকা সেন্ড মানি করে TrxID প্রদান করুন।
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step Indicators */}
            <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-4 text-center">
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

            {/* STEP 1: Select Payment Method */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-foreground">
                  ধাপ ১: পেমেন্ট মাধ্যম বেছে নিন
                </label>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  প্রদেয় মোট: BDT {grandTotal.toLocaleString()}
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
                        <p className="text-xs font-semibold text-foreground">
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
                        <p className="text-xs font-semibold text-foreground">
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

            {/* STEP 2: Send Money Instructions */}
            {paymentMethod && (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-brand" />
                    ধাপ ২: সেন্ড মানি করার নির্দেশনা
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Send Money / পার্সোনাল
                  </span>
                </div>

                {/* Account Number with Copy Button */}
                <div>
                  <span className="block text-[11px] text-muted-foreground mb-1">
                    আমাদের {paymentMethod === "BKASH" ? "বিকাশ" : "নগদ"} নম্বর:
                  </span>
                  <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background px-4 py-3">
                    <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-foreground">
                      {activeAccountNumber || "নম্বর পাওয়া যায়নি"}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="inline-flex items-center gap-1 rounded bg-muted/80 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
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

                {/* Explicit Instructions */}
                <div className="rounded-lg bg-card border border-border/50 p-3.5 space-y-2 text-xs leading-relaxed">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ArrowRight className="size-3.5 text-brand shrink-0" />
                    আপনার {paymentMethod === "BKASH" ? "bKash" : "Nagad"} অ্যাপ ওপেন করে উপরের নম্বরে মোট{" "}
                    <strong className="text-brand font-mono font-bold">
                      BDT {grandTotal.toLocaleString()}
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
                    <span>১টি ট্রানজেকশন আইডিতেই কার্টের সমস্ত {eligibleItems.length}টি বই অনুমোদিত হবে।</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Transaction ID & Review */}
            {paymentMethod && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-foreground">
                  ধাপ ৩: লেনদেনের তথ্য ও নিশ্চিতকরণ
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="senderNumber"
                      className="block text-xs font-semibold text-foreground mb-1.5"
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
                      className="block text-xs font-semibold text-foreground mb-1.5"
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
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2 text-xs">
                  <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                    জমা দেওয়ার পূর্বে তথ্য যাচাই করুন:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                    <div className="rounded bg-background p-2 border border-border/50">
                      <span className="block text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">মাধ্যম</span>
                      <span className="font-bold text-foreground">{paymentMethod}</span>
                    </div>
                    <div className="rounded bg-background p-2 border border-border/50">
                      <span className="block text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">মোট পরিমাণ</span>
                      <span className="font-bold text-foreground">BDT {grandTotal.toLocaleString()}</span>
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
                    disabled={isSubmitting || !normalizedTxId || !senderNumber || hasIssues || eligibleItems.length === 0}
                    className="w-full h-12 text-sm font-semibold shadow-sm"
                  >
                    {isSubmitting
                      ? "পেমেন্ট তথ্য প্রক্রিয়াধীন..."
                      : `পেমেন্ট নিশ্চিত করুন ও জমা দিন (BDT ${grandTotal.toLocaleString()})`}
                  </Button>
                  <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-brand" />
                    <span>নিরাপদ যাচাইকরণ: অ্যাডমিন অনুমোদন দিলে {eligibleItems.length}টি বই {userEmail} অ্যাকাউন্টে উন্মুক্ত হবে।</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
