import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}

export function Pagination({
  currentPage,
  totalPages,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Helper to construct URL for a given page while preserving other params
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    
    // Copy all existing search params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === "string") {
        params.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      }
    });

    // Update page
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }

    return `?${params.toString()}`;
  };

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="mt-12 flex items-center justify-center gap-2"
    >
      {/* Previous Button */}
      {prevPage ? (
        <Link
          href={createPageUrl(prevPage)}
          className="flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Go to previous page"
        >
          Previous
        </Link>
      ) : (
        <button
          disabled
          className="flex h-9 items-center justify-center rounded-md border border-border/50 bg-background/50 px-4 text-sm font-medium text-muted-foreground opacity-50"
          aria-label="Go to previous page"
        >
          Previous
        </button>
      )}

      {/* Page Indicator */}
      <span className="mx-4 text-sm font-medium text-muted-foreground">
        Page <span className="text-foreground">{currentPage}</span> of{" "}
        <span className="text-foreground">{totalPages}</span>
      </span>

      {/* Next Button */}
      {nextPage ? (
        <Link
          href={createPageUrl(nextPage)}
          className="flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Go to next page"
        >
          Next
        </Link>
      ) : (
        <button
          disabled
          className="flex h-9 items-center justify-center rounded-md border border-border/50 bg-background/50 px-4 text-sm font-medium text-muted-foreground opacity-50"
          aria-label="Go to next page"
        >
          Next
        </button>
      )}
    </nav>
  );
}
