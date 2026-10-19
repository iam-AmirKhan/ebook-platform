import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  getAdminReviews,
  getAdminReviewCounts,
} from "@/lib/data/admin-reviews";
import { AdminReviewsList } from "@/components/admin/reviews/AdminReviewsList";

export const metadata: Metadata = {
  title: "রিভিউ ও রেটিং ব্যবস্থাপনা | অ্যাডমিন | Pustoka",
  description: "প্ল্যাটফর্মের বইসমূহের পাঠক পর্যালোচনা ও রেটিং তদারকি ও অনুমোদন করুন।",
};

interface AdminReviewsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function AdminReviewsPage({
  searchParams,
}: AdminReviewsPageProps) {
  // 1. Server-side authorization check before fetching data
  await requireAdmin();

  // 2. Parse searchParams
  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status?.toUpperCase() || "ALL";
  const searchQuery = resolvedParams.q?.trim() || "";
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10) || 1);

  // 3. Fetch reviews and counts in parallel
  const [data, counts] = await Promise.all([
    getAdminReviews({
      status: statusFilter,
      q: searchQuery,
      page,
      limit: 15,
    }),
    getAdminReviewCounts(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground font-[family-name:var(--font-bengali)] transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            অ্যাডমিন ড্যাশবোর্ডে ফিরে যান
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <MessageSquare className="size-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                  রিভিউ ও রেটিং ব্যবস্থাপনা
                </h1>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                পাঠকদের জমা দেওয়া রিভিউ যাচাই, সম্পাদন, অনুমোদন বা প্রত্যাখ্যান করুন। শুধুমাত্র অনুমোদিত রিভিউ বইয়ের পেজে প্রদর্শিত হবে।
              </p>
            </div>
          </div>
        </div>

        {/* Reviews List & Moderation Controls */}
        <AdminReviewsList
          reviews={data.reviews}
          counts={counts}
          totalCount={data.totalCount}
          totalPages={data.totalPages}
          currentPage={data.currentPage}
          activeStatus={statusFilter}
          initialQuery={searchQuery}
        />
      </div>
    </div>
  );
}
