import type { HomepageBook } from "@/types/homepage";
import { BookCard } from "@/components/books/BookCard";

interface BookGridProps {
  books: HomepageBook[];
  emptyTitle?: string;
  emptyMessage?: string;
  variant?: "catalog" | "home";
}

export function BookGrid({
  books,
  emptyTitle = "No books yet",
  emptyMessage = "Check back soon — new titles are added regularly.",
  variant = "catalog",
}: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
          {emptyTitle}
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const gridClasses =
    variant === "home"
      ? "grid grid-cols-1 min-[500px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5"
      : "grid grid-cols-1 min-[500px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5";

  return (
    <div className={gridClasses}>
      {books.map((book) => (
        <BookCard key={book._id} book={book} />
      ))}
    </div>
  );
}
