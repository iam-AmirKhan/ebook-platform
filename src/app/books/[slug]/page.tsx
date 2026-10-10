import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getBookBySlug,
  getBookReviews,
  getRelatedBooks,
} from "@/lib/data/book-details";
import { BookGrid } from "@/components/books/BookGrid";
import { ReviewsList } from "@/components/books/ReviewsList";
import { ChapterList } from "@/components/books/ChapterList";

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const book = await getBookBySlug(resolvedParams.slug, null);

  if (!book) {
    return { title: "Book Not Found | Pustoka" };
  }

  return {
    title: `${book.title} by ${book.author.penName} | Pustoka`,
    description: book.summary ?? book.description,
    openGraph: {
      title: book.title,
      description: book.summary ?? book.description,
      type: "book",
      authors: [book.author.penName],
      images: book.coverImage ? [book.coverImage] : [],
    },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const resolvedParams = await params;

  const user = await getCurrentUser();
  const book = await getBookBySlug(resolvedParams.slug, user?.id ?? null);

  if (!book) {
    notFound();
  }

  const [reviews, relatedBooks] = await Promise.all([
    getBookReviews(book._id),
    getRelatedBooks(book.category._id, book._id),
  ]);

  const isOwned =
    !!user &&
    book.chapters.some((ch) => !ch.isPreview && ch.content !== null);

  const hasDiscount =
    book.discountPrice !== null && book.discountPrice < book.price;
  const displayPrice = hasDiscount ? book.discountPrice! : book.price;

  const hue =
    book.title.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Book Hero ────────────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-muted/10 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-10 md:flex-row md:items-start lg:gap-16">

            {/* Cover Column */}
            <div className="w-full shrink-0 md:w-[240px] lg:w-[280px]">
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
                    {/* Title in placeholder cover uses Bengali font */}
                    <span
                      className="font-semibold leading-snug font-[family-name:var(--font-bengali)] text-[0.9rem]"
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
            <div className="flex flex-1 flex-col min-w-0">
              {/* Category + language row */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link
                  href={`/books?category=${book.category.slug}`}
                  className="w-fit rounded-full bg-muted px-3 py-1 text-[0.8125rem] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground font-[family-name:var(--font-bengali)]"
                >
                  {book.category.name}
                </Link>
                {book.language && (
                  <span className="w-fit rounded-full border border-border/60 px-3 py-1 text-[0.8125rem] font-medium text-muted-foreground font-[family-name:var(--font-bengali)]">
                    {book.language}
                  </span>
                )}
              </div>

              {/* Title — 32px mobile → 40px desktop */}
              <h1 className="text-[2rem] font-bold leading-tight text-foreground sm:text-[2.25rem] lg:text-[2.5rem] font-[family-name:var(--font-bengali)]">
                {book.title}
              </h1>

              <p className="mt-3 text-[1.0625rem] text-muted-foreground">
                লেখক:{" "}
                <span className="font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                  {book.author.penName}
                </span>
              </p>

              {/* Summary — 17px, generous line-height */}
              {book.summary && (
                <p className="mt-5 text-[1.0625rem] leading-[1.85] text-foreground/80 font-[family-name:var(--font-bengali)]">
                  {book.summary}
                </p>
              )}

              {/* Price area */}
              <div className="mt-7 flex items-baseline gap-3">
                <span className="text-[1.875rem] font-bold text-foreground">
                  {book.currency} {displayPrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    {book.currency} {book.price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* CTA — honest states, no dead buttons */}
              <div className="mt-7">
                {isOwned ? (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-brand/10 px-4 py-3 text-[0.9375rem] font-semibold text-brand">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    আপনার কাছে এই বইটি আছে
                    <span className="ml-1 text-sm font-normal text-brand/70">
                      — রিডার শীঘ্রই আসছে
                    </span>
                  </div>
                ) : !user ? (
                  <div className="flex flex-col gap-2.5">
                    <Link
                      href={`/login?next=/books/${book.slug}`}
                      className="inline-flex h-12 w-fit items-center justify-center rounded-lg bg-foreground px-8 text-[1rem] font-semibold text-background transition-all hover:bg-foreground/90 hover:shadow-lg"
                    >
                      কিনতে সাইন ইন করুন
                    </Link>
                    <p className="text-[0.8125rem] text-muted-foreground font-[family-name:var(--font-bengali)]">
                      বিনামূল্যে একাউন্ট তৈরি করুন এবং আপনার লাইব্রেরি ট্র্যাক করুন।
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <div className="inline-flex h-12 w-fit items-center justify-center rounded-lg bg-foreground/10 px-8 text-[1rem] font-semibold text-foreground/50 cursor-not-allowed select-none">
                      {book.currency} {displayPrice.toLocaleString()} — শীঘ্রই পাওয়া যাবে
                    </div>
                    <p className="text-[0.8125rem] text-muted-foreground font-[family-name:var(--font-bengali)]">
                      এখনও পেমেন্ট চালু হয়নি। বিনামূল্যের অধ্যায়গুলো নিচে পড়া যাবে।
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Details body ─────────────────────────────────────────── */}
      {/*
        Max content width 65ch (≈ 720px) gives a comfortable line length for
        Bengali prose. The outer max-w-5xl wrapper keeps it aligned with the hero.
      */}
      <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-16">

          {/* বই সম্পর্কে ───────────────────────────────────────── */}
          <section aria-labelledby="about-heading">
            {/* 26px heading */}
            <h2
              id="about-heading"
              className="mb-5 text-[1.625rem] font-bold leading-snug text-foreground font-[family-name:var(--font-bengali)]"
            >
              বই সম্পর্কে
            </h2>
            {/* 17px body, 1.85 line-height, max 65ch readable column */}
            <p className="whitespace-pre-wrap text-[1.0625rem] leading-[1.85] text-muted-foreground font-[family-name:var(--font-bengali)] max-w-[65ch]">
              {book.description}
            </p>
          </section>

          {/* যা শিখবেন ──────────────────────────────────────────── */}
          {book.learningOutcomes.length > 0 && (
            <section aria-labelledby="outcomes-heading">
              <h2
                id="outcomes-heading"
                className="mb-5 text-[1.625rem] font-bold leading-snug text-foreground font-[family-name:var(--font-bengali)]"
              >
                যা শিখবেন
              </h2>
              {/* 2-col on sm+; 15px outcomes text */}
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {book.learningOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckIcon />
                    <span className="text-[0.9375rem] leading-[1.7] text-foreground/80 font-[family-name:var(--font-bengali)]">
                      {outcome}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* অধ্যায়সমূহ ─────────────────────────────────────────── */}
          {book.chapters.length > 0 && (
            <section aria-labelledby="chapters-heading">
              <h2
                id="chapters-heading"
                className="mb-5 text-[1.625rem] font-bold leading-snug text-foreground font-[family-name:var(--font-bengali)]"
              >
                অধ্যায়সমূহ
              </h2>
              <ChapterList chapters={book.chapters} isOwned={isOwned} />
            </section>
          )}

          {/* পাঠক পর্যালোচনা ──────────────────────────────────────── */}
          <section aria-labelledby="reviews-heading">
            <h2
              id="reviews-heading"
              className="mb-5 text-[1.625rem] font-bold leading-snug text-foreground font-[family-name:var(--font-bengali)]"
            >
              পাঠক পর্যালোচনা
            </h2>
            <div className="max-w-2xl">
              <ReviewsList reviews={reviews} />
            </div>
          </section>

        </div>
      </div>

      {/* ── Related Books ─────────────────────────────────────────── */}
      {relatedBooks.length > 0 && (
        <section className="border-t border-border/60 bg-muted/10">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                এই বিভাগের আরও বই
              </h2>
              <Link
                href={`/books?category=${book.category.slug}`}
                className="text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                সব দেখুন →
              </Link>
            </div>
            <BookGrid books={relatedBooks} />
          </div>
        </section>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-brand"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
