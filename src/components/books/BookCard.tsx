import Link from "next/link";
import type { HomepageBook } from "@/types/homepage";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { BookCoverImage } from "@/components/books/BookCoverImage";

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
      className="group relative flex flex-col h-full rounded-2xl border border-border/70 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 focus-within:ring-2 focus-within:ring-brand/30 max-w-[280px] sm:max-w-none mx-auto w-full"
      aria-label={`${book.title} by ${book.authorName}`}
    >
      {/* Cover image link with spine shadow */}
      <Link
        href={`/books/${book.slug}`}
        className="relative block w-full overflow-hidden"
      >
        <BookCoverImage
          src={book.coverImage}
          title={book.title}
          aspectRatio="aspect-[2/3]"
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute right-2.5 top-2.5 z-20 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm font-[family-name:var(--font-bengali)]">
            ছাড়
          </span>
        )}
      </Link>

      {/* Metadata & Actions */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-3.5 gap-2 sm:gap-2.5">
        <div>
          {book.categoryName && (
            <span className="inline-block w-fit rounded-md bg-muted/80 px-2 py-0.5 text-[11px] sm:text-xs font-medium text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand font-[family-name:var(--font-bengali)] mb-1 sm:mb-1.5">
              {book.categoryName}
            </span>
          )}

          <Link href={`/books/${book.slug}`} className="block group/title">
            <h3 className="line-clamp-2 text-sm sm:text-base font-bold leading-snug text-foreground group-hover/title:text-brand transition-colors font-[family-name:var(--font-bengali)] min-h-[2.5rem] sm:min-h-[2.75rem]">
              {book.title}
            </h3>

            <p className="line-clamp-1 text-xs text-muted-foreground mt-1 leading-normal font-[family-name:var(--font-bengali)]">
              {book.authorName}
            </p>
          </Link>
        </div>

        {/* Price & Action Buttons */}
        <div className="mt-auto pt-2 sm:pt-2.5 border-t border-border/50 space-y-2 sm:space-y-2.5">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                {book.currency} {displayPrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-[11px] sm:text-xs text-muted-foreground line-through font-[family-name:var(--font-bengali)]">
                  {book.currency} {book.price.toLocaleString()}
                </span>
              )}
            </div>
            {hasDiscount && (
              <span className="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400 font-[family-name:var(--font-bengali)] whitespace-nowrap">
                {book.currency} {(book.price - displayPrice).toLocaleString()} সাশ্রয়
              </span>
            )}
          </div>

          {/* Action Row: Buy Now & Add to Cart */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Link
              href={`/checkout/${book.slug}`}
              id={`buy-book-${book.slug}`}
              data-testid={`buy-book-${book.slug}`}
              aria-label={`কিনুন: ${book.title}`}
              className="inline-flex h-8 sm:h-9 min-w-[56px] sm:min-w-[62px] shrink-0 items-center justify-center rounded-xl bg-foreground px-2.5 sm:px-3 text-xs font-semibold text-background transition-colors hover:bg-foreground/85 whitespace-nowrap shadow-xs font-[family-name:var(--font-bengali)]"
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
              className="flex-1 min-w-0 !h-8 sm:!h-9 px-2 sm:px-2.5 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
