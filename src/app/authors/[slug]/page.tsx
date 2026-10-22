import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAuthorBySlug, getAuthorPublishedBooks } from "@/lib/data/authors";
import { Pagination } from "@/components/books/Pagination";
import { BookCoverImage } from "@/components/books/BookCoverImage";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { HomepageBook } from "@/types/homepage";

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

        {books.length === 0 ? (
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
              No published books yet
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              {author.penName} has not published any books yet. Check back soon for upcoming titles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 min-[880px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-6 lg:gap-7">
            {books.map((book) => (
              <AuthorPublishedBookCard key={book._id} book={book} />
            ))}
          </div>
        )}

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

function AuthorPublishedBookCard({ book }: { book: HomepageBook }) {
  const hasDiscount =
    book.discountPrice !== null &&
    book.discountPrice !== undefined &&
    book.discountPrice < book.price;

  const displayPrice = hasDiscount ? book.discountPrice! : book.price;

  return (
    <div
      className="group relative flex flex-col h-full rounded-2xl border border-border/70 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 focus-within:ring-2 focus-within:ring-brand/30"
      aria-label={`${book.title} by ${book.authorName}`}
    >
      {/* Cover image link with reduced height & centered 2:3 book cover */}
      <Link
        href={`/books/${book.slug}`}
        className="relative flex items-center justify-center bg-gradient-to-b from-muted/30 to-muted/10 p-3 sm:p-4 h-48 sm:h-56 overflow-hidden border-b border-border/40"
      >
        <div className="relative aspect-[2/3] h-full max-h-full shrink-0 overflow-hidden rounded-md shadow-sm transition-transform duration-500 ease-out group-hover:scale-105">
          <BookCoverImage
            src={book.coverImage}
            title={book.title}
            aspectRatio="aspect-[2/3]"
            className="h-full w-full"
            imgClassName="h-full w-full object-cover"
          />
        </div>

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute right-3 top-3 z-20 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm font-[family-name:var(--font-bengali)]">
            ছাড়
          </span>
        )}
      </Link>

      {/* Metadata & Actions */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 gap-2.5 sm:gap-3">
        <div>
          {book.categoryName && (
            <span className="inline-block w-fit rounded-md bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand font-[family-name:var(--font-bengali)] mb-1.5 sm:mb-2">
              {book.categoryName}
            </span>
          )}

          <Link href={`/books/${book.slug}`} className="block group/title">
            <h3 className="line-clamp-2 text-sm sm:text-base font-bold leading-snug sm:leading-relaxed text-foreground group-hover/title:text-brand transition-colors font-[family-name:var(--font-bengali)] min-h-[2.5rem] sm:min-h-[2.75rem]">
              {book.title}
            </h3>

            <p className="line-clamp-1 text-xs text-muted-foreground mt-1 leading-normal font-[family-name:var(--font-bengali)]">
              {book.authorName}
            </p>
          </Link>
        </div>

        {/* Price & Action Buttons */}
        <div className="mt-auto pt-2.5 sm:pt-3 border-t border-border/50 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                {book.currency} {displayPrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through font-[family-name:var(--font-bengali)]">
                  {book.currency} {book.price.toLocaleString()}
                </span>
              )}
            </div>
            {hasDiscount && (
              <span className="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 font-[family-name:var(--font-bengali)] whitespace-nowrap">
                {book.currency} {(book.price - displayPrice).toLocaleString()} সাশ্রয়
              </span>
            )}
          </div>

          {/* Action Row: Buy Now & Add to Cart */}
          <div className="flex items-center gap-2 pt-0.5">
            <Link
              href={`/checkout/${book.slug}`}
              id={`buy-book-${book.slug}`}
              data-testid={`buy-book-${book.slug}`}
              aria-label={`কিনুন: ${book.title}`}
              className="inline-flex h-9 min-w-[70px] shrink-0 items-center justify-center rounded-xl bg-foreground px-3.5 text-xs font-semibold text-background transition-colors hover:bg-foreground/85 whitespace-nowrap shadow-xs font-[family-name:var(--font-bengali)]"
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
              className="flex-1 min-w-0 h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
