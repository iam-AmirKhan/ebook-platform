import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "BoiBazar — Bangladesh's Digital Book Marketplace",
  description:
    "Discover and read ebooks from Bangladeshi and international authors. Your digital library, always with you.",
};

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        id="hero"
        aria-labelledby="hero-heading"
        className="relative flex flex-col items-center justify-center overflow-hidden border-b border-border/60 bg-gradient-to-b from-muted/60 to-background px-4 py-24 text-center md:py-36"
      >
        {/* Decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-brand">
            Bangladesh&apos;s Digital Library
          </span>

          <h1
            id="hero-heading"
            className="mt-2 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl"
          >
            Read the books that{" "}
            <span className="text-brand">move you</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Discover thousands of Bangla and English ebooks. Support independent
            authors. Build your personal digital library — one page at a time.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/books"
              id="hero-browse-cta"
              className="flex h-11 items-center justify-center rounded-lg bg-foreground px-7 text-sm font-semibold text-background transition-all hover:bg-foreground/85 hover:shadow-lg"
            >
              Browse Books
            </Link>
            {!user && (
              <Link
                href="/register"
                id="hero-register-cta"
                className="flex h-11 items-center justify-center rounded-lg border border-border px-7 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Create Free Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────── */}
      <section
        aria-label="Platform statistics"
        className="border-b border-border/60 bg-muted/20"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-border/60 px-4 py-8 text-center">
          {[
            { value: "1,000+", label: "Ebooks" },
            { value: "200+", label: "Authors" },
            { value: "BDT", label: "Local Currency" },
          ].map(({ value, label }) => (
            <div key={label} className="px-4 py-2">
              <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured books placeholder ───────────────────── */}
      <section
        id="featured-books"
        aria-labelledby="featured-heading"
        className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mb-8 flex items-end justify-between">
          <h2
            id="featured-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Featured Books
          </h2>
          <Link
            href="/books"
            className="text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            View all →
          </Link>
        </div>

        {/* Book card skeleton grid — populated in Phase 3B */}
        <div
          aria-busy="true"
          aria-label="Loading featured books"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 animate-pulse"
            >
              <div className="aspect-[3/4] w-full rounded-lg bg-muted" />
              <div className="h-3.5 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="mt-1 h-3.5 w-1/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories placeholder ───────────────────────── */}
      <section
        id="categories"
        aria-labelledby="categories-heading"
        className="border-t border-border/60 bg-muted/20"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <h2
              id="categories-heading"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              Browse by Category
            </h2>
            <Link
              href="/categories"
              className="text-sm font-medium text-brand underline-offset-4 hover:underline"
            >
              All categories →
            </Link>
          </div>

          {/* Category pill skeletons — populated in Phase 3B */}
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{ width: `${80 + (i % 4) * 20}px` }}
                className="h-9 animate-pulse rounded-full bg-muted"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────── */}
      {!user && (
        <section
          id="cta-banner"
          aria-labelledby="cta-heading"
          className="bg-foreground"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
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
            <Link
              href="/register"
              id="cta-register-link"
              className="flex h-11 items-center justify-center rounded-lg border-2 border-background/30 bg-background px-8 text-sm font-semibold text-foreground transition-all hover:bg-background/90"
            >
              Create Free Account
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
