"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type AdminBookItem,
  type AdminBookCounts,
} from "@/lib/data/admin-books";
import {
  adminPublishBook,
  adminUnpublishBook,
  adminArchiveBook,
} from "@/actions/admin-books";
import { BookStatusBadge } from "@/components/author/BookStatusBadge";
import { Pagination } from "@/components/books/Pagination";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  BookOpen,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  EyeOff,
  Archive,
} from "lucide-react";

interface AdminBooksListProps {
  books: AdminBookItem[];
  counts: AdminBookCounts;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  activeFilter: string;
  searchQuery: string;
}

type ModerationActionType = "PUBLISH" | "UNPUBLISH" | "ARCHIVE";

interface PendingAction {
  type: ModerationActionType;
  book: AdminBookItem;
}

interface ActionFeedback {
  type: "success" | "error";
  message: string;
}

const TABS = [
  { id: "ALL", label: "সব বই", countKey: "all" as const },
  { id: "PUBLISHED", label: "প্রকাশিত", countKey: "published" as const },
  { id: "DRAFT", label: "ড্রাফট", countKey: "draft" as const },
  { id: "ARCHIVED", label: "সংরক্ষিত", countKey: "archived" as const },
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function AdminBooksList({
  books,
  counts,
  totalCount,
  totalPages,
  currentPage,
  activeFilter,
  searchQuery,
}: AdminBooksListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  const handleTabChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = searchInput.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;

    const { type, book } = pendingAction;
    setFeedback(null);

    startTransition(async () => {
      let res;
      if (type === "PUBLISH") {
        res = await adminPublishBook(book._id);
      } else if (type === "UNPUBLISH") {
        res = await adminUnpublishBook(book._id);
      } else {
        res = await adminArchiveBook(book._id);
      }

      if (res.success) {
        const messages: Record<ModerationActionType, string> = {
          PUBLISH: `"${book.title}" বইটি সফলভাবে প্রকাশিত হয়েছে।`,
          UNPUBLISH: `"${book.title}" বইটি প্রত্যাহার করে ড্রাফট করা হয়েছে।`,
          ARCHIVE: `"${book.title}" বইটি সংরক্ষণাগারে পাঠানো হয়েছে।`,
        };
        setFeedback({ type: "success", message: messages[type] });
        setPendingAction(null);
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "কার্যক্রম সম্পন্ন করতে সমস্যা হয়েছে।",
        });
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-medium font-[family-name:var(--font-bengali)] ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline-offset-4 hover:underline"
            aria-label="বার্তা বন্ধ করুন"
          >
            ✕
          </button>
        </div>
      )}

      {/* Controls Bar: Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-1">
          {TABS.map((tab) => {
            const isActive =
              activeFilter === tab.id || (!activeFilter && tab.id === "ALL");
            const count = counts[tab.countKey];

            return (
              <button
                key={tab.id}
                id={`filter-tab-${tab.id.toLowerCase()}`}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all font-[family-name:var(--font-bengali)] ${
                  isActive
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? "bg-brand/10 text-brand"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex items-center w-full sm:w-72"
        >
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="বইয়ের শিরোনাম খুঁজুন..."
            className="h-9 w-full rounded-xl border border-border/60 bg-card pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="অনুসন্ধান মুছুন"
            >
              <X className="size-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Search Result Feedback */}
      {searchQuery && (
        <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
          &ldquo;{searchQuery}&rdquo; অনুসন্ধানের ফলাফল: <strong>{totalCount}</strong>টি বই পাওয়া গেছে।
        </p>
      )}

      {/* Books Content */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card px-6 py-16 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60">
            <BookOpen className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
            কোনো বই পাওয়া যায়নি
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            {searchQuery
              ? `"${searchQuery}" অনুসন্ধানের জন্য কোনো বই পাওয়া যায়নি।`
              : activeFilter !== "ALL"
              ? "এই ফিল্টারের আওতায় বর্তমানে কোনো বই নেই।"
              : "প্ল্যাটফর্মে এখনো কোনো বই তৈরি করা হয়নি।"}
          </p>
          {(searchQuery || activeFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchInput("");
                router.push(pathname);
              }}
              className="mt-4 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted font-[family-name:var(--font-bengali)]"
            >
              সব ফিল্টার মুছুন
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/20 text-muted-foreground font-[family-name:var(--font-bengali)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">বই</th>
                  <th className="px-4 py-3 font-semibold">লেখক</th>
                  <th className="px-4 py-3 font-semibold">ক্যাটাগরি</th>
                  <th className="px-4 py-3 font-semibold">মূল্য</th>
                  <th className="px-4 py-3 font-semibold">স্ট্যাটাস</th>
                  <th className="px-4 py-3 font-semibold">তৈরির তারিখ</th>
                  <th className="px-4 py-3 font-semibold text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-foreground">
                {books.map((book) => (
                  <tr
                    key={book._id}
                    className="transition-colors hover:bg-muted/10"
                  >
                    {/* Book Cover + Title */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-border/50 bg-muted">
                          {book.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={book.coverImage}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40">
                              <BookOpen className="size-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium text-foreground font-[family-name:var(--font-bengali)]">
                            <span className="truncate">{book.title}</span>
                            {book.status === "PUBLISHED" && (
                              <Link
                                href={`/books/${book.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-brand"
                                title="পাবলিক পেজে দেখুন"
                              >
                                <ExternalLink className="size-3" />
                              </Link>
                            )}
                          </div>
                          <span className="block text-[11px] text-muted-foreground">
                            <code>{book.slug}</code>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Author */}
                    <td className="px-4 py-3.5 font-[family-name:var(--font-bengali)]">
                      <span className="font-medium">{book.authorName}</span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 font-[family-name:var(--font-bengali)]">
                      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {book.categoryName}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3.5">
                      {book.discountPrice ? (
                        <div className="flex flex-col text-[11px]">
                          <span className="font-semibold text-brand">
                            ৳ {book.discountPrice}
                          </span>
                          <span className="line-through text-muted-foreground">
                            ৳ {book.price}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold">৳ {book.price}</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <BookStatusBadge status={book.status} />
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3.5 text-muted-foreground font-[family-name:var(--font-bengali)]">
                      {formatDate(book.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/books/${book._id}/edit`}
                          id={`edit-book-${book._id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-brand font-[family-name:var(--font-bengali)]"
                        >
                          <Edit3 className="size-3" />
                          সম্পাদনা
                        </Link>

                        {book.status === "DRAFT" && (
                          <>
                            <button
                              type="button"
                              id={`publish-btn-${book._id}`}
                              onClick={() => setPendingAction({ type: "PUBLISH", book })}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                              title="বইটি প্রকাশ করুন"
                            >
                              <Upload className="size-3" />
                              প্রকাশ
                            </button>
                            <button
                              type="button"
                              id={`archive-btn-${book._id}`}
                              onClick={() => setPendingAction({ type: "ARCHIVE", book })}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                              title="সংরক্ষণাগারে পাঠান"
                            >
                              <Archive className="size-3" />
                              সংরক্ষণ
                            </button>
                          </>
                        )}

                        {book.status === "PUBLISHED" && (
                          <>
                            <button
                              type="button"
                              id={`unpublish-btn-${book._id}`}
                              onClick={() => setPendingAction({ type: "UNPUBLISH", book })}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                              title="বইটি প্রত্যাহার করে ড্রাফট করুন"
                            >
                              <EyeOff className="size-3" />
                              প্রত্যাহার
                            </button>
                            <button
                              type="button"
                              id={`archive-btn-${book._id}`}
                              onClick={() => setPendingAction({ type: "ARCHIVE", book })}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                              title="সংরক্ষণাগারে পাঠান"
                            >
                              <Archive className="size-3" />
                              সংরক্ষণ
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {books.map((book) => (
              <div
                key={book._id}
                className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-2xs"
              >
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-border/50 bg-muted">
                  {book.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40">
                      <BookOpen className="size-4" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-foreground text-xs leading-snug line-clamp-2 font-[family-name:var(--font-bengali)]">
                        {book.title}
                      </h4>
                      <BookStatusBadge status={book.status} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
                      লেখক: {book.authorName}
                    </p>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between border-t border-border/40 pt-2 gap-2 text-[11px]">
                    <span className="text-muted-foreground font-[family-name:var(--font-bengali)]">
                      {book.categoryName} &bull; <strong className="text-brand font-semibold">৳ {book.discountPrice ?? book.price}</strong>
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/admin/books/${book._id}/edit`}
                        id={`mobile-edit-book-${book._id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted font-[family-name:var(--font-bengali)]"
                      >
                        <Edit3 className="size-3" />
                        সম্পাদনা
                      </Link>

                      {book.status === "DRAFT" && (
                        <>
                          <button
                            type="button"
                            id={`mobile-publish-btn-${book._id}`}
                            onClick={() => setPendingAction({ type: "PUBLISH", book })}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand hover:bg-brand/20 disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                          >
                            <Upload className="size-3" />
                            প্রকাশ
                          </button>
                          <button
                            type="button"
                            id={`mobile-archive-btn-${book._id}`}
                            onClick={() => setPendingAction({ type: "ARCHIVE", book })}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-xs font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                            title="সংরক্ষণাগারে পাঠান"
                          >
                            <Archive className="size-3" />
                          </button>
                        </>
                      )}

                      {book.status === "PUBLISHED" && (
                        <>
                          <button
                            type="button"
                            id={`mobile-unpublish-btn-${book._id}`}
                            onClick={() => setPendingAction({ type: "UNPUBLISH", book })}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                          >
                            <EyeOff className="size-3" />
                            প্রত্যাহার
                          </button>
                          <button
                            type="button"
                            id={`mobile-archive-btn-${book._id}`}
                            onClick={() => setPendingAction({ type: "ARCHIVE", book })}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-xs font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                            title="সংরক্ষণাগারে পাঠান"
                          >
                            <Archive className="size-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                searchParams={{
                  ...(activeFilter !== "ALL" ? { status: activeFilter } : {}),
                  ...(searchQuery ? { q: searchQuery } : {}),
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Moderation Confirmation Dialog */}
      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) {
              setPendingAction(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3
              id="moderation-dialog-title"
              className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]"
            >
              {pendingAction.type === "PUBLISH" && "বই প্রকাশ নিশ্চিত করুন"}
              {pendingAction.type === "UNPUBLISH" && "বই প্রত্যাহার নিশ্চিত করুন"}
              {pendingAction.type === "ARCHIVE" && "বই সংরক্ষণাগারে পাঠানো নিশ্চিত করুন"}
            </h3>

            <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
              {pendingAction.type === "PUBLISH" && (
                <>
                  আপনি কি <strong>&ldquo;{pendingAction.book.title}&rdquo;</strong> বইটি প্রকাশ করতে চান? এটি সাথে সাথে পাবলিক ক্যাটালগে সবার জন্য দৃশ্যমান হবে।
                </>
              )}
              {pendingAction.type === "UNPUBLISH" && (
                <>
                  আপনি কি <strong>&ldquo;{pendingAction.book.title}&rdquo;</strong> বইটি প্রত্যাহার করতে চান? এটি পাবলিক ক্যাটালগ থেকে সরিয়ে ড্রাফটে ফেরত নেওয়া হবে।
                </>
              )}
              {pendingAction.type === "ARCHIVE" && (
                <>
                  আপনি কি <strong>&ldquo;{pendingAction.book.title}&rdquo;</strong> বইটি সংরক্ষণাগারে পাঠাতে চান? এটি পাবলিক থেকে সরিয়ে নেওয়া হবে।
                </>
              )}
            </p>

            {pendingAction.type === "PUBLISH" && (
              <div className="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs text-foreground/80 font-[family-name:var(--font-bengali)]">
                ✓ বইটি প্রকাশিত অবস্থায় পাঠকরা দেখতে ও পড়তে পারবেন।
                <br />
                ✓ প্রথমবার প্রকাশের ক্ষেত্রে লেখক নিশ্চিতকরণ ইমেইল পাবেন।
              </div>
            )}

            {pendingAction.type === "UNPUBLISH" && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300 font-[family-name:var(--font-bengali)]">
                ⚠️ বইটি পাবলিক ক্যাটালগে আর দেখা যাবে না। এটি ড্রাফট তালিকায় থাকবে।
              </div>
            )}

            {pendingAction.type === "ARCHIVE" && (
              <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                ⚠️ বইটি সংরক্ষণাগারে পাঠানো হবে।
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setPendingAction(null)}
                className="font-[family-name:var(--font-bengali)]"
              >
                বাতিল
              </Button>

              {pendingAction.type === "PUBLISH" && (
                <Button
                  id={`confirm-publish-btn-${pendingAction.book._id}`}
                  size="sm"
                  disabled={isPending}
                  onClick={handleConfirmAction}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 font-[family-name:var(--font-bengali)]"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  হ্যাঁ, প্রকাশ করুন
                </Button>
              )}

              {pendingAction.type === "UNPUBLISH" && (
                <Button
                  id={`confirm-unpublish-btn-${pendingAction.book._id}`}
                  size="sm"
                  disabled={isPending}
                  onClick={handleConfirmAction}
                  className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 font-[family-name:var(--font-bengali)]"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  হ্যাঁ, প্রত্যাহার করুন
                </Button>
              )}

              {pendingAction.type === "ARCHIVE" && (
                <Button
                  id={`confirm-archive-btn-${pendingAction.book._id}`}
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={handleConfirmAction}
                  className="font-[family-name:var(--font-bengali)]"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  সংরক্ষণাগারে পাঠান
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
