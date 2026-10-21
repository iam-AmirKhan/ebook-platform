"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  Users,
  Settings,
  ChevronRight,
} from "lucide-react";

interface AdminFinanceNavProps {
  pendingOrdersCount?: number;
  pendingWithdrawalsCount?: number;
}

export function AdminFinanceNav({
  pendingOrdersCount = 0,
  pendingWithdrawalsCount = 0,
}: AdminFinanceNavProps) {
  const pathname = usePathname();

  const links = [
    {
      href: "/admin/finance",
      label: "সার্বিক চিত্র",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/finance/orders",
      label: "অর্ডার ও পেমেন্ট যাচাই",
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      alert: pendingOrdersCount > 0,
    },
    {
      href: "/admin/finance/withdrawals",
      label: "লেখক উত্তোলন (Payouts)",
      icon: Wallet,
      badge: pendingWithdrawalsCount > 0 ? pendingWithdrawalsCount : undefined,
      alert: pendingWithdrawalsCount > 0,
    },
    {
      href: "/admin/finance/authors",
      label: "লেখক আর্থিক হিসাব",
      icon: Users,
    },
    {
      href: "/admin/finance/settings",
      label: "আর্থিক ও পেমেন্ট সেটিংস",
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
        <Link href="/admin" className="hover:text-foreground">
          অ্যাডমিন
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground font-semibold">আর্থিক লেনদেন ও ব্যবস্থাপনা</span>
      </div>

      {/* Nav Pills */}
      <div className="flex space-x-1 sm:space-x-2 overflow-x-auto rounded-xl border border-border/60 bg-card p-1.5 shadow-2xs">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap font-[family-name:var(--font-bengali)] ${
                isActive
                  ? "bg-foreground text-background shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{link.label}</span>
              {link.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-background/20 text-background"
                      : link.alert
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
