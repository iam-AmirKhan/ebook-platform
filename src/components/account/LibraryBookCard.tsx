import type { LibraryBook } from "@/types/account";

interface LibraryBookCardProps {
  book: LibraryBook;
}

export function LibraryBookCard({ book }: LibraryBookCardProps) {
  // Derive a consistent hue for the placeholder cover
  const hue = book.title.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5">
      {/* Cover */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {book.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full flex-col items-center justify-center gap-3 p-4"
            style={{ background: `oklch(0.92 0.04 ${hue})` }}
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
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <span
              className="line-clamp-3 text-center text-xs font-medium leading-tight"
              style={{ color: `oklch(0.35 0.08 ${hue})` }}
            >
              {book.title}
            </span>
          </div>
        )}
      </div>

      {/* Info & Progress */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-foreground">
            {book.title}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground mt-0.5">
            {book.authorName}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>{book.progress}% Completed</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${book.progress}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4">
          <button className="flex w-full items-center justify-center rounded-lg bg-foreground py-2 text-xs font-semibold text-background transition-colors hover:bg-foreground/85">
            {book.progress > 0 ? "Continue Reading" : "Start Reading"}
          </button>
        </div>
      </div>
    </div>
  );
}
