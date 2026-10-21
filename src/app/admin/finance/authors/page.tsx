import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminAuthorsFinance } from "@/lib/data/admin-finance";
import { AdminFinanceNav } from "@/components/admin/finance/AdminFinanceNav";

export const metadata: Metadata = {
  title: "লেখকদের আর্থিক হিসাব ও ব্যালেন্স | অ্যাডমিন | Pustoka",
  description: "প্ল্যাটফর্মের সকল লেখকের অর্জিত রয়্যালটি, বিক্রয় ও ব্যালেন্সের সারসংক্ষেপ।",
};

export default async function AdminAuthorsFinancePage() {
  await requireAdmin();

  const authors = await getAdminAuthorsFinance();

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <AdminFinanceNav />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            লেখকদের আর্থিক হিসাব ও ব্যালেন্স (Author Financial Ledger)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            সকল সক্রিয় লেখকের প্রকাশিত বই সংখ্যা, মোট বিক্রয়, অর্জিত রয়্যালটি এবং উত্তোলনযোগ্য ব্যালেন্স।
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xs">
          {authors.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              কোনো লেখক প্রোফাইল পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-[family-name:var(--font-bengali)]">
                <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">লেখক ও পরিচিতি</th>
                    <th className="px-4 py-3 font-semibold text-center">প্রকাশিত বই</th>
                    <th className="px-4 py-3 font-semibold text-right">বিক্রিত কপি</th>
                    <th className="px-4 py-3 font-semibold text-right">মোট বিক্রয় (Gross)</th>
                    <th className="px-4 py-3 font-semibold text-right">মোট রয়্যালটি আয়</th>
                    <th className="px-4 py-3 font-semibold text-right">উত্তোলিত</th>
                    <th className="px-4 py-3 font-semibold text-right">প্রক্রিয়াধীন</th>
                    <th className="px-5 py-3 font-semibold text-right">উত্তোলনযোগ্য ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {authors.map((a) => (
                    <tr key={a.authorId} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground text-sm">{a.penName}</div>
                        <div className="text-[11px] text-muted-foreground">{a.userName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{a.userEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-foreground">
                        {a.publishedBooksCount}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-foreground">
                        {a.totalSalesUnits} টি
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                        ৳ {a.totalGrossSales.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        ৳ {a.totalAuthorEarnings.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                        ৳ {a.withdrawnTotal.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-amber-600 dark:text-amber-400">
                        ৳ {a.pendingBalance.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ৳ {a.availableBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
