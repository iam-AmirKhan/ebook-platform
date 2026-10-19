"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, MessageSquare, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { AdminReviewItem, AdminReviewCounts } from "@/lib/data/admin-reviews";
import { AdminReviewCard } from "./AdminReviewCard";

interface AdminReviewsListProps {
  reviews: AdminReviewItem[];
  counts: AdminReviewCounts;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  activeStatus: string;
  initialQuery?: string;
}

export function AdminReviewsList({
  reviews,
  counts,
  totalCount,
  totalPages,
  currentPage,
  activeStatus,
  initialQuery = "",
}: AdminReviewsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchVal, setSearchVal] = useState(initialQuery);
  const [isSearching, startTransition] = useTransition();

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === "" || (key === "status" && value === "ALL")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchVal.trim() || null, page: "1" });
  };

  const TABS = [
    { id: "ALL", label: "সব রিভিউ", count: counts.all },
    { id: "PENDING", label: "অপেক্ষমাণ", count: counts.pending, alert: counts.pending > 0 },
    { id: "APPROVED", label: "অনুমোদিত", count: counts.approved },
    { id: "REJECTED", label: "প্রত্যাখ্যাত", count: counts.rejected },
  ];

  return (
    <div className="space-y-6 font-[family-name:var(--font-bengali)]">
      {/* ── Status Filter Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {TABS.map((tab) => {
          const isActive =
            activeStatus === tab.id || (!activeStatus && tab.id === "ALL");
          return (
            <button
              key={tab.id}
              onClick={() => updateFilters({ status: tab.id, page: "1" })}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-foreground text-background shadow-xs"
                  : "border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                  isActive
                    ? "bg-background/20 text-background"
                    : tab.alert
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search Bar ── */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="পাঠকের নাম, ইমেইল, বইয়ের শিরোনাম বা মন্তব্য খুঁজুন..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex items-center justify-center rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/85 disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="size-4 animate-spin" /> : "অনুসন্ধান"}
        </button>
        {searchVal && (
          <button
            type="button"
            onClick={() => {
              setSearchVal("");
              updateFilters({ q: null, page: "1" });
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            মুছুন
          </button>
        )}
      </form>

      {/* ── Review List ── */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-6 py-16 text-center">
          <MessageSquare className="size-10 text-muted-foreground/30 mb-3" />
          <h4 className="text-base font-semibold text-foreground">
            কোনো রিভিউ পাওয়া যায়নি
          </h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            নির্বাচিত ফিল্টারে এই মুহূর্তে কোনো রিভিউ নেই। ফিল্টার পরিবর্তন করে বা সার্চ ক্লিয়ার করে দেখুন।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <AdminReviewCard
              key={review._id}
              review={review}
              onRefresh={() => {
                router.refresh();
              }}
            />
          ))}
        </div>
      )}

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>
            সর্বমোট <strong>{totalCount}</strong>টির মধ্যে পৃষ্ঠা{" "}
            <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateFilters({ page: String(currentPage - 1) })}
              disabled={currentPage <= 1 || isSearching}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              পূর্ববর্তী
            </button>
            <button
              onClick={() => updateFilters({ page: String(currentPage + 1) })}
              disabled={currentPage >= totalPages || isSearching}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted disabled:opacity-40"
            >
              পরবর্তী
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
