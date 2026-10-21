"use client";

/**
 * SlowRevealQuote — Compact, horizontally moving quote strip for Pustoka's homepage.
 *
 * Displays Pustoka's literary philosophy:
 * “লেখকদের বই পড়ার অভ্যাস আর পাঠকদের বই লেখার চেষ্টা—দুটোই গুরুত্বপূর্ণ।”
 * — Pustoka
 *
 * Features:
 * - Slim ribbon layout (substantially reduced height, ~46px tall).
 * - Smooth, continuous, CSS-based horizontal marquee.
 * - Seamless -50% keyframe loop with zero visual jumps.
 * - Pauses gracefully on hover and keyboard focus for effortless reading.
 * - Accessible to screen readers: primary quote is read once, visual duplicates are aria-hidden.
 * - Respects prefers-reduced-motion: stops motion and centers the quote statically.
 * - Left and right edge gradient fade masks prevent abrupt text clipping.
 * - Warm paper background, authentic Bengali typography, and dark ink contrast.
 */

function QuoteItem({ isPrimary = false }: { isPrimary?: boolean }) {
  if (isPrimary) {
    return (
      <blockquote
        cite="https://pustoka.com"
        className="inline-flex shrink-0 items-center gap-3 px-6 sm:px-10 font-[family-name:var(--font-bengali)]"
      >
        <span
          className="select-none text-xs text-brand/60 dark:text-brand/70"
          aria-hidden="true"
        >
          ✦
        </span>
        <span className="text-sm sm:text-base font-medium text-[#1C1917] dark:text-[#F5EFE6] tracking-normal leading-[1.8] whitespace-nowrap">
          “লেখকদের বই পড়ার অভ্যাস আর পাঠকদের বই লেখার চেষ্টা—দুটোই গুরুত্বপূর্ণ।”
        </span>
        <cite className="not-italic text-xs sm:text-sm font-semibold tracking-wider text-brand dark:text-brand whitespace-nowrap">
          — Pustoka
        </cite>
      </blockquote>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="quote-marquee-item-duplicate inline-flex shrink-0 items-center gap-3 px-6 sm:px-10 font-[family-name:var(--font-bengali)] select-none"
    >
      <span className="text-xs text-brand/60 dark:text-brand/70">
        ✦
      </span>
      <span className="text-sm sm:text-base font-medium text-[#1C1917] dark:text-[#F5EFE6] tracking-normal leading-[1.8] whitespace-nowrap">
        “লেখকদের বই পড়ার অভ্যাস আর পাঠকদের বই লেখার চেষ্টা—দুটোই গুরুত্বপূর্ণ।”
      </span>
      <span className="text-xs sm:text-sm font-semibold tracking-wider text-brand dark:text-brand whitespace-nowrap">
        — Pustoka
      </span>
    </div>
  );
}

export function SlowRevealQuote() {
  return (
    <section
      id="literary-quote"
      aria-label="Pustoka সাহিত্য চিন্তা ও মূলবাণী"
      className="slow-reveal-paper-bg relative w-full overflow-hidden border-y border-[#EBE3D5] dark:border-[#27231E] py-2.5 sm:py-3 select-none sm:select-text"
    >
      {/* Left and right fade gradient masks for smooth entry and exit */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-24 bg-gradient-to-r from-[#FAF7F2] dark:from-[#151311] to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-24 bg-gradient-to-l from-[#FAF7F2] dark:from-[#151311] to-transparent"
        aria-hidden="true"
      />

      <div className="quote-marquee-track flex items-center">
        {/* Track 1: includes the semantic primary quote + duplicates */}
        <div className="flex shrink-0 items-center">
          <QuoteItem isPrimary={true} />
          <QuoteItem />
          <QuoteItem />
        </div>

        {/* Track 2: visual duplicate for seamless CSS looping */}
        <div
          className="quote-marquee-duplicate flex shrink-0 items-center"
          aria-hidden="true"
        >
          <QuoteItem />
          <QuoteItem />
          <QuoteItem />
        </div>
      </div>
    </section>
  );
}
