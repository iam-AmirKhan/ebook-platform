"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type AdminAuthorApplicationItem,
  type AdminAuthorApplicationCounts,
} from "@/lib/data/author-applications";
import { type AdminReviewActionResult } from "@/actions/author-applications";
import { AdminApplicationCard } from "./AdminApplicationCard";
import {
  Search,
  Inbox,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface AdminApplicationsListProps {
  applications: AdminAuthorApplicationItem[];
  counts: AdminAuthorApplicationCounts;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  searchQuery: string;
  currentAdminId: string;
  activeFilter: string;
}

const TABS = [
  { id: "ALL", label: "সব রেকর্ড", countKey: "all" as const },
  { id: "PENDING", label: "পর্যালোচনাধীন", countKey: "pending" as const },
  { id: "APPROVED", label: "অনুমোদিত ও সক্রিয়", countKey: "approved" as const },
  { id: "HIDDEN", label: "লুকানো লেখক", countKey: "hidden" as const },
  { id: "REJECTED", label: "প্রত্যাখ্যাত", countKey: "rejected" as const },
];

export function AdminApplicationsList({
  applications,
  counts,
  totalCount,
  totalPages,
  currentPage,
  searchQuery,
  currentAdminId,
  activeFilter,
}: AdminApplicationsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setSearchInput(searchQuery);
  }
  const [actionFeedback, setActionFeedback] =
    useState<AdminReviewActionResult | null>(null);

  const handleActionFeedback = (res: AdminReviewActionResult | null) => {
    setActionFeedback(res);
    if (res?.success) {
      router.refresh();
    }
    if (res && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleTabChange = (status: string) => {
    setActionFeedback(null);
    const params = new URLSearchParams(searchParams.toString());
    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = searchInput.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActionFeedback(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (pageNumber <= 1) {
      params.delete("page");
    } else {
      params.set("page", pageNumber.toString());
    }
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Persistent Feedback Banner */}
      {actionFeedback && (
        <div
          role="status"
          id="admin-applications-feedback-banner"
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium font-[family-name:var(--font-bengali)] ${
            actionFeedback.success
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.success ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            )}
            <span>{actionFeedback.message || actionFeedback.error}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs underline-offset-4 hover:underline"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Controls Bar: Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-1">
          {TABS.map((tab) => {
            const isActive =
              activeFilter === tab.id || (!activeFilter && tab.id === "ALL");
            const count = counts[tab.countKey];

            return (
              <button
                key={tab.id}
                id={`filter-tab-${tab.id.toLowerCase()}`}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all font-[family-name:var(--font-bengali)] ${
                  isActive
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative w-full sm:w-72"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="admin-search-applications-input"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..."
            className="w-full rounded-xl border border-border/60 bg-card py-1.5 pl-8 pr-16 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                title="মুছে ফেলুন"
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
            <button
              type="submit"
              className="rounded-lg bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand transition-colors hover:bg-brand/20 font-[family-name:var(--font-bengali)]"
            >
              খুঁজুন
            </button>
          </div>
        </form>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card px-6 py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
            {searchQuery ? <Filter className="size-6" /> : <Inbox className="size-6" />}
          </div>
          <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
            {searchQuery
              ? "খোঁজার ফলাফলে কোনো আবেদন মেলেনি"
              : activeFilter === "PENDING"
              ? "কোনো পর্যালোচনাধীন আবেদন নেই"
              : activeFilter === "APPROVED"
              ? "কোনো অনুমোদিত লেখক নেই"
              : activeFilter === "HIDDEN"
              ? "কোনো লুকানো লেখক নেই"
              : activeFilter === "REJECTED"
              ? "কোনো প্রত্যাখ্যাত আবেদন নেই"
              : "এখনো কোনো লেখক আবেদন জমা পড়েনি"}
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            {searchQuery
              ? `"${searchQuery}" এর সাথে সম্পর্কিত কোনো তথ্য পাওয়া যায়নি। অন্য শব্দ দিয়ে চেষ্টা করুন।`
              : "নতুন কোনো আবেদন জমা পড়লে তা এই তালিকায় প্রদর্শিত হবে।"}
          </p>
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="mt-4 text-xs font-medium text-brand underline-offset-4 hover:underline font-[family-name:var(--font-bengali)]"
            >
              সার্চ রিসেট করুন
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {applications.map((app) => (
              <AdminApplicationCard
                key={app._id}
                application={app}
                currentAdminId={currentAdminId}
                onActionFeedback={handleActionFeedback}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
              <div className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                মোট <strong className="text-foreground">{totalCount}</strong>টি আবেদনের মধ্যে পৃষ্ঠা{" "}
                <strong className="text-foreground">{currentPage}</strong> /{" "}
                <strong className="text-foreground">{totalPages}</strong>
              </div>

              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={createPageUrl(currentPage - 1)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border/60 bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 font-[family-name:var(--font-bengali)]"
                  >
                    <ChevronLeft className="mr-1 size-3.5" />
                    পূর্ববর্তী
                  </Link>
                ) : (
                  <button
                    disabled
                    className="inline-flex h-8 cursor-not-allowed items-center justify-center rounded-lg border border-border/40 bg-muted/40 px-3 text-xs font-medium text-muted-foreground opacity-50 font-[family-name:var(--font-bengali)]"
                  >
                    <ChevronLeft className="mr-1 size-3.5" />
                    পূর্ববর্তী
                  </button>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={createPageUrl(currentPage + 1)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border/60 bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 font-[family-name:var(--font-bengali)]"
                  >
                    পরবর্তী
                    <ChevronRight className="ml-1 size-3.5" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="inline-flex h-8 cursor-not-allowed items-center justify-center rounded-lg border border-border/40 bg-muted/40 px-3 text-xs font-medium text-muted-foreground opacity-50 font-[family-name:var(--font-bengali)]"
                  >
                    পরবর্তী
                    <ChevronRight className="ml-1 size-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
