import type { LibraryBook } from "@/types/account";
import { BookCoverImage } from "@/components/books/BookCoverImage";

interface LibraryBookCardProps {
  book: LibraryBook;
}

export function LibraryBookCard({ book }: LibraryBookCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5">
      {/* Cover */}
      <BookCoverImage
        src={book.coverImage}
        title={book.title}
        aspectRatio="aspect-[2/3]"
        imgClassName="transition-transform duration-300 group-hover:scale-105"
      />

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
