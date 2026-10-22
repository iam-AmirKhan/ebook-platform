import Link from "next/link";
import type { HomepageBook } from "@/types/homepage";

import { AddToCartButton } from "@/components/cart/AddToCartButton";

interface BookCardProps {
  book: HomepageBook;
}

export function BookCard({ book }: BookCardProps) {
  const hasDiscount =
    book.discountPrice !== null &&
    book.discountPrice !== undefined &&
    book.discountPrice < book.price;

  const displayPrice = hasDiscount ? book.discountPrice! : book.price;

  return (
    <div
      className="group relative flex flex-col h-full rounded-2xl border border-border/70 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 focus-within:ring-2 focus-within:ring-brand/30"
      aria-label={`${book.title} by ${book.authorName}`}
    >
      {/* Cover image link with spine shadow */}
      <Link
        href={`/books/${book.slug}`}
        className="relative aspect-[3/4] w-full overflow-hidden bg-muted/30 block"
      >
        {/* Subtle realistic book spine shadow */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/25 via-black/10 to-transparent z-10" />

        {book.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <PlaceholderCover title={book.title} />
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm font-[family-name:var(--font-bengali)]">
            ছাড়
          </span>
        )}
      </Link>

      {/* Metadata & Actions */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-5 gap-2.5 sm:gap-3.5">
        <div>
          {book.categoryName && (
            <span className="inline-block w-fit rounded-md bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand font-[family-name:var(--font-bengali)] mb-1.5 sm:mb-2">
              {book.categoryName}
            </span>
          )}

          <Link href={`/books/${book.slug}`} className="block group/title">
            <h3 className="line-clamp-2 text-base sm:text-lg font-bold leading-snug sm:leading-relaxed text-foreground group-hover/title:text-brand transition-colors font-[family-name:var(--font-bengali)] min-h-[2.75rem] sm:min-h-[3.25rem]">
              {book.title}
            </h3>

            <p className="line-clamp-1 text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-1.5 leading-normal font-[family-name:var(--font-bengali)]">
              {book.authorName}
            </p>
          </Link>
        </div>

        {/* Price & Action Buttons */}
        <div className="mt-auto pt-2.5 sm:pt-3.5 border-t border-border/50 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                {book.currency} {displayPrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-xs sm:text-sm text-muted-foreground line-through font-[family-name:var(--font-bengali)]">
                  {book.currency} {book.price.toLocaleString()}
                </span>
              )}
            </div>
            {hasDiscount && (
              <span className="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 font-[family-name:var(--font-bengali)] whitespace-nowrap">
                {book.currency} {(book.price - displayPrice).toLocaleString()} সাশ্রয়
              </span>
            )}
          </div>

          {/* Action Row: Buy Now & Add to Cart */}
          <div className="flex items-center gap-2 pt-0.5">
            <Link
              href={`/checkout/${book.slug}`}
              id={`buy-book-${book.slug}`}
              data-testid={`buy-book-${book.slug}`}
              aria-label={`কিনুন: ${book.title}`}
              className="inline-flex h-9 sm:h-10 min-w-[70px] sm:min-w-[76px] shrink-0 items-center justify-center rounded-xl bg-foreground px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-background transition-colors hover:bg-foreground/85 whitespace-nowrap shadow-xs font-[family-name:var(--font-bengali)]"
            >
              কিনুন
            </Link>
            <AddToCartButton
              book={{
                bookId: book._id,
                slug: book.slug,
                title: book.title,
                price: displayPrice,
                originalPrice: book.price,
                coverImage: book.coverImage,
                authorName: book.authorName,
                currency: book.currency || "BDT",
              }}
              size="sm"
              className="flex-1 min-w-0 h-9 sm:h-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fallback cover shown when coverImage is null
// ---------------------------------------------------------------------------
function PlaceholderCover({ title }: { title: string }) {
  // Derive a consistent hue from the title string for visual variety
  const hue = title
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full flex-col items-center justify-center gap-3.5 p-6 text-center"
      style={{
        background: `oklch(0.92 0.04 ${hue})`,
      }}
    >
      <div
        className="flex size-12 items-center justify-center rounded-2xl shadow-xs"
        style={{
          background: `oklch(0.85 0.07 ${hue})`,
          color: `oklch(0.35 0.09 ${hue})`,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      </div>
      <span
        className="line-clamp-3 text-sm font-semibold leading-relaxed px-2 font-[family-name:var(--font-bengali)]"
        style={{ color: `oklch(0.30 0.09 ${hue})` }}
      >
        {title}
      </span>
    </div>
  );
}
