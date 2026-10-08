import type { Metadata } from "next";
import { getCatalogBooks, getAllActiveCategories } from "@/lib/data/catalog";
import { BookGrid } from "@/components/books/BookGrid";
import { CatalogFilters } from "@/components/books/CatalogFilters";
import { Pagination } from "@/components/books/Pagination";

export const metadata: Metadata = {
  title: "Books | BoiBazar",
  description: "Browse our entire catalog of ebooks. Find your next great read.",
};

interface BooksPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  // Await searchParams in Next.js 15+ (if using canary/beta, but safe pattern anyway)
  const resolvedParams = await searchParams;

  // Extract params
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : undefined;
  const category = typeof resolvedParams.category === "string" ? resolvedParams.category : undefined;
  const sort = typeof resolvedParams.sort === "string" ? resolvedParams.sort : "latest";
  
  // Parse page safely
  let page = 1;
  if (typeof resolvedParams.page === "string") {
    const parsed = parseInt(resolvedParams.page, 10);
    if (!isNaN(parsed) && parsed > 0) {
      page = parsed;
    }
  }

  // Fetch data in parallel
  const [catalogResult, categories] = await Promise.all([
    getCatalogBooks({ q, category, sort, page, limit: 12 }),
    getAllActiveCategories(),
  ]);

  const { books, totalCount, totalPages, currentPage, activeCategoryName } = catalogResult;

  // Build a result summary string
  let resultSummary = "All Books";
  if (q && activeCategoryName) {
    resultSummary = `Results for "${q}" in ${activeCategoryName}`;
  } else if (q) {
    resultSummary = `Search results for "${q}"`;
  } else if (activeCategoryName) {
    resultSummary = `${activeCategoryName} Books`;
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Header ────────────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-muted/20 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Library
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Discover your next favorite book from our growing collection.
          </p>
        </div>
      </section>

      {/* ── Main Layout ────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          
          {/* Sidebar / Filters (Left) */}
          <aside className="w-full shrink-0 md:sticky md:top-24 md:w-64 lg:w-72">
            <CatalogFilters
              categories={categories}
              currentQuery={q}
              currentCategory={category}
              currentSort={sort}
            />
          </aside>

          {/* Results Area (Right) */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <h2 className="text-xl font-semibold text-foreground">
                {resultSummary}
              </h2>
              <span className="text-sm font-medium text-muted-foreground">
                {totalCount} {totalCount === 1 ? "result" : "results"}
              </span>
            </div>

            {/* Grid */}
            <BookGrid
              books={books}
              emptyTitle={
                q || category
                  ? "No matching books found"
                  : "Catalogue coming soon"
              }
              emptyMessage={
                q || category
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "We're currently stocking our digital shelves. Check back soon!"
              }
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              searchParams={resolvedParams}
            />
          </main>
        </div>
      </section>
    </div>
  );
}
