import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminWithdrawals } from "@/lib/data/admin-finance";
import { AdminFinanceNav } from "@/components/admin/finance/AdminFinanceNav";
import { AdminWithdrawalsList } from "@/components/admin/finance/AdminWithdrawalsList";

export const metadata: Metadata = {
  title: "লেখক উত্তোলন ব্যবস্থাপনা (Payouts) | অ্যাডমিন | Pustoka",
  description: "লেখকদের রয়্যালটি উত্তোলন পর্যালোচনা, তহবিল সংরক্ষণ ও অর্থ প্রেরণ কেন্দ্র।",
};

interface AdminWithdrawalsPageProps {
  searchParams?: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function AdminWithdrawalsPage({
  searchParams,
}: AdminWithdrawalsPageProps) {
  await requireAdmin();

  const resolvedParams = searchParams ? await searchParams : undefined;
  const page = resolvedParams?.page ? parseInt(resolvedParams.page, 10) : 1;
  const status = resolvedParams?.status;
  const q = resolvedParams?.q;

  const withdrawalResult = await getAdminWithdrawals({
    status,
    q,
    page,
    limit: 10,
  });

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <AdminFinanceNav
          pendingWithdrawalsCount={withdrawalResult.counts.pending}
        />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            লেখক অর্থ উত্তোলন ব্যবস্থাপনা (Author Payout Queue)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            লেখকদের উপার্জিত রয়্যালটি উত্তোলনের অনুরোধ পর্যালোচনা করুন, তহবিল সংরক্ষণ করুন এবং বিকাশ/নগদে পরিশোধ সম্পন্ন করুন।
          </p>
        </div>

        <AdminWithdrawalsList
          withdrawals={withdrawalResult.withdrawals}
          totalCount={withdrawalResult.totalCount}
          totalPages={withdrawalResult.totalPages}
          currentPage={withdrawalResult.currentPage}
          counts={withdrawalResult.counts}
        />
      </div>
    </div>
  );
}
