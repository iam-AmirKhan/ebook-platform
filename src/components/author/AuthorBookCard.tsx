"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { BookStatusBadge } from "@/components/author/BookStatusBadge";
import { submitBookForReview, archiveBook, unpublishBook } from "@/actions/books";
import { toast } from "@/components/ui/toast";
import type { AuthorBookListItem } from "@/types/author";
import { BookCoverImage } from "@/components/books/BookCoverImage";

interface AuthorBookCardProps {
  book: AuthorBookListItem;
}

export function AuthorBookCard({ book }: AuthorBookCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmitForReview() {
    startTransition(async () => {
      const result = await submitBookForReview(book._id);
      if (result.success) {
        toast.success(`"${book.title}" বইটি রিভিউয়ের জন্য জমা দেওয়া হয়েছে`);
        router.refresh();
      } else {
        toast.error(result.error ?? "রিভিউয়ের জন্য জমা দিতে সমস্যা হয়েছে");
      }
    });
  }

  function handleUnpublish() {
    if (!confirm("বইটি প্রত্যাহার করবেন? এটি পাবলিক ক্যাটালগ থেকে সরিয়ে ড্রাফটে ফেরত নেওয়া হবে।"))
      return;
    startTransition(async () => {
      const result = await unpublishBook(book._id);
      if (result.success) {
        toast.success(`"${book.title}" বইটি প্রত্যাহার করা হয়েছে`);
        router.refresh();
      } else {
        toast.error(result.error ?? "প্রত্যাহারে সমস্যা হয়েছে");
      }
    });
  }

  function handleArchive() {
    if (!confirm("বইটি সংরক্ষণাগারে পাঠাবেন? এটি পাবলিক থেকে সরিয়ে নেওয়া হবে।"))
      return;
    startTransition(async () => {
      const result = await archiveBook(book._id);
      if (result.success) {
        toast.success(`"${book.title}" বইটি সংরক্ষণাগারে পাঠানো হয়েছে`);
        router.refresh();
      } else {
        toast.error(result.error ?? "সংরক্ষণাগারে পাঠাতে সমস্যা হয়েছে");
      }
    });
  }

  const updatedDate =
    book.updatedAt && !isNaN(new Date(book.updatedAt).getTime())
      ? new Date(book.updatedAt).toLocaleDateString("bn-BD", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "সম্প্রতি";

  const formattedPrice = (
    typeof book.price === "number" ? book.price : 0
  ).toLocaleString("bn-BD");

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 transition-opacity sm:flex-row sm:items-start sm:gap-5 ${
        isPending ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      {/* Cover thumbnail */}
      <div className="w-20 sm:w-24 shrink-0 overflow-hidden rounded-lg border border-border/40 shadow-xs">
        <BookCoverImage
          key={book.coverImage ?? book._id}
          src={book.coverImage}
          title={book.title}
          aspectRatio="aspect-[2/3]"
        />
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
          ৳ {formattedPrice}
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
            onClick={handleSubmitForReview}
            disabled={isPending}
            className="flex h-8 items-center gap-1.5 rounded-md bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50 font-[family-name:var(--font-bengali)] cursor-pointer"
          >
            {isPending && <Loader2 className="size-3 animate-spin" />}
            রিভিউয়ের জন্য জমা দিন
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
