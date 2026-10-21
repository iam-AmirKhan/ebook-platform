"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check } from "lucide-react";
import { useCart, type CartItem } from "@/context/CartContext";

interface AddToCartButtonProps {
  book: {
    bookId: string;
    slug: string;
    title: string;
    price: number;
    originalPrice?: number;
    coverImage: string | null;
    authorName: string;
    currency: string;
  };
  size?: "sm" | "default" | "lg";
  className?: string;
  showText?: boolean;
}

export function AddToCartButton({
  book,
  size = "default",
  className = "",
  showText = true,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(book.bookId);

  const [justAdded, setJustAdded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCart) {
      router.push("/cart");
      return;
    }

    const item: CartItem = {
      bookId: book.bookId,
      slug: book.slug,
      title: book.title,
      price: book.price,
      originalPrice: book.originalPrice,
      coverImage: book.coverImage,
      authorName: book.authorName,
      currency: book.currency || "BDT",
    };

    const res = addItem(item);
    if (res.success) {
      setJustAdded(true);
      setTimeout(() => {
        setJustAdded(false);
      }, 2500);
    }
  };

  // Sizing styles
  const sizeClasses =
    size === "sm"
      ? "h-10 px-3 text-xs sm:text-sm gap-1.5"
      : size === "lg"
      ? "h-12 px-6 text-base gap-2.5"
      : "h-10 px-4 text-sm gap-2";

  const isSuccessState = inCart || justAdded;

  return (
    <button
      type="button"
      onClick={handleClick}
      id={`add-to-cart-${book.slug}`}
      data-testid={`add-to-cart-${book.slug}`}
      aria-label={
        isSuccessState
          ? `কার্টে আছে: ${book.title} (কার্ট দেখুন)`
          : `কার্টে যোগ করুন: ${book.title}`
      }
      title={
        isSuccessState ? "বইটি কার্টে আছে (কার্ট দেখতে ক্লিক করুন)" : "কার্টে যোগ করুন"
      }
      className={`inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-all duration-200 select-none font-[family-name:var(--font-bengali)] ${
        isSuccessState
          ? "border border-emerald-500/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
          : "border border-border/80 bg-background text-foreground hover:bg-muted hover:border-border hover:shadow-xs active:scale-[0.98]"
      } ${sizeClasses} ${className}`}
    >
      {isSuccessState ? (
        <>
          <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {showText && <span className="whitespace-nowrap truncate">কার্টে আছে</span>}
        </>
      ) : (
        <>
          <ShoppingCart className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          {showText && <span className="whitespace-nowrap truncate">কার্টে যোগ করুন</span>}
        </>
      )}
    </button>
  );
}
