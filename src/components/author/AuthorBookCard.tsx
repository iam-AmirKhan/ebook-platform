"use client";

import Link from "next/link";
import { useTransition } from "react";
import { BookStatusBadge } from "@/components/author/BookStatusBadge";
import { publishBook, archiveBook, unpublishBook } from "@/actions/books";
import type { AuthorBookListItem } from "@/types/author";

interface AuthorBookCardProps {
  book: AuthorBookListItem;
}

export function AuthorBookCard({ book }: AuthorBookCardProps) {
  const [isPending, startTransition] = useTransition();

  const hue =
    book.title.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  function handlePublish() {
    startTransition(async () => {
      const result = await publishBook(book._id);
      if (!result.success) {
        alert(result.error ?? "প্রকাশে সমস্যা হয়েছে");
      }
    });
  }

  function handleUnpublish() {
    if (!confirm("বইটি প্রত্যাহার করবেন? এটি পাবলিক ক্যাটালগ থেকে সরিয়ে নেওয়া হবে।"))
      return;
    startTransition(async () => {
      const result = await unpublishBook(book._id);
      if (!result.success) {
        alert(result.error ?? "প্রত্যাহারে সমস্যা হয়েছে");
      }
    });
  }

  function handleArchive() {
    if (!confirm("বইটি সংরক্ষণাগারে পাঠাবেন? এটি পাবলিক থেকে সরিয়ে নেওয়া হবে।"))
      return;
    startTransition(async () => {
      const result = await archiveBook(book._id);
      if (!result.success) {
        alert(result.error ?? "সংরক্ষণাগারে পাঠাতে সমস্যা হয়েছে");
      }
    });
  }

  const updatedDate = new Date(book.updatedAt).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 transition-opacity sm:flex-row sm:items-start sm:gap-5 ${
        isPending ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      {/* Cover thumbnail */}
      <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted sm:h-32 sm:w-24">
        {book.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `oklch(0.92 0.04 ${hue})` }}
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
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
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-start gap-2">
          <BookStatusBadge status={book.status} />
          <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            {book.categoryName}
          </span>
        </div>

        <h3 className="text-base font-semibold leading-snug text-foreground font-[family-name:var(--font-bengali)]">
          {book.title}
        </h3>

        <p className="text-xs text-muted-foreground">
          <span className="font-[family-name:var(--font-bengali)]">সর্বশেষ আপডেট:</span>{" "}
          <span className="font-[family-name:var(--font-bengali)]">{updatedDate}</span>
        </p>

        <p className="text-sm font-semibold text-foreground">
          ৳ {book.price.toLocaleString("bn-BD")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <Link
          href={`/author/books/${book._id}/edit`}
          className="flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground font-[family-name:var(--font-bengali)]"
        >
          সম্পাদনা
        </Link>

        {book.status === "PUBLISHED" && (
          <Link
            href={`/books/${book.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground font-[family-name:var(--font-bengali)]"
          >
            দেখুন ↗
          </Link>
        )}

        {book.status === "DRAFT" && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPending}
            className="flex h-8 items-center rounded-md bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-50 font-[family-name:var(--font-bengali)]"
          >
            প্রকাশ করুন
          </button>
        )}

        {book.status === "PUBLISHED" && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isPending}
            className="flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 font-[family-name:var(--font-bengali)]"
          >
            প্রত্যাহার
          </button>
        )}

        {book.status !== "ARCHIVED" && (
          <button
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            className="flex h-8 items-center rounded-md px-3 text-xs font-medium text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 font-[family-name:var(--font-bengali)]"
          >
            সরিয়ে দিন
          </button>
        )}
      </div>
    </div>
  );
}
