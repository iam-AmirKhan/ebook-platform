import type { AuthorFinancialSummary } from "@/types/author";
import { Wallet, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface AuthorFinancialCardsProps {
  summary: AuthorFinancialSummary;
}

export function AuthorFinancialCards({ summary }: AuthorFinancialCardsProps) {
  const cards = [
    {
      title: "উত্তোলনযোগ্য ব্যালেন্স",
      subtitle: "এখনই উত্তোলন করতে পারবেন",
      amount: summary.availableBalance,
      icon: Wallet,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "মোট উপার্জিত আয়",
      subtitle: "প্ল্যাটফর্ম কমিশন বাদে নিট আয়",
      amount: summary.lifetimeEarnings,
      icon: TrendingUp,
      color: "text-brand",
      bgColor: "bg-brand/10",
      borderColor: "border-brand/20",
    },
    {
      title: "প্রক্রিয়াধীন উত্তোলন",
      subtitle: "অ্যাডমিন পর্যালোচনার অপেক্ষায়",
      amount: summary.pendingBalance,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      title: "সর্বমোট উত্তোলিত",
      subtitle: "সফলভাবে আপনার অ্যাকাউন্টে প্রেরিত",
      amount: summary.withdrawnTotal,
      icon: CheckCircle,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className={`rounded-2xl border ${c.borderColor} bg-card p-5 shadow-2xs transition-all hover:shadow-xs`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground font-[family-name:var(--font-bengali)]">
                {c.title}
              </span>
              <span className={`flex size-9 items-center justify-center rounded-xl ${c.bgColor} ${c.color}`}>
                <Icon className="size-4.5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              ৳ {c.amount.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
              {c.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}
