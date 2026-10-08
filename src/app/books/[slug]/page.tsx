import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getBookBySlug,
  checkUserOwnership,
  getBookReviews,
  getRelatedBooks,
} from "@/lib/data/book-details";
import { BookGrid } from "@/components/books/BookGrid";
import { ReviewsList } from "@/components/books/ReviewsList";

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const book = await getBookBySlug(resolvedParams.slug);

  if (!book) {
    return {
      title: "Book Not Found | BoiBazar",
    };
  }

  return {
    title: `${book.title} by ${book.author.penName} | BoiBazar`,
    description: book.description,
    openGraph: {
      title: book.title,
      description: book.description,
      type: "book",
      authors: [book.author.penName],
      images: book.coverImage ? [book.coverImage] : [],
    },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const resolvedParams = await params;
  
  // 1. Fetch user and book data
  const [user, book] = await Promise.all([
    getCurrentUser(),
    getBookBySlug(resolvedParams.slug),
  ]);

  if (!book) {
    notFound();
  }

  // 2. Fetch ownership, reviews, and related books in parallel
  const [isOwned, reviews, relatedBooks] = await Promise.all([
    user ? checkUserOwnership(user.id, book._id) : Promise.resolve(false),
    getBookReviews(book._id),
    getRelatedBooks(book.category._id, book._id),
  ]);

  const hasDiscount =
    book.discountPrice !== null && book.discountPrice < book.price;
  const displayPrice = hasDiscount ? book.discountPrice! : book.price;

  // Placeholder cover hue calculation (reusing logic from BookCard)
  const hue = book.title.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Book Hero ────────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-muted/10 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-10 md:flex-row md:items-start lg:gap-16">
            
            {/* Cover Column */}
            <div className="w-full shrink-0 md:w-1/3 lg:w-[320px]">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border/50 bg-muted shadow-xl shadow-brand/5">
                {book.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverImage}
                    alt={`Cover of ${book.title}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center"
                    style={{ background: `oklch(0.92 0.04 ${hue})` }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
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
                      className="text-sm font-semibold leading-tight"
                      style={{ color: `oklch(0.35 0.08 ${hue})` }}
                    >
                      {book.title}
                    </span>
                  </div>
                )}
                
                {hasDiscount && (
                  <span className="absolute right-3 top-3 rounded-md bg-brand px-2 py-1 text-xs font-bold uppercase tracking-wide text-background shadow-sm">
                    Sale
                  </span>
                )}
              </div>
            </div>

            {/* Info Column */}
            <div className="flex flex-1 flex-col">
              <Link
                href={`/books?category=${book.category.slug}`}
                className="mb-3 w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              >
                {book.category.name}
              </Link>
              
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {book.title}
              </h1>
              
              <p className="mt-2 text-lg text-muted-foreground">
                By <span className="font-medium text-foreground">{book.author.penName}</span>
              </p>

              {/* Price area */}
              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">
                  {book.currency} {displayPrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    {book.currency} {book.price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mt-8 border-t border-border/60 pt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  About this book
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                  {book.description}
                </p>
              </div>

              {/* Auth-Aware CTA */}
              <div className="mt-10">
                {!user ? (
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-8 text-base font-semibold text-background transition-all hover:bg-foreground/90 hover:shadow-lg"
                  >
                    Login to purchase
                  </Link>
                ) : isOwned ? (
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-brand px-8 text-base font-semibold text-background transition-all hover:bg-brand/90 hover:shadow-lg hover:shadow-brand/20"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                      aria-hidden="true"
                    >
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    Read Book
                  </button>
                ) : (
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-8 text-base font-semibold text-background transition-all hover:bg-foreground/90 hover:shadow-lg"
                  >
                    Buy now for {book.currency} {displayPrice.toLocaleString()}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold tracking-tight text-foreground">
          Reader Reviews
        </h2>
        <div className="max-w-2xl">
          <ReviewsList reviews={reviews} />
        </div>
      </section>

      {/* ── Related Books ─────────────────────────────────────── */}
      {relatedBooks.length > 0 && (
        <section className="border-t border-border/60 bg-muted/10">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                More in {book.category.name}
              </h2>
              <Link
                href={`/books?category=${book.category.slug}`}
                className="text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                View all →
              </Link>
            </div>
            <BookGrid books={relatedBooks} />
          </div>
        </section>
      )}
    </div>
  );
}
