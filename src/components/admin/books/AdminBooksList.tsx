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
  adminSaveFeaturedBooks,
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
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  GripVertical,
  RotateCcw,
  Save,
  Star,
  Plus,
  Trash2,
} from "lucide-react";

interface AdminBooksListProps {
  books: AdminBookItem[];
  counts: AdminBookCounts;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  activeFilter: string;
  searchQuery: string;
  publishedBooksForReorder?: AdminBookItem[];
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
  publishedBooksForReorder = [],
}: AdminBooksListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setSearchInput(searchQuery);
  }

  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // ── Featured Books State & Reorder Mode ───────────────────────────────────
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [featuredBooks, setFeaturedBooks] = useState<AdminBookItem[]>(() =>
    (publishedBooksForReorder || []).filter((b) => b.displayOrder <= 8)
  );
  const [addSearch, setAddSearch] = useState("");

  const [prevPublished, setPrevPublished] = useState(publishedBooksForReorder);
  if (publishedBooksForReorder !== prevPublished) {
    setPrevPublished(publishedBooksForReorder);
    setFeaturedBooks(
      (publishedBooksForReorder || []).filter((b) => b.displayOrder <= 8)
    );
  }

  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const initialFeaturedIds = (publishedBooksForReorder || [])
    .filter((b) => b.displayOrder <= 8)
    .map((b) => b._id)
    .join(",");
  const currentFeaturedIds = featuredBooks.map((b) => b._id).join(",");
  const hasUnsavedReorder = initialFeaturedIds !== currentFeaturedIds;

  // Available published books not yet in featured list
  const availableBooksToAdd = (publishedBooksForReorder || []).filter(
    (b) => !featuredBooks.some((f) => f._id === b._id)
  );

  const filteredAvailableBooks = availableBooksToAdd.filter((b) => {
    if (!addSearch.trim()) return true;
    const q = addSearch.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.authorName.toLowerCase().includes(q) ||
      b.categoryName.toLowerCase().includes(q)
    );
  });

  // Move book by delta (-1 for up, +1 for down)
  const handleMoveBook = (index: number, delta: number) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= featuredBooks.length) return;
    const nextList = [...featuredBooks];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);
    setFeaturedBooks(nextList);
  };

  // Move book directly to top or bottom
  const handleMoveToEdge = (index: number, edge: "top" | "bottom") => {
    if (edge === "top" && index === 0) return;
    if (edge === "bottom" && index === featuredBooks.length - 1) return;
    const nextList = [...featuredBooks];
    const [moved] = nextList.splice(index, 1);
    if (edge === "top") {
      nextList.unshift(moved);
    } else {
      nextList.push(moved);
    }
    setFeaturedBooks(nextList);
  };

  // Move book to explicit 1-based rank
  const handleRankInputChange = (index: number, newRankStr: string) => {
    const rank = parseInt(newRankStr, 10);
    if (isNaN(rank)) return;
    const clampedIndex = Math.max(0, Math.min(featuredBooks.length - 1, rank - 1));
    if (clampedIndex === index) return;
    const nextList = [...featuredBooks];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(clampedIndex, 0, moved);
    setFeaturedBooks(nextList);
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const nextList = [...featuredBooks];
    const [moved] = nextList.splice(draggedIndex, 1);
    nextList.splice(targetIndex, 0, moved);
    setFeaturedBooks(nextList);
    setDraggedIndex(null);
  };

  // Add a book to the featured list (max 8)
  const handleAddFeatured = (book: AdminBookItem) => {
    if (featuredBooks.length >= 8) {
      setFeedback({
        type: "error",
        message: "হোমপেজে সর্বোচ্চ ৮টি বই ফিচার্ড হিসেবে নির্বাচন করা সম্ভব।",
      });
      return;
    }
    if (featuredBooks.some((b) => b._id === book._id)) {
      return;
    }
    setFeaturedBooks([...featuredBooks, book]);
  };

  // Remove a book from featured list
  const handleRemoveFeatured = (bookId: string) => {
    setFeaturedBooks(featuredBooks.filter((b) => b._id !== bookId));
  };

  // Save featured selection to MongoDB via server action
  const handleSaveReorder = async () => {
    setIsSavingOrder(true);
    setFeedback(null);

    try {
      const bookIds = featuredBooks.map((b) => b._id);
      const res = await adminSaveFeaturedBooks(bookIds);
      if (res.success) {
        setFeedback({
          type: "success",
          message: "হোমপেজের ফিচার্ড বইয়ের তালিকা সফলভাবে সংরক্ষিত হয়েছে।",
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "ফিচার্ড বই সংরক্ষণ করতে সমস্যা হয়েছে।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "নেটওয়ার্ক ত্রুটি, অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Reset local state to initial server sequence
  const handleResetReorder = () => {
    const orig = (publishedBooksForReorder || []).filter((b) => b.displayOrder <= 8);
    setFeaturedBooks(orig);
    setFeedback(null);
  };

  // Quick toggle featured directly from table/mobile card view
  const handleQuickToggleFeatured = async (book: AdminBookItem) => {
    const isCurrentlyFeatured = featuredBooks.some((b) => b._id === book._id);
    let nextList: AdminBookItem[];
    if (isCurrentlyFeatured) {
      nextList = featuredBooks.filter((b) => b._id !== book._id);
    } else {
      if (featuredBooks.length >= 8) {
        setFeedback({
          type: "error",
          message: "হোমপেজে সর্বোচ্চ ৮টি বই ফিচার্ড করা সম্ভব। নতুন বই যোগ করতে পূর্বের কোনো বই সরান।",
        });
        return;
      }
      nextList = [...featuredBooks, book];
    }

    setFeaturedBooks(nextList);
    setIsSavingOrder(true);
    try {
      const res = await adminSaveFeaturedBooks(nextList.map((b) => b._id));
      if (res.success) {
        setFeedback({
          type: "success",
          message: isCurrentlyFeatured
            ? `"${book.title}" ফিচার্ড তালিকা থেকে সরানো হয়েছে।`
            : `"${book.title}" হোমপেজে ফিচার্ড করা হয়েছে।`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "পরিবর্তন সংরক্ষণ করতে ব্যর্থ হয়েছে।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "নেটওয়ার্ক ত্রুটি, অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleTabChange = (status: string) => {
    setFeedback(null);
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
    setFeedback(null);
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
    setFeedback(null);
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

      {/* Controls Bar: Tabs, Search & Reorder Toggle */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-1">
            {TABS.map((tab) => {
              const isActive =
                !isReorderMode &&
                (activeFilter === tab.id || (!activeFilter && tab.id === "ALL"));
              const count = counts[tab.countKey];

              return (
                <button
                  key={tab.id}
                  id={`filter-tab-${tab.id.toLowerCase()}`}
                  onClick={() => {
                    setIsReorderMode(false);
                    handleTabChange(tab.id);
                  }}
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

          {/* Action Row: Reorder Mode Toggle + Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="toggle-reorder-mode-btn"
              onClick={() => {
                setIsReorderMode((prev) => !prev);
                setFeedback(null);
              }}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all font-[family-name:var(--font-bengali)] ${
                isReorderMode
                  ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                  : "border-border/60 bg-card text-foreground hover:bg-muted hover:border-amber-400"
              }`}
            >
              <Star className={`size-3.5 ${isReorderMode ? "fill-white text-white" : "fill-amber-400 text-amber-500"}`} />
              <span>হোমপেজ ফিচার্ড বই ({featuredBooks.length}/8)</span>
              {hasUnsavedReorder && (
                <span className="flex size-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Search Bar Form (only when not in full reorder mode) */}
            {!isReorderMode && (
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-full sm:w-64"
              >
                <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="বই, লেখক বা ক্যাটাগরি খুঁজুন..."
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
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURED BOOKS WORKSPACE VIEW (Active when isReorderMode is true)
      ════════════════════════════════════════════════════════════════════ */}
      {isReorderMode ? (
        <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
          {/* Header & Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400">
                  <Star className="size-4 fill-amber-400" />
                </span>
                <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
                  হোমপেজ ফিচার্ড বই ব্যবস্থাপনা (Featured Books)
                </h3>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400 font-[family-name:var(--font-bengali)]">
                  {featuredBooks.length} / ৮টি বই নির্বাচিত
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                হোমপেজের &ldquo;Featured Books&rdquo; সেকশনে প্রদর্শনের জন্য সর্বোচ্চ ৮টি বই নির্বাচন করুন ও তাদের ক্রম সাজান। অন্য কোনো বই স্বয়ংক্রিয়ভাবে হোমপেজে দেখানো হবে না।
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasUnsavedReorder && (
                <button
                  type="button"
                  id="reset-order-btn"
                  onClick={handleResetReorder}
                  disabled={isSavingOrder}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/60 bg-background px-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                >
                  <RotateCcw className="size-3.5" />
                  রিসেট
                </button>
              )}

              <Button
                type="button"
                id="save-order-btn"
                onClick={handleSaveReorder}
                disabled={isSavingOrder || !hasUnsavedReorder}
                className="h-9 gap-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 font-[family-name:var(--font-bengali)]"
              >
                {isSavingOrder ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                {hasUnsavedReorder ? "ফিচার্ড বই সংরক্ষণ করুন *" : "সংরক্ষিত আছে"}
              </Button>
            </div>
          </div>

          {/* Staged notification notice */}
          {hasUnsavedReorder && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 font-[family-name:var(--font-bengali)] flex items-center justify-between">
              <span>⚠️ আপনার করা নতুন ফিচার্ড বইয়ের তালিকা এখনো সংরক্ষণ করা হয়নি। &ldquo;ফিচার্ড বই সংরক্ষণ করুন&rdquo; বাটনে ক্লিক করুন।</span>
            </div>
          )}

          {/* Section 1: Selected Featured Books */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]">
                নির্বাচিত ফিচার্ড বই ({featuredBooks.length}/৮)
              </h4>
              <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
                টেনে বা অ্যারো বাটন দিয়ে অবস্থান পরিবর্তন করুন
              </span>
            </div>

            {featuredBooks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-10 text-center text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                বর্তমানে হোমপেজের জন্য কোনো বই ফিচার্ড হিসেবে নির্বাচিত নেই। নিচের তালিকা থেকে বই যোগ করুন।
              </div>
            ) : (
              <div className="space-y-2">
                {featuredBooks.map((book, index) => {
                  const isFirst = index === 0;
                  const isLast = index === featuredBooks.length - 1;

                  return (
                    <div
                      key={book._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                        draggedIndex === index
                          ? "border-amber-400 bg-amber-400/5 opacity-50"
                          : "border-border/60 bg-card hover:border-amber-400/50 hover:bg-muted/10 shadow-2xs"
                      }`}
                    >
                      {/* Left: Drag Handle, Rank Badge, Book Thumbnail & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Drag Handle */}
                        <button
                          type="button"
                          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
                          aria-label="ড্র্যাগ করে ক্রম পরিবর্তন করুন"
                          title="টেনে অবস্থান পরিবর্তন করুন"
                        >
                          <GripVertical className="size-4" />
                        </button>

                        {/* Rank Position Badge */}
                        <div
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold bg-amber-400/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/40"
                          title="হোমপেজে ফিচার্ড স্লট"
                        >
                          #{index + 1}
                        </div>

                        {/* Thumbnail */}
                        <div className="h-12 w-9 shrink-0 overflow-hidden rounded border border-border/50 bg-muted">
                          {book.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={book.coverImage}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40">
                              <BookOpen className="size-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Title & Author */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium text-foreground text-xs font-[family-name:var(--font-bengali)]">
                            <span className="truncate">{book.title}</span>
                            <Link
                              href={`/books/${book.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-brand"
                              title="পাবলিক পেজে দেখুন"
                            >
                              <ExternalLink className="size-3" />
                            </Link>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)] truncate">
                            {book.authorName} &bull; {book.categoryName} &bull; <strong className="text-foreground">৳ {book.discountPrice ?? book.price}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Right: Direct Position Input & Move Controls + Remove */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Numeric position input */}
                        <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)] mr-1">
                          <span>ক্রম:</span>
                          <input
                            type="number"
                            min="1"
                            max={featuredBooks.length}
                            value={index + 1}
                            onChange={(e) => handleRankInputChange(index, e.target.value)}
                            className="h-7 w-12 rounded-lg border border-border/70 bg-background px-1.5 text-center text-xs font-bold text-foreground focus:border-brand focus:outline-none"
                            aria-label={`বইয়ের ক্রম: ${book.title}`}
                          />
                        </div>

                        {/* Quick Move to Top */}
                        <button
                          type="button"
                          onClick={() => handleMoveToEdge(index, "top")}
                          disabled={isFirst}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                          title="সবার উপরে নিয়ে যান"
                          aria-label={`সবার উপরে নিয়ে যান: ${book.title}`}
                        >
                          <ChevronsUp className="size-4" />
                        </button>

                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveBook(index, -1)}
                          disabled={isFirst}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                          title="এক ধাপ উপরে"
                          aria-label={`এক ধাপ উপরে নিন: ${book.title}`}
                        >
                          <ArrowUp className="size-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveBook(index, 1)}
                          disabled={isLast}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                          title="এক ধাপ নিচে"
                          aria-label={`এক ধাপ নিচে নিন: ${book.title}`}
                        >
                          <ArrowDown className="size-4" />
                        </button>

                        {/* Quick Move to Bottom */}
                        <button
                          type="button"
                          onClick={() => handleMoveToEdge(index, "bottom")}
                          disabled={isLast}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                          title="সবার নিচে নিয়ে যান"
                          aria-label={`সবার নিচে নিয়ে যান: ${book.title}`}
                        >
                          <ChevronsDown className="size-4" />
                        </button>

                        {/* Remove from featured */}
                        <button
                          type="button"
                          id={`remove-featured-${book._id}`}
                          onClick={() => handleRemoveFeatured(book._id)}
                          className="rounded-lg p-1.5 text-destructive/80 hover:bg-destructive/10 hover:text-destructive ml-1"
                          title="ফিচার্ড তালিকা থেকে সরান"
                          aria-label={`ফিচার্ড তালিকা থেকে সরান: ${book.title}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Add Books to Featured Section */}
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-foreground font-[family-name:var(--font-bengali)] flex items-center gap-1.5">
                  <Plus className="size-4 text-brand" />
                  নতুন বই ফিচার্ডে যোগ করুন
                </h4>
                <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                  {featuredBooks.length < 8
                    ? `হোমপেজের জন্য আরও ${8 - featuredBooks.length}টি বই যোগ করতে পারবেন।`
                    : "সর্বোচ্চ ৮টি বই ইতিমধ্যে নির্বাচিত রয়েছে। নতুন বই যোগ করতে পূর্বের কোনো বই সরান।"}
                </p>
              </div>

              {featuredBooks.length < 8 && availableBooksToAdd.length > 0 && (
                <div className="relative w-full sm:w-60">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    placeholder="বই খুঁজুন..."
                    className="h-8 w-full rounded-lg border border-border/60 bg-card pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
                  />
                </div>
              )}
            </div>

            {featuredBooks.length >= 8 ? (
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                ✅ হোমপেজের জন্য নির্ধারিত ৮টি বইয়ের কোটা পূর্ণ হয়েছে। নতুন কোনো বই যোগ করতে চাইলে ওপরের নির্বাচিত তালিকা থেকে &ldquo;সরান&rdquo; বাটনে ক্লিক করে স্থান খালি করুন।
              </div>
            ) : filteredAvailableBooks.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                {addSearch
                  ? "অনুসন্ধানের সাথে মিলে এমন কোনো প্রকাশিত বই পাওয়া যায়নি।"
                  : "আর কোনো প্রকাশিত বই উপলব্ধ নেই।"}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 max-h-72 overflow-y-auto pr-1">
                {filteredAvailableBooks.map((book) => (
                  <div
                    key={book._id}
                    className="flex items-center justify-between gap-2.5 rounded-lg border border-border/60 bg-card p-2.5 text-xs transition-colors hover:border-brand/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-10 w-7.5 shrink-0 overflow-hidden rounded border border-border/50 bg-muted">
                        {book.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.coverImage}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40">
                            <BookOpen className="size-3" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate font-[family-name:var(--font-bengali)]">
                          {book.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate font-[family-name:var(--font-bengali)]">
                          {book.authorName} &bull; ৳ {book.discountPrice ?? book.price}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      id={`add-featured-${book._id}`}
                      onClick={() => handleAddFeatured(book)}
                      disabled={isSavingOrder}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand hover:bg-brand/20 disabled:opacity-50 font-[family-name:var(--font-bengali)]"
                    >
                      <Plus className="size-3" />
                      যোগ করুন
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════
            STANDARD LIST / TABLE VIEW
        ════════════════════════════════════════════════════════════════════ */
        <>
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
                      <th className="px-4 py-3 font-semibold">স্ট্যাটাস ও ক্রম</th>
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

                        {/* Status & Display Order */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <BookStatusBadge status={book.status} />
                            {book.status === "PUBLISHED" && (
                              book.displayOrder <= 8 ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/40"
                                  title="হোমপেজে ফিচার্ড"
                                >
                                  <Star className="size-3 fill-amber-400 text-amber-500" />
                                  ফিচার্ড #{book.displayOrder}
                                </span>
                              ) : book.displayOrder <= 9000 ? (
                                <span
                                  className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand"
                                  title="পাবলিক ক্যাটালগ ক্রম"
                                >
                                  #{book.displayOrder}
                                </span>
                              ) : null
                            )}
                          </div>
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
                                  id={`quick-feature-btn-${book._id}`}
                                  onClick={() => handleQuickToggleFeatured(book)}
                                  disabled={isSavingOrder || (book.displayOrder > 8 && featuredBooks.length >= 8)}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40 font-[family-name:var(--font-bengali)] ${
                                    book.displayOrder <= 8
                                      ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                                      : "border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                  title={
                                    book.displayOrder <= 8
                                      ? "হোমপেজ ফিচার্ড থেকে সরান"
                                      : featuredBooks.length >= 8
                                      ? "সর্বোচ্চ ৮টি বই ইতিমধ্যে ফিচার্ড করা আছে"
                                      : "হোমপেজে ফিচার্ড হিসেবে যোগ করুন"
                                  }
                                >
                                  <Star className={`size-3 ${book.displayOrder <= 8 ? "fill-amber-400 text-amber-500" : ""}`} />
                                  {book.displayOrder <= 8 ? "ফিচার্ড" : "+ ফিচার্ড"}
                                </button>
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
                          <div className="flex items-center gap-1 shrink-0 flex-wrap">
                            <BookStatusBadge status={book.status} />
                            {book.status === "PUBLISHED" && (
                              book.displayOrder <= 8 ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/40">
                                  <Star className="size-2.5 fill-amber-400 text-amber-500" />
                                  #{book.displayOrder}
                                </span>
                              ) : book.displayOrder <= 9000 ? (
                                <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold text-brand">
                                  #{book.displayOrder}
                                </span>
                              ) : null
                            )}
                          </div>
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
                                id={`mobile-quick-feature-btn-${book._id}`}
                                onClick={() => handleQuickToggleFeatured(book)}
                                disabled={isSavingOrder || (book.displayOrder > 8 && featuredBooks.length >= 8)}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors disabled:opacity-40 font-[family-name:var(--font-bengali)] ${
                                  book.displayOrder <= 8
                                    ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                    : "border border-border/60 bg-background text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                <Star className={`size-3 ${book.displayOrder <= 8 ? "fill-amber-400 text-amber-500" : ""}`} />
                                {book.displayOrder <= 8 ? "ফিচার্ড" : "+ ফিচার্ড"}
                              </button>
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
