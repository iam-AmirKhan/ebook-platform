"use client";

/**
 * ChapterList — collapsible chapter accordion for the book details page.
 *
 * Security contract (maintained from server-side DAL):
 * - `chapter.content` is null for locked chapters when the user does not own
 *   the book. That stripping happens in src/lib/data/book-details.ts before
 *   this component ever receives props. This component never receives locked
 *   content; it only decides how to render what it was given.
 * - Locked chapters expose only: number, title, teaser, and an unlock message.
 * - No client-side blur or visibility trick is used as a security boundary.
 *
 * Typography scale (Bengali-friendly):
 * - Chapter count bar: 13px
 * - Chapter title (row): 18–19px
 * - Chapter teaser (collapsed): 15px, leading-[1.7]
 * - Teaser separator above content: 15px, leading-[1.7]
 * - Chapter content body: 18px, leading-[1.9]
 * - Lock message: 14px
 */

import { useState, useCallback } from "react";
import type { ChapterPreview } from "@/types/book-details";
import { ProtectedReader } from "@/components/books/ProtectedReader";

interface ChapterListProps {
  chapters: ChapterPreview[];
  isOwned: boolean;
  bookSlug?: string;
  readerInfo?: {
    name?: string | null;
    email?: string | null;
    id?: string | null;
  } | null;
}

export function ChapterList({
  chapters,
  isOwned,
  bookSlug,
  readerInfo,
}: ChapterListProps) {
  if (chapters.length === 0) return null;

  const previewCount = chapters.filter((ch) => ch.isPreview).length;
  const lockedCount = chapters.length - previewCount;

  return (
    <div className="flex flex-col gap-3">
      {/* Chapter count / availability bar — 13px metadata */}
      <p className="text-[0.8125rem] text-muted-foreground font-[family-name:var(--font-bengali)]">
        {chapters.length} টি অধ্যায়
        {previewCount > 0 && !isOwned && (
          <> &middot; {previewCount} টি বিনামূল্যে পড়া যাবে</>
        )}
        {lockedCount > 0 && !isOwned && (
          <> &middot; {lockedCount} টি লক করা</>
        )}
      </p>

      <ol className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
        {chapters.map((chapter) => (
          <ChapterItem
            key={chapter.order}
            chapter={chapter}
            isOwned={isOwned}
            bookSlug={bookSlug}
            readerInfo={readerInfo}
          />
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual chapter row — manages its own open/closed state & on-demand loading
// ---------------------------------------------------------------------------

interface ChapterItemProps {
  chapter: ChapterPreview;
  isOwned: boolean;
  bookSlug?: string;
  readerInfo?: {
    name?: string | null;
    email?: string | null;
    id?: string | null;
  } | null;
}

function ChapterItem({ chapter, isOwned, bookSlug, readerInfo }: ChapterItemProps) {
  const isUnlocked = chapter.isPreview || isOwned;
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(chapter.content);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchChapterContent = useCallback(async () => {
    if (!bookSlug || content || isLoading) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const res = await fetch(`/api/books/${bookSlug}/chapters/${chapter.order}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "অধ্যায়টি লোড করতে সমস্যা হয়েছে।");
      }

      setContent(data.content || "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "অধ্যায়টি লোড করতে সমস্যা হয়েছে।";
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [bookSlug, chapter.order, content, isLoading]);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && isUnlocked && !content && !chapter.isPreview) {
      fetchChapterContent();
    }
  };

  return (
    <li className="flex flex-col">
      {/* ── Header row ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:px-5"
      >
        {/* Chapter number — fixed-size circle badge */}
        <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[0.8125rem] font-semibold text-muted-foreground tabular-nums">
          {chapter.order}
        </span>

        {/* Chapter title — 18px, Bengali font */}
        <span
          className={[
            "flex-1 min-w-0 text-[1.125rem] font-semibold leading-snug",
            "font-[family-name:var(--font-bengali)]",
            isUnlocked ? "text-foreground" : "text-muted-foreground",
          ].join(" ")}
        >
          {chapter.title}
        </span>

        {/* Right-side badge + chevron */}
        <span className="shrink-0 flex items-center gap-2 ml-2">
          {chapter.isPreview && (
            <span className="hidden xs:inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand sm:inline-flex">
              বিনামূল্যে
            </span>
          )}
          {!chapter.isPreview && isOwned && (
            <span className="text-muted-foreground" aria-label="Unlocked">
              <UnlockIcon />
            </span>
          )}
          {!chapter.isPreview && !isOwned && (
            <span className="text-muted-foreground/50" aria-label="Locked">
              <LockIcon />
            </span>
          )}
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* ── Collapsed teaser ──────────────────────────────────── */}
      {/* Show when closed; 15px, leading-[1.7] */}
      {!open && chapter.teaser && (
        <p
          className={[
            "px-4 pb-4 pt-0 text-[0.9375rem] leading-[1.7] text-muted-foreground sm:px-5",
            "font-[family-name:var(--font-bengali)]",
          ].join(" ")}
        >
          {chapter.teaser}
        </p>
      )}

      {/* ── Expanded panel ────────────────────────────────────── */}
      {open && (
        <div className="border-t border-border/40">
          {isUnlocked ? (
            /* Unlocked chapter: preview or owned */
            <div className="bg-muted/20 p-2 sm:p-4">
              {content ? (
                <ProtectedReader
                  content={content}
                  chapterTitle={chapter.title}
                  chapterOrder={chapter.order}
                  teaser={chapter.teaser}
                  isPreview={chapter.isPreview}
                  readerInfo={readerInfo}
                />
              ) : isLoading ? (
                <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-brand font-[family-name:var(--font-bengali)]">
                    <span className="size-2 rounded-full bg-brand animate-ping" />
                    <span>সুরক্ষিত সংযোগের মাধ্যমে অধ্যায়টি লোড হচ্ছে...</span>
                  </div>
                  <div className="h-4 w-3/4 rounded bg-muted/60 animate-pulse" />
                  <div className="h-4 w-full rounded bg-muted/40 animate-pulse" />
                  <div className="h-4 w-4/5 rounded bg-muted/40 animate-pulse" />
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                  <p className="font-semibold">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => fetchChapterContent()}
                    className="inline-flex items-center gap-1 rounded bg-destructive/10 px-3 py-1 font-medium hover:bg-destructive/20"
                  >
                    পুনরায় চেষ্টা করুন
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            /* Locked: teaser + purchase callout — full content never passed in */
            <div className="bg-muted/10 px-4 py-5 flex flex-col gap-3 sm:px-6">
              {chapter.teaser && (
                <p
                  className={[
                    "text-[0.9375rem] leading-[1.7] text-muted-foreground",
                    "font-[family-name:var(--font-bengali)]",
                  ].join(" ")}
                >
                  {chapter.teaser}
                </p>
              )}
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-4 py-3.5">
                <LockIcon />
                <p
                  className={[
                    "text-[0.875rem] text-muted-foreground",
                    "font-[family-name:var(--font-bengali)]",
                  ].join(" ")}
                >
                  এই অধ্যায়টি পড়তে বইটি কিনতে হবে।
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function LockIcon() {
  return (
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
      className="shrink-0"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon() {
  return (
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
      className="shrink-0"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-muted-foreground/60 transition-transform duration-200 ${
        open ? "rotate-180" : "rotate-0"
      }`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
