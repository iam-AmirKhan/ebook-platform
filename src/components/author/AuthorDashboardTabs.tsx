"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { AuthorFinancialCards } from "./AuthorFinancialCards";
import { AuthorBookSalesTable } from "./AuthorBookSalesTable";
import { AuthorWithdrawalSection } from "./AuthorWithdrawalSection";
import { AuthorProfileForm } from "./AuthorProfileForm";
import { AuthorBookCard } from "./AuthorBookCard";
import type {
  AuthorBookListItem,
  AuthorBookSaleItem,
  AuthorFinancialSummary,
  AuthorProfileData,
  AuthorWithdrawalItem,
} from "@/types/author";
import {
  LayoutDashboard,
  Wallet,
  BookOpen,
  User,
  Plus,
} from "lucide-react";

interface AuthorDashboardTabsProps {
  summary: AuthorFinancialSummary;
  bookSales: AuthorBookSaleItem[];
  withdrawals: AuthorWithdrawalItem[];
  profile: AuthorProfileData;
  books: AuthorBookListItem[];
  initialTab?: string;
}

export function AuthorDashboardTabs({
  summary,
  bookSales,
  withdrawals,
  profile,
  books,
  initialTab = "overview",
}: AuthorDashboardTabsProps) {
  const searchParams = useSearchParams();
  const isSubmittedParam = searchParams.get("submitted") === "1";
  const [activeTab, setActiveTab] = useState(
    isSubmittedParam || searchParams.get("tab") === "books" ? "books" : initialTab
  );
  const toastFiredRef = useRef(false);

  useEffect(() => {
    if (isSubmittedParam && !toastFiredRef.current) {
      toastFiredRef.current = true;
      toast.success("বইটি সফলভাবে রিভিউয়ের জন্য জমা দেওয়া হয়েছে");
    }
  }, [isSubmittedParam]);

  const tabs = [
    { id: "overview", label: "আর্থিক ওভারভিউ", icon: LayoutDashboard },
    { id: "withdrawals", label: "অর্থ উত্তোলন", icon: Wallet, badge: summary.availableBalance >= 100 ? `৳${summary.availableBalance}` : undefined },
    { id: "books", label: "আমার বইসমূহ", icon: BookOpen, count: books.length },
    { id: "profile", label: "প্রোফাইল সেটিংস", icon: User },
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="border-b border-border/60">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap font-[family-name:var(--font-bengali)] ${
                  isActive
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Financial Overview */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <AuthorFinancialCards summary={summary} />
          <AuthorBookSalesTable sales={bookSales} />
        </div>
      )}

      {/* Tab 2: Withdrawals */}
      {activeTab === "withdrawals" && (
        <AuthorWithdrawalSection
          summary={summary}
          withdrawals={withdrawals}
        />
      )}

      {/* Tab 3: Books Management */}
      {activeTab === "books" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground font-[family-name:var(--font-bengali)]">
                প্রকাশিত ও ড্রাফট বইসমূহ
              </h2>
              <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                আপনার তৈরি করা বই সম্পাদনা করুন অথবা নতুন বই প্রকাশ করুন।
              </p>
            </div>
            <Link href="/author/books/new">
              <Button className="font-[family-name:var(--font-bengali)] gap-1.5">
                <Plus className="size-4" />
                নতুন বই লিখুন
              </Button>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card text-center">
            {[
              { label: "মোট বই", count: books.length },
              {
                label: "প্রকাশিত",
                count: books.filter((b) => b.status === "PUBLISHED").length,
              },
              {
                label: "রিভিউ অপেক্ষমাণ",
                count: books.filter((b) => b.status === "PENDING_REVIEW").length,
              },
              {
                label: "ড্রাফট",
                count: books.filter((b) => b.status === "DRAFT").length,
              },
            ].map(({ label, count }) => (
              <div key={label} className="px-4 py-3">
                <p className="text-lg font-bold text-foreground font-mono">{count}</p>
                <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {books.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card px-6 py-16 text-center">
              <BookOpen className="mb-4 size-10 text-muted-foreground/30" />
              <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                এখনো কোনো বই তৈরি করা হয়নি
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
                আপনার প্রথম বইটি তৈরি করুন এবং পাঠকদের কাছে পৌঁছে দিন।
              </p>
              <Link href="/author/books/new" className="mt-6">
                <Button className="font-[family-name:var(--font-bengali)]">
                  + নতুন বই লিখুন
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {books.map((book) => (
                <AuthorBookCard key={book._id} book={book} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Profile */}
      {activeTab === "profile" && <AuthorProfileForm profile={profile} />}
    </div>
  );
}
