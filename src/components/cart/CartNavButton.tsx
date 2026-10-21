"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface CartNavButtonProps {
  className?: string;
  showLabel?: boolean;
  onNavigate?: () => void;
}

export function CartNavButton({
  className = "",
  showLabel = false,
  onNavigate,
}: CartNavButtonProps) {
  const { count, isLoaded } = useCart();
  const pathname = usePathname();
  const isActive = pathname === "/cart" || pathname?.startsWith("/checkout/cart");

  const displayCount = isLoaded ? count : 0;

  if (showLabel) {
    return (
      <Link
        href="/cart"
        onClick={onNavigate}
        id="mobile-nav-cart-link"
        aria-label={`শপিং কার্ট (${displayCount}টি বই)`}
        className={`relative flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors font-[family-name:var(--font-bengali)] ${
          isActive
            ? "bg-brand/10 text-brand font-semibold"
            : "text-foreground/80 hover:bg-muted hover:text-foreground"
        } ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="size-4" />
          <span>শপিং কার্ট</span>
        </div>
        {displayCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-background font-mono">
            {displayCount > 99 ? "99+" : displayCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      id="nav-cart-button"
      data-testid="nav-cart-button"
      aria-label={`শপিং কার্ট (${displayCount}টি বই)`}
      title="শপিং কার্ট"
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground/75 transition-colors hover:bg-muted hover:text-foreground ${
        isActive ? "text-brand bg-brand/10" : ""
      } ${className}`}
    >
      <ShoppingCart className="size-5" />
      {displayCount > 0 && (
        <span
          id="nav-cart-count-badge"
          data-testid="nav-cart-count-badge"
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-background font-mono shadow-xs animate-in zoom-in-75 duration-200"
        >
          {displayCount > 99 ? "99+" : displayCount}
        </span>
      )}
      <span className="sr-only">শপিং কার্ট ({displayCount})</span>
    </Link>
  );
}
