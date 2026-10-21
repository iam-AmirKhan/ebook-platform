"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { validateCartAction, type ValidatedCartBook } from "@/actions/payments";

interface CartViewProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

export function CartView({ user }: CartViewProps) {
  const router = useRouter();
  const { items, removeItem, clearCart, isLoaded } = useCart();
  const [isPending, startTransition] = useTransition();

  const [validatedBooks, setValidatedBooks] = useState<ValidatedCartBook[]>([]);
  const [ownedBookIds, setOwnedBookIds] = useState<string[]>([]);
  const [unavailableBookIds, setUnavailableBookIds] = useState<string[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);

  // Validate cart items against the database whenever items change
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
      .catch(() => {
        // Fallback to client calculations if network error
      });

    return () => {
      isSubscribed = false;
    };
  }, [items, isLoaded, user?.id]);

  const currentBooks = items.length === 0 ? [] : validatedBooks;
  const currentOwned = items.length === 0 ? [] : ownedBookIds;
  const currentUnavailable = items.length === 0 ? [] : unavailableBookIds;

  // Merge client cart items with server validated details
  const displayItems = items.map((clientItem) => {
    const serverMatch = currentBooks.find((b) => b.bookId === clientItem.bookId);
    const isOwned = currentOwned.includes(clientItem.bookId);
    const isUnavailable = currentUnavailable.includes(clientItem.bookId);

    return {
      ...clientItem,
      price: serverMatch ? serverMatch.price : clientItem.price,
      originalPrice: serverMatch ? serverMatch.originalPrice : clientItem.originalPrice,
      isOwned,
      isUnavailable,
    };
  });

  const eligibleItems = displayItems.filter((it) => !it.isOwned && !it.isUnavailable);
  const calculatedTotal =
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

  const handleCheckoutClick = () => {
    if (!user) {
      router.push("/login?next=/checkout/cart");
    } else {
      router.push("/checkout/cart");
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
  // EMPTY CART STATE
  // ──────────────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 px-6 py-20 text-center shadow-xs">
          <div className="flex size-20 items-center justify-center rounded-full bg-brand/10 text-brand mb-6">
            <ShoppingBag className="size-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            আপনার শপিং কার্ট খালি
          </h1>
          <p className="mt-2.5 max-w-md text-sm text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
            আপনার পছন্দের বইগুলো কার্টে যোগ করে একসাথে একটিমাত্র বিকাশ বা নগদ পেমেন্টে সংগ্রহ করতে পারবেন।
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/books">
              <Button className="h-11 px-6 font-semibold font-[family-name:var(--font-bengali)]">
                <BookOpen className="mr-2 size-4" />
                বইয়ের ক্যাটালগ দেখুন
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="h-11 px-6 font-[family-name:var(--font-bengali)]">
                হোমে ফিরে যান
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CART WITH ITEMS
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 font-[family-name:var(--font-bengali)]">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            শপিং কার্ট
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            নির্বাচিত মোট {items.length}টি বই — একটিমাত্র পেমেন্টে সব বই আপনার সংগ্রহে যুক্ত হবে
          </p>
        </div>
        <button
          type="button"
          onClick={() => clearCart()}
          className="w-fit text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="size-3.5" />
          <span>সম্পূর্ণ কার্ট খালি করুন</span>
        </button>
      </div>

      {/* Warning Alert if any items are already owned or unavailable */}
      {hasIssues && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-50/50 p-4 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">কার্টের কিছু বইয়ের ক্ষেত্রে আপডেট প্রয়োজন:</p>
              <p className="mt-0.5 opacity-90">
                {ownedBookIds.length > 0 &&
                  `আপনি ইতিমধ্যে ${ownedBookIds.length}টি বই কিনেছেন। `}
                {unavailableBookIds.length > 0 &&
                  `${unavailableBookIds.length}টি বই বর্তমানে বিক্রয়ের জন্য অনুপলব্ধ।`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRemoveProblematic}
            disabled={isPending}
            className="shrink-0 h-8 text-xs border-amber-500/40 bg-background hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            অনুপযুক্ত বইগুলো বাদ দিন
          </Button>
        </div>
      )}

      {/* Main Grid: Left Items List, Right Order Summary */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden shadow-2xs">
            {displayItems.map((item) => {
              const hasDiscount =
                item.originalPrice && item.originalPrice > item.price;

              return (
                <div
                  key={item.bookId}
                  className={`p-4 sm:p-5 flex gap-4 items-center justify-between transition-colors ${
                    item.isOwned || item.isUnavailable
                      ? "bg-destructive/5 dark:bg-destructive/10"
                      : "hover:bg-muted/10"
                  }`}
                >
                  <div className="flex gap-4 items-center min-w-0">
                    {/* Cover Thumbnail */}
                    <Link
                      href={`/books/${item.slug}`}
                      className="relative aspect-[3/4] w-16 sm:w-20 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted block"
                    >
                      {item.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground p-1 text-center">
                          {item.title}
                        </div>
                      )}
                    </Link>

                    {/* Book Metadata */}
                    <div className="min-w-0 flex flex-col justify-center">
                      <Link
                        href={`/books/${item.slug}`}
                        className="font-bold text-sm sm:text-base text-foreground hover:text-brand transition-colors line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        লেখক: {item.authorName}
                      </p>

                      {/* Status Badges */}
                      {item.isOwned && (
                        <span className="mt-1.5 inline-flex items-center gap-1 w-fit rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <CheckIcon /> ইতিমধ্যে আপনার লাইব্রেরিতে রয়েছে
                        </span>
                      )}
                      {item.isUnavailable && (
                        <span className="mt-1.5 inline-flex items-center gap-1 w-fit rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive border border-destructive/20">
                          বিক্রয়ের জন্য অনুপলব্ধ
                        </span>
                      )}

                      {/* Price on mobile */}
                      <div className="mt-2 sm:hidden flex items-baseline gap-2">
                        <span className="text-sm font-bold text-foreground font-mono">
                          {item.currency} {item.price.toLocaleString()}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-muted-foreground line-through font-mono">
                            {item.currency} {item.originalPrice?.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Remove Button (Desktop) */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-base font-bold text-foreground font-mono">
                        {item.currency} {item.price.toLocaleString()}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through font-mono">
                          {item.currency} {item.originalPrice?.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.bookId)}
                      aria-label={`কার্ট থেকে মুছুন: ${item.title}`}
                      title="কার্ট থেকে সরিয়ে নিন"
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link
              href="/books"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>আরও বই ব্রাউজ করুন</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground border-b border-border/40 pb-3">
              অর্ডার সারসংক্ষেপ
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>নির্বাচিত বৈধ বই</span>
                <span className="font-mono font-semibold text-foreground">
                  {eligibleItems.length}টি
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>সাবটোটাল</span>
                <span className="font-mono text-foreground">
                  BDT {calculatedTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>ডেলিভারি মাধ্যম</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ডিজিটাল লাইব্রেরি (বিনামূল্যে)
                </span>
              </div>

              <div className="border-t border-border/40 pt-3 flex justify-between items-baseline text-base font-bold text-foreground">
                <span>সর্বমোট প্রদেয়</span>
                <span className="text-lg font-mono text-emerald-600 dark:text-emerald-400">
                  BDT {calculatedTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <div className="pt-2">
              <Button
                onClick={handleCheckoutClick}
                disabled={eligibleItems.length === 0}
                className="w-full h-12 text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                <span>
                  {user ? "চেকআউট সম্পন্ন করুন" : "লগইন করে চেকআউট করুন"}
                </span>
                <ArrowRight className="size-4" />
              </Button>

              {!user && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  চেকআউটের পূর্বে অ্যাকাউন্টে লগইন করতে হবে। আপনার কার্ট সংরক্ষিত থাকবে।
                </p>
              )}
            </div>

            {/* Reassuring Single Payment Badges */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 space-y-2 text-[11px] text-muted-foreground">
              <div className="flex items-start gap-2">
                <ShieldCheck className="size-4 text-brand shrink-0 mt-0.5" />
                <span>
                  <strong>১টি অর্ডার, ১টি পেমেন্ট:</strong> কার্টের সব বইয়ের জন্য একটিমাত্র বিকাশ বা নগদ TrxID জমা দেবেন।
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>এক ক্লিকে অনুমোদন:</strong> অ্যাডমিন পেমেন্ট যাচাইয়ের সাথে সাথে সব বই একযোগে আপনার লাইব্রেরিতে উন্মুক্ত হবে।
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-amber-600 dark:text-amber-400"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
