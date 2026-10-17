"use client";

import { useState, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type AdminAuthorApplicationItem,
  type AdminAuthorApplicationCounts,
} from "@/lib/data/author-applications";
import { type AdminReviewActionResult } from "@/actions/author-applications";
import { AdminApplicationCard } from "./AdminApplicationCard";
import { Search, Inbox, Filter, CheckCircle2, AlertCircle } from "lucide-react";

interface AdminApplicationsListProps {
  applications: AdminAuthorApplicationItem[];
  counts: AdminAuthorApplicationCounts;
  currentAdminId: string;
  activeFilter: string;
}

const TABS = [
  { id: "ALL", label: "সব আবেদন", countKey: "all" as const },
  { id: "PENDING", label: "পর্যালোচনাধীন", countKey: "pending" as const },
  { id: "APPROVED", label: "অনুমোদিত", countKey: "approved" as const },
  { id: "REJECTED", label: "প্রত্যাখ্যাত", countKey: "rejected" as const },
];

export function AdminApplicationsList({
  applications,
  counts,
  currentAdminId,
  activeFilter,
}: AdminApplicationsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFeedback, setActionFeedback] =
    useState<AdminReviewActionResult | null>(null);

  const handleActionFeedback = (res: AdminReviewActionResult | null) => {
    setActionFeedback(res);
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
    router.push(`${pathname}?${params.toString()}`);
  };

  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) {
      return applications;
    }
    const q = searchQuery.toLowerCase().trim();
    return applications.filter((app) => {
      return (
        app.displayName.toLowerCase().includes(q) ||
        app.applicantName.toLowerCase().includes(q) ||
        app.registeredEmail.toLowerCase().includes(q) ||
        app.phone.toLowerCase().includes(q) ||
        app.occupation.toLowerCase().includes(q)
      );
    });
  }, [applications, searchQuery]);

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

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="admin-search-applications-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..."
            className="w-full rounded-xl border border-border/60 bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
          />
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
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
              ? "কোনো অনুমোদিত আবেদন নেই"
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
              onClick={() => setSearchQuery("")}
              className="mt-4 text-xs font-medium text-brand underline-offset-4 hover:underline font-[family-name:var(--font-bengali)]"
            >
              সার্চ রিসেট করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map((app) => (
            <AdminApplicationCard
              key={app._id}
              application={app}
              currentAdminId={currentAdminId}
              onActionFeedback={handleActionFeedback}
            />
          ))}
        </div>
      )}
    </div>
  );
}
