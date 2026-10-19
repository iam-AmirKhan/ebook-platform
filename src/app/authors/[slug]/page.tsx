import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAuthorBySlug, getAuthorPublishedBooks } from "@/lib/data/authors";
import { BookGrid } from "@/components/books/BookGrid";
import { Pagination } from "@/components/books/Pagination";

interface AuthorProfilePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: AuthorProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await getPublicAuthorBySlug(slug);

  if (!author) {
    return { title: "Author Not Found | Pustoka" };
  }

  const title = `${author.penName} | Pustoka`;
  const description =
    author.bio?.trim() || `Read ebooks by ${author.penName} on Pustoka.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: author.profileImage ? [author.profileImage] : [],
    },
  };
}

export default async function AuthorProfilePage({
  params,
  searchParams,
}: AuthorProfilePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const author = await getPublicAuthorBySlug(slug);
  if (!author) {
    notFound();
  }

  let page = 1;
  if (typeof resolvedSearchParams.page === "string") {
    const parsed = parseInt(resolvedSearchParams.page, 10);
    if (!isNaN(parsed) && parsed > 0) {
      page = parsed;
    }
  }

  const { books, totalCount, totalPages, currentPage } =
    await getAuthorPublishedBooks(author._id, { page, limit: 12 });

  const initial = (author.penName.trim()[0] || "A").toUpperCase();

  // Format joined date
  let joinedText = "";
  if (author.createdAt) {
    try {
      const date = new Date(author.createdAt);
      joinedText = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      joinedText = "";
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Author Profile Header ───────────────────────────────── */}
      <section className="border-b border-border/60 bg-muted/20 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link
              href="/authors"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>Back to Authors</span>
            </Link>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            {/* Author Avatar */}
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-card shadow-lg sm:h-32 sm:w-32">
              {author.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.profileImage}
                  alt={author.penName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 via-brand/10 to-muted text-3xl font-bold text-brand sm:text-4xl">
                  {initial}
                </div>
              )}
            </div>

            {/* Author Information */}
            <div className="flex flex-1 flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-[family-name:var(--font-bengali)]">
                  {author.penName}
                </h1>
                <span className="rounded-full bg-brand/10 px-3 py-0.5 text-xs font-semibold text-brand">
                  Verified Author
                </span>
              </div>

              {/* Meta Chips */}
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                  <span>
                    {author.publishedBooksCount}{" "}
                    {author.publishedBooksCount === 1
                      ? "Published Book"
                      : "Published Books"}
                  </span>
                </span>

                {joinedText && (
                  <>
                    <span>•</span>
                    <span>Joined {joinedText}</span>
                  </>
                )}
              </div>

              {/* Biography */}
              {author.bio && (
                <div className="mt-4 max-w-3xl">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground/80 font-[family-name:var(--font-bengali)]">
                    {author.bio}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Published Books Section ─────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-[family-name:var(--font-bengali)]">
              প্রকাশিত বইসমূহ (Books by {author.penName})
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {totalCount > 0
                ? `Showing ${books.length} of ${totalCount} published titles`
                : "No published books available"}
            </p>
          </div>
        </div>

        <BookGrid
          books={books}
          emptyTitle="No published books yet"
          emptyMessage={`${author.penName} has not published any books yet. Check back soon for upcoming titles.`}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={resolvedSearchParams}
          />
        )}
      </main>
    </div>
  );
}
