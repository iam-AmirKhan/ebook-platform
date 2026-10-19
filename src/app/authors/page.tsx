import type { Metadata } from "next";
import { getPublicAuthors } from "@/lib/data/authors";
import { AuthorsGrid } from "@/components/authors/AuthorsGrid";
import { AuthorsSearch } from "@/components/authors/AuthorsSearch";
import { Pagination } from "@/components/books/Pagination";

export const metadata: Metadata = {
  title: "Authors | Pustoka",
  description: "Discover talented authors and writers publishing ebooks on Pustoka.",
  openGraph: {
    title: "Authors | Pustoka",
    description: "Discover talented authors and writers publishing ebooks on Pustoka.",
  },
};

interface AuthorsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthorsPage({ searchParams }: AuthorsPageProps) {
  const resolvedParams = await searchParams;

  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : undefined;

  let page = 1;
  if (typeof resolvedParams.page === "string") {
    const parsed = parseInt(resolvedParams.page, 10);
    if (!isNaN(parsed) && parsed > 0) {
      page = parsed;
    }
  }

  const { authors, totalCount, totalPages, currentPage } = await getPublicAuthors({
    q,
    page,
    limit: 12,
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Page Header ────────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-muted/20 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl font-[family-name:var(--font-bengali)]">
                লেখকবৃন্দ (Authors)
              </h1>
              <p className="mt-2 text-base text-muted-foreground max-w-xl">
                পুস্তিকার প্রতিভাবান লেখক ও গবেষকদের পরিচিতি এবং তাদের প্রকাশিত বইসমূহ।
              </p>
            </div>

            <div className="w-full md:w-auto">
              <AuthorsSearch initialSearch={q ?? ""} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Authors Grid Content ───────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {q && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Results for <span className="font-semibold text-foreground">&quot;{q}&quot;</span>{" "}
              ({totalCount} {totalCount === 1 ? "author" : "authors"} found)
            </p>
          </div>
        )}

        <AuthorsGrid
          authors={authors}
          emptyTitle={q ? "No authors match your search" : "No authors found"}
          emptyMessage={
            q
              ? `No author profiles found matching "${q}". Try a different keyword.`
              : "Check back soon — our community of authors is growing regularly."
          }
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={resolvedParams}
          />
        )}
      </main>
    </div>
  );
}
