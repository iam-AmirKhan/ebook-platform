import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminFinancialDashboardData } from "@/lib/data/admin-finance";
import { AdminFinanceNav } from "@/components/admin/finance/AdminFinanceNav";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Percent,
  Wallet,
  Clock,
  CheckCircle2,
  Send,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "আর্থিক ব্যবস্থাপনা ও হিসাব | অ্যাডমিন | Pustoka",
  description: "প্ল্যাটফর্মের বিক্রয়, রাজস্ব, লেখক রয়্যালটি ও উত্তোলন ব্যবস্থাপনা।",
};

export default async function AdminFinancePage() {
  await requireAdmin();

  const data = await getAdminFinancialDashboardData();
  const { stats, recentOrders, recentWithdrawals, settings } = data;

  const kpis = [
    {
      label: "মোট যাচাইকৃত বিক্রয়",
      amount: stats.totalVerifiedSales,
      desc: "সফলভাবে পরিশোধিত ও অনুমোদিত অর্ডার",
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "প্ল্যাটফর্ম রাজস্ব (কমিশন)",
      amount: stats.totalPlatformCommission,
      desc: `বর্তমান কমিশন হার: ${settings.commissionPercent}%`,
      icon: Percent,
      color: "text-brand",
      bg: "bg-brand/10",
      border: "border-brand/20",
    },
    {
      label: "লেখকদের রয়্যালটি বন্টন",
      amount: stats.totalAuthorEarnings,
      desc: "লেখকদের সর্বমোট উপার্জিত নিট আয়",
      icon: Wallet,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "যাচাইাধীন অর্ডার",
      amount: stats.pendingOrdersAmount,
      count: stats.pendingOrdersCount,
      desc: stats.pendingOrdersCount > 0 ? "পেমেন্ট পর্যালোচনার অপেক্ষায়" : "কোনো অপেক্ষমাণ নেই",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      alert: stats.pendingOrdersCount > 0,
    },
    {
      label: "অপেক্ষমাণ উত্তোলন (Payouts)",
      amount: stats.pendingWithdrawalsAmount,
      count: stats.pendingWithdrawalsCount,
      desc: stats.pendingWithdrawalsCount > 0 ? "লেখকদের অর্থ প্রেরণের অপেক্ষায়" : "কোনো অপেক্ষমাণ নেই",
      icon: Send,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      alert: stats.pendingWithdrawalsCount > 0,
    },
    {
      label: "পরিশোধিত উত্তোলন (মোট)",
      amount: stats.completedPayoutsAmount,
      count: stats.completedPayoutsCount,
      desc: `${stats.completedPayoutsCount}টি সফল উত্তোলন লেনদেন`,
      icon: CheckCircle2,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation */}
        <AdminFinanceNav
          pendingOrdersCount={stats.pendingOrdersCount}
          pendingWithdrawalsCount={stats.pendingWithdrawalsCount}
        />

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
              আর্থিক সার্বিক চিত্র ও নিয়ন্ত্রণ (Financial Hub)
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
              প্ল্যাটফর্মের বিক্রয় রাজস্ব, লেখকদের রয়্যালটি ব্যালেন্স, ম্যানুয়াল পেমেন্ট যাচাই ও পেআউট পর্যবেক্ষণ।
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/finance/settings">
              <Button variant="outline" size="sm" className="font-[family-name:var(--font-bengali)]">
                কমিশন সেটিংস
              </Button>
            </Link>
            <Link href="/admin/finance/orders">
              <Button size="sm" className="font-[family-name:var(--font-bengali)]">
                অর্ডার যাচাই কিউ
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className={`rounded-2xl border ${kpi.border} bg-card p-5 shadow-2xs`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground font-[family-name:var(--font-bengali)]">
                    {kpi.label}
                  </span>
                  <span className={`flex size-9 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color}`}>
                    <Icon className="size-4.5" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    ৳ {kpi.amount.toLocaleString()}
                  </p>
                  {kpi.count !== undefined && (
                    <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                      ({kpi.count}টি)
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
                  {kpi.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Recent Orders Section */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
                সাম্প্রতিক অর্ডারসমূহ (Recent Orders)
              </h2>
              <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                সর্বশেষ প্রাপ্ত ম্যানুয়াল পেমেন্ট অর্ডারসমূহ।
              </p>
            </div>
            <Link
              href="/admin/finance/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline font-[family-name:var(--font-bengali)]"
            >
              সকল অর্ডার দেখুন ({stats.pendingOrdersCount}টি অপেক্ষমাণ)
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              কোনো সাম্প্রতিক অর্ডার নেই।
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-[family-name:var(--font-bengali)]">
                <thead className="border-b border-border/40 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 font-semibold">অর্ডার নং</th>
                    <th className="py-2.5 font-semibold">ক্রেতা</th>
                    <th className="py-2.5 font-semibold">বই</th>
                    <th className="py-2.5 font-semibold">পরিমাণ</th>
                    <th className="py-2.5 font-semibold">পেমেন্ট মেথড</th>
                    <th className="py-2.5 font-semibold">TrxID</th>
                    <th className="py-2.5 font-semibold text-right">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-muted/10">
                      <td className="py-3 font-mono font-bold text-foreground">
                        #{o.orderNumber}
                      </td>
                      <td className="py-3 text-foreground font-medium">
                        {o.userName}
                      </td>
                      <td className="py-3 text-foreground line-clamp-1">
                        {o.bookTitle}
                      </td>
                      <td className="py-3 font-mono font-bold text-foreground">
                        ৳ {o.total.toLocaleString()}
                      </td>
                      <td className="py-3 uppercase font-semibold">
                        {o.paymentMethod}
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">
                        {o.transactionId || "—"}
                      </td>
                      <td className="py-3 text-right">
                        {o.status === "PENDING" && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            যাচাইাধীন
                          </span>
                        )}
                        {o.status === "PAID" && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            অনুমোদিত
                          </span>
                        )}
                        {o.status === "CANCELLED" && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            বাতিল
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Withdrawals Section */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
                সাম্প্রতিক উত্তোলন অনুরোধ (Recent Withdrawals)
              </h2>
              <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                লেখকদের পেআউট অনুরোধসমূহ।
              </p>
            </div>
            <Link
              href="/admin/finance/withdrawals"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline font-[family-name:var(--font-bengali)]"
            >
              সকল উত্তোলন দেখুন ({stats.pendingWithdrawalsCount}টি অপেক্ষমাণ)
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {recentWithdrawals.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              কোনো সাম্প্রতিক উত্তোলন অনুরোধ নেই।
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-[family-name:var(--font-bengali)]">
                <thead className="border-b border-border/40 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 font-semibold">তারিখ</th>
                    <th className="py-2.5 font-semibold">লেখক</th>
                    <th className="py-2.5 font-semibold">পরিমাণ</th>
                    <th className="py-2.5 font-semibold">মাধ্যম ও অ্যাকাউন্ট</th>
                    <th className="py-2.5 font-semibold text-right">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentWithdrawals.map((w) => (
                    <tr key={w._id} className="hover:bg-muted/10">
                      <td className="py-3 text-muted-foreground">
                        {new Date(w.createdAt).toLocaleDateString("bn-BD")}
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        {w.authorPenName}
                      </td>
                      <td className="py-3 font-mono font-bold text-foreground">
                        ৳ {w.amount.toLocaleString()}
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">
                        {w.payoutMethod} - {w.payoutAccountNumber}
                      </td>
                      <td className="py-3 text-right">
                        {w.status === "PENDING" && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            অপেক্ষমাণ
                          </span>
                        )}
                        {w.status === "ACCEPTED" && (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                            সংরক্ষিত
                          </span>
                        )}
                        {w.status === "PAID" && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            পরিশোধিত
                          </span>
                        )}
                        {w.status === "REJECTED" && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            প্রত্যাখ্যাত
                          </span>
                        )}
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
