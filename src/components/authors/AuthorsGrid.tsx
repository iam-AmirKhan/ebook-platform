import type { PublicAuthorCard } from "@/types/author";
import { AuthorCard } from "@/components/authors/AuthorCard";

interface AuthorsGridProps {
  authors: PublicAuthorCard[];
  emptyTitle?: string;
  emptyMessage?: string;
}

export function AuthorsGrid({
  authors,
  emptyTitle = "No authors found",
  emptyMessage = "There are currently no author profiles matching your criteria.",
}: AuthorsGridProps) {
  if (authors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 text-muted-foreground/50"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        <p className="text-base font-semibold text-foreground">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {authors.map((author) => (
        <AuthorCard key={author._id} author={author} />
      ))}
    </div>
  );
}
