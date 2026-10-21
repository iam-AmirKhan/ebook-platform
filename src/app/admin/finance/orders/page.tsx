import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminOrders } from "@/lib/data/admin-finance";
import { getPlatformSettings } from "@/lib/data/platform-settings";
import { AdminFinanceNav } from "@/components/admin/finance/AdminFinanceNav";
import { AdminOrdersList } from "@/components/admin/finance/AdminOrdersList";

export const metadata: Metadata = {
  title: "অর্ডার ও পেমেন্ট যাচাই | অ্যাডমিন | Pustoka",
  description: "ম্যানুয়াল bKash ও Nagad পেমেন্ট অর্ডার যাচাই ও অনুমোদন কেন্দ্র।",
};

interface AdminOrdersPageProps {
  searchParams?: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  await requireAdmin();

  const resolvedParams = searchParams ? await searchParams : undefined;
  const page = resolvedParams?.page ? parseInt(resolvedParams.page, 10) : 1;
  const status = resolvedParams?.status;
  const q = resolvedParams?.q;

  const [orderResult, settings] = await Promise.all([
    getAdminOrders({
      status,
      q,
      page,
      limit: 10,
    }),
    getPlatformSettings(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <AdminFinanceNav
          pendingOrdersCount={orderResult.counts.pending}
        />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            অর্ডার ও পেমেন্ট যাচাই কিউ (Manual Payment Verification)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            পাঠকদের প্রেরিত বিকাশ ও নগদ লেনদেনের ট্রানজেকশন আইডি (TrxID) যাচাই করে বইটির এক্সেস উন্মুক্ত করুন।
          </p>
        </div>

        <AdminOrdersList
          orders={orderResult.orders}
          totalCount={orderResult.totalCount}
          totalPages={orderResult.totalPages}
          currentPage={orderResult.currentPage}
          counts={orderResult.counts}
          commissionPercent={settings.commissionPercent}
        />
      </div>
    </div>
  );
}
