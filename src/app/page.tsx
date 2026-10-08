import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getFeaturedBooks,
  getLatestBooks,
  getActiveCategories,
  getHomepageStats,
} from "@/lib/data/homepage";
import { BookGrid } from "@/components/books/BookGrid";
import { CategoryList } from "@/components/categories/CategoryPill";

export const metadata: Metadata = {
  title: "BoiBazar — Bangladesh's Digital Book Marketplace",
  description:
    "Discover and read ebooks from Bangladeshi and international authors. Browse thousands of titles, pay in BDT, and build your personal digital library.",
};

// ---------------------------------------------------------------------------
// Stat formatting helper — shows real count when > 0, placeholder otherwise
// ---------------------------------------------------------------------------
function formatStat(value: number | null, placeholder: string): string {
  if (value === null) return placeholder;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k+`;
  if (value > 0) return `${value}+`;
  return placeholder;
}

// ---------------------------------------------------------------------------
// Homepage — Server Component. Fetches all data in parallel.
// ---------------------------------------------------------------------------
export default async function HomePage() {
  // All fetches run in parallel — single round-trip to MongoDB per group
  const [user, featuredBooks, latestBooks, categories, stats] =
    await Promise.all([
      getCurrentUser(),
      getFeaturedBooks(),
      getLatestBooks(),
      getActiveCategories(),
      getHomepageStats(),
    ]);

  const showLatest = latestBooks.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* ══════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════ */}
      <section
        id="hero"
        aria-labelledby="hero-heading"
        className="relative flex flex-col items-center justify-center overflow-hidden border-b border-border/60 px-4 py-24 text-center md:py-36"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.95 0.04 60 / 0.6), transparent), var(--background)",
        }}
      >
        {/* Decorative blur blob */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-24 left-1/2 h-[480px] w-[600px] -translate-x-1/2 rounded-full bg-brand/8 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-brand">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Bangladesh&apos;s Digital Library
          </span>

          <h1
            id="hero-heading"
            className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl"
          >
            Discover books that{" "}
            <span className="relative whitespace-nowrap text-brand">
              inspire you
              <svg
                aria-hidden="true"
                viewBox="0 0 418 42"
                className="absolute left-0 top-full mt-0.5 w-full fill-brand/30"
                preserveAspectRatio="none"
              >
                <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Browse thousands of Bangla and English ebooks. Support independent
            authors. Build your personal digital library — one page at a time.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/books"
              id="hero-browse-cta"
              className="flex h-11 items-center justify-center rounded-lg bg-foreground px-7 text-sm font-semibold text-background transition-all hover:bg-foreground/85 hover:shadow-md"
            >
              Browse Books
            </Link>
            <Link
              href="/categories"
              id="hero-categories-cta"
              className="flex h-11 items-center justify-center rounded-lg border border-border px-7 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Explore Categories
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════════ */}
      <section
        aria-label="Platform statistics"
        className="border-b border-border/60 bg-muted/20"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-border/60 px-4 py-8 text-center">
          {[
            {
              value: formatStat(stats.publishedBooks, "Growing"),
              label: "Ebooks",
            },
            {
              value: formatStat(stats.activeAuthors, "Many"),
              label: "Authors",
            },
            {
              value: "BDT",
              label: "Local Currency",
            },
          ].map(({ value, label }) => (
            <div key={label} className="px-4 py-2">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {value}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURED BOOKS
      ══════════════════════════════════════════════════ */}
      <section
        id="featured-books"
        aria-labelledby="featured-heading"
        className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2
              id="featured-heading"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              Featured Books
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Handpicked titles from our growing catalogue
            </p>
          </div>
          <Link
            href="/books"
            className="shrink-0 text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            View all →
          </Link>
        </div>

        <BookGrid
          books={featuredBooks}
          emptyTitle="Catalogue coming soon"
          emptyMessage="We're adding books every day. Visit again shortly for new titles."
        />
      </section>

      {/* ══════════════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════════════ */}
      <section
        id="categories"
        aria-labelledby="categories-heading"
        className="border-y border-border/60 bg-muted/20"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2
                id="categories-heading"
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                Browse by Category
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Find exactly the kind of books you love
              </p>
            </div>
            <Link
              href="/categories"
              className="shrink-0 text-sm font-medium text-brand underline-offset-4 hover:underline"
            >
              All categories →
            </Link>
          </div>

          <CategoryList categories={categories} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          LATEST BOOKS (only shown when enough published books exist)
      ══════════════════════════════════════════════════ */}
      {showLatest && (
        <section
          id="latest-books"
          aria-labelledby="latest-heading"
          className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2
                id="latest-heading"
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                Latest Arrivals
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fresh titles added to the library
              </p>
            </div>
            <Link
              href="/books"
              className="shrink-0 text-sm font-medium text-brand underline-offset-4 hover:underline"
            >
              View all →
            </Link>
          </div>

          <BookGrid books={latestBooks} />
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          WHY BOIBAZAR — trust signals
      ══════════════════════════════════════════════════ */}
      <section
        aria-labelledby="why-heading"
        className="border-t border-border/60 bg-muted/10"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2
            id="why-heading"
            className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground"
          >
            Why read with us?
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "📚",
                title: "Curated Catalogue",
                desc: "Every book is reviewed for quality before publication.",
              },
              {
                icon: "💳",
                title: "Pay in BDT",
                desc: "Checkout via bKash, Nagad, Rocket, or card — no international fees.",
              },
              {
                icon: "☁️",
                title: "Read Anywhere",
                desc: "Your library is always with you, on any device.",
              },
              {
                icon: "✍️",
                title: "Support Local Authors",
                desc: "Authors earn meaningful royalties on every sale.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-card p-5"
              >
                <span className="text-2xl" role="img" aria-label={title}>
                  {icon}
                </span>
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════ */}
      <section
        id="cta-banner"
        aria-labelledby="cta-heading"
        className="border-t border-border/60 bg-foreground"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
          {user ? (
            <>
              <h2
                id="cta-heading"
                className="text-2xl font-bold text-background sm:text-3xl"
              >
                Ready to keep reading?
              </h2>
              <p className="max-w-md text-sm text-background/70">
                Welcome back, {user.name}. Your library is waiting.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Link
                  href="/books"
                  id="cta-browse-link"
                  className="flex h-11 items-center justify-center rounded-lg border-2 border-background/30 bg-background px-7 text-sm font-semibold text-foreground transition-all hover:bg-background/90"
                >
                  Browse Books
                </Link>
                <Link
                  href="/account"
                  id="cta-account-link"
                  className="flex h-11 items-center justify-center rounded-lg border border-background/30 px-7 text-sm font-semibold text-background/80 transition-colors hover:text-background"
                >
                  My Account →
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2
                id="cta-heading"
                className="text-2xl font-bold text-background sm:text-3xl"
              >
                Start reading today — it&apos;s free to join
              </h2>
              <p className="max-w-md text-sm text-background/70">
                Create your account and get instant access to previews, your
                personal library, and curated recommendations.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  id="cta-register-link"
                  className="flex h-11 items-center justify-center rounded-lg border-2 border-background/30 bg-background px-7 text-sm font-semibold text-foreground transition-all hover:bg-background/90"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/books"
                  id="cta-browse-link"
                  className="flex h-11 items-center justify-center rounded-lg border border-background/30 px-7 text-sm font-semibold text-background/80 transition-colors hover:text-background"
                >
                  Browse Books →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
