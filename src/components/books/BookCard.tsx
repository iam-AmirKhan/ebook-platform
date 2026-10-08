import Link from "next/link";
import type { HomepageBook } from "@/types/homepage";

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
    <Link
      href={`/books/${book.slug}`}
      className="group flex flex-col rounded-xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
      aria-label={`${book.title} by ${book.authorName}`}
    >
      {/* Cover image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl bg-muted">
        {book.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <PlaceholderCover title={book.title} />
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute right-2 top-2 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
            Sale
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-brand transition-colors">
          {book.title}
        </h3>

        <p className="line-clamp-1 text-xs text-muted-foreground">
          {book.authorName}
        </p>

        {book.categoryName && (
          <span className="mt-0.5 inline-block w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {book.categoryName}
          </span>
        )}

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-1.5 pt-2">
          <span className="text-sm font-bold text-foreground">
            {book.currency} {displayPrice.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {book.currency} {book.price.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
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
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-4"
      style={{
        background: `oklch(0.92 0.04 ${hue})`,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: `oklch(0.45 0.08 ${hue})` }}
        aria-hidden="true"
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
      <span
        className="line-clamp-3 text-center text-xs font-medium leading-tight"
        style={{ color: `oklch(0.35 0.08 ${hue})` }}
      >
        {title}
      </span>
    </div>
  );
}
