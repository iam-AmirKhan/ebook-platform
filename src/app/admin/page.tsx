import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminAuthorApplicationCounts } from "@/lib/data/author-applications";
import { getAdminBookCounts } from "@/lib/data/admin-books";
import { calculatePlatformStats } from "@/lib/services/finance";
import { getAdminReviewCounts } from "@/lib/data/admin-reviews";
import Category from "@/models/Category";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  BookOpen,
  ShoppingBag,
  FolderTree,
  MessageSquare,
} from "lucide-react";

export const metadata: Metadata = {
  title: "অ্যাডমিন ড্যাশবোর্ড | Pustoka",
  description: "Pustoka প্ল্যাটফর্মের প্রশাসনিক নিয়ন্ত্রণ কেন্দ্র।",
};

export default async function AdminDashboardPage() {
  // Server-side authorization check: throws/redirects if unauthenticated or not ADMIN
  const admin = await requireAdmin();

  // Retrieve real-time counts from MongoDB DAL
  const [counts, bookCounts, financeStats, categoryCount, reviewCounts] = await Promise.all([
    getAdminAuthorApplicationCounts(),
    getAdminBookCounts(),
    calculatePlatformStats(),
    Category.countDocuments({}),
    getAdminReviewCounts(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Shield className="size-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                  অ্যাডমিন ড্যাশবোর্ড
                </h1>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
                Pustoka প্ল্যাটফর্মের প্রশাসনিক নিয়ন্ত্রণ এবং ব্যবস্থাপনা কেন্দ্র।
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3.5 py-1.5 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              লগইনকৃত অ্যাডমিন:{" "}
              <strong className="text-foreground">{admin.name}</strong>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                পর্যালোচনাধীন
              </span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {counts.pending}
            </p>
            <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
              {counts.pending > 0 ? "অনুমোদনের অপেক্ষায়" : "কোনো অপেক্ষমাণ নেই"}
            </span>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                অনুমোদিত
              </span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {counts.approved}
            </p>
            <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
              অনুমোদিত লেখক
            </span>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                প্রত্যাখ্যাত
              </span>
              <XCircle className="size-4 text-destructive" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {counts.rejected}
            </p>
            <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
              বাতিলকৃত আবেদন
            </span>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                মোট আবেদন
              </span>
              <FileText className="size-4 text-brand" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {counts.all}
            </p>
            <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
              সর্বমোট প্রাপ্ত আবেদন
            </span>
          </div>
        </div>

        {/* Administrative Modules */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]">
            প্রশাসনিক মডিউল
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Author Applications Card */}
            <Link
              href="/admin/author-applications"
              id="admin-author-applications-card"
              className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <FileText className="size-5" />
                  </div>
                  {counts.pending > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 font-[family-name:var(--font-bengali)]">
                      <Clock className="size-3" />
                      {counts.pending}টি আবেদন বাকি
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-[family-name:var(--font-bengali)]">
                      <CheckCircle2 className="size-3" />
                      সব পর্যালোচিত
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-base font-semibold text-foreground font-[family-name:var(--font-bengali)] group-hover:text-brand">
                  লেখক আবেদন পর্যালোচনা (Author Applications)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
                  প্ল্যাটফর্মে লেখক হতে আবেদনকারীদের তথ্য ও সোশ্যাল প্রোফাইল যাচাই করুন এবং অনুমোদন বা প্রত্যাখ্যান সম্পন্ন করুন।
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-medium text-brand font-[family-name:var(--font-bengali)]">
                <span>আবেদন তালিকায় যান</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Books Management Card */}
            <Link
              href="/admin/books"
              id="admin-books-card"
              className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <BookOpen className="size-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand font-[family-name:var(--font-bengali)]">
                    মোট {bookCounts.all}টি বই
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold text-foreground font-[family-name:var(--font-bengali)] group-hover:text-brand">
                  বই ও কন্টেন্ট ব্যবস্থাপনা (Books)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
                  প্ল্যাটফর্মের সকল লেখকের প্রকাশিত, ড্রাফট ও সংরক্ষিত বই পর্যবেক্ষণ এবং তদারকি করুন।
                </p>

                {/* Live count badges */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-[family-name:var(--font-bengali)]">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    প্রকাশিত: <strong>{bookCounts.published}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    ড্রাফট: <strong>{bookCounts.draft}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                    সংরক্ষিত: <strong>{bookCounts.archived}</strong>
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-medium text-brand font-[family-name:var(--font-bengali)]">
                <span>বই পরিচালনা করুন</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Orders & Finance Card */}
            <Link
              href="/admin/finance"
              id="admin-finance-card"
              className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <ShoppingBag className="size-5" />
                  </div>
                  {financeStats.pendingOrdersCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 font-[family-name:var(--font-bengali)]">
                      <Clock className="size-3" />
                      {financeStats.pendingOrdersCount}টি যাচাই বাকি
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-[family-name:var(--font-bengali)]">
                      <CheckCircle2 className="size-3" />
                      সব যাচাইকৃত
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-base font-semibold text-foreground font-[family-name:var(--font-bengali)] group-hover:text-brand">
                  অর্ডার ও আর্থিক লেনদেন (Orders & Finance)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
                  ম্যানুয়াল bKash ও Nagad পেমেন্ট হিসাব, সেলস রিপোর্ট, কমিশন ও লেখকদের রয়্যালটি পেআউট তদারকি করুন।
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-[family-name:var(--font-bengali)]">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    মোট বিক্রয়: <strong>৳{financeStats.totalVerifiedSales.toLocaleString()}</strong>
                  </span>
                  {financeStats.pendingWithdrawalsCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      উত্তোলন বাকি: <strong>{financeStats.pendingWithdrawalsCount}টি</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-medium text-brand font-[family-name:var(--font-bengali)]">
                <span>আর্থিক ড্যাশবোর্ডে যান</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Category Management Card */}
            <Link
              href="/admin/categories"
              id="admin-categories-card"
              className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <FolderTree className="size-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand font-[family-name:var(--font-bengali)]">
                    মোট {categoryCount}টি বিভাগ
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold text-foreground font-[family-name:var(--font-bengali)] group-hover:text-brand">
                  বিভাগ পরিচালনা (Categories)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
                  প্ল্যাটফর্মের সকল বইয়ের বিভাগ তৈরি, সম্পাদনা, সক্রিয় বা নিষ্ক্রিয় করুন।
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-medium text-brand font-[family-name:var(--font-bengali)]">
                <span>বিভাগ তালিকায় যান</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Reviews Management Card */}
            <Link
              href="/admin/reviews"
              id="admin-reviews-card"
              className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <MessageSquare className="size-5" />
                  </div>
                  {reviewCounts.pending > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 font-[family-name:var(--font-bengali)]">
                      <Clock className="size-3" />
                      {reviewCounts.pending}টি যাচাই বাকি
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-[family-name:var(--font-bengali)]">
                      <CheckCircle2 className="size-3" />
                      সব পর্যালোচিত
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-base font-semibold text-foreground font-[family-name:var(--font-bengali)] group-hover:text-brand">
                  পাঠক রিভিউ ও রেটিং (Reviews)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
                  পাঠকদের জমা দেওয়া রিভিউ ও রেটিং যাচাই, সম্পাদন, অনুমোদন বা প্রত্যাখ্যান করুন।
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-[family-name:var(--font-bengali)]">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    অনুমোদিত: <strong>{reviewCounts.approved}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    অপেক্ষমাণ: <strong>{reviewCounts.pending}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                    মোট: <strong>{reviewCounts.all}</strong>
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-medium text-brand font-[family-name:var(--font-bengali)]">
                <span>রিভিউ পরিচালনা করুন</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
