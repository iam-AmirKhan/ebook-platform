"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type AdminCategoryItem,
  type AdminCategoryCounts,
} from "@/lib/data/admin-categories";
import {
  createCategoryAction,
  updateCategoryAction,
  toggleCategoryStatusAction,
  type CategoryActionResult,
} from "@/actions/admin-categories";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  FolderTree,
  Edit2,
  Power,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

interface AdminCategoriesManagerProps {
  categories: AdminCategoryItem[];
  counts: AdminCategoryCounts;
}

export function AdminCategoriesManager({
  categories,
  counts,
}: AdminCategoriesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategoryItem | null>(null);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form states for Create
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [createErrors, setCreateErrors] = useState<Record<string, string[]>>({});
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Form states for Edit
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  const filteredCategories = categories.filter((cat) => {
    // Status filter
    if (activeTab === "ACTIVE" && cat.status !== "ACTIVE") return false;
    if (activeTab === "INACTIVE" && cat.status !== "INACTIVE") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = cat.name.toLowerCase().includes(q);
      const matchSlug = cat.slug.toLowerCase().includes(q);
      const matchDesc = (cat.description ?? "").toLowerCase().includes(q);
      return matchName || matchSlug || matchDesc;
    }

    return true;
  });

  const handleOpenEdit = (cat: AdminCategoryItem) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditDescription(cat.description ?? "");
    setEditStatus(cat.status);
    setEditErrors({});
  };

  const handleToggleStatus = (cat: AdminCategoryItem) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleCategoryStatusAction(cat._id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "বিভাগের স্ট্যাটাস পরিবর্তিত হয়েছে।",
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।",
        });
      }
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateErrors({});
    setFeedback(null);

    const formData = new FormData();
    formData.append("name", createName);
    formData.append("slug", createSlug);
    formData.append("description", createDescription);
    formData.append("status", createStatus);

    const res: CategoryActionResult = await createCategoryAction(
      { success: false },
      formData
    );
    setCreateSubmitting(false);

    if (res.success) {
      setFeedback({
        type: "success",
        message: res.message || "বিভাগ সফলভাবে তৈরি হয়েছে।",
      });
      setIsCreateOpen(false);
      setCreateName("");
      setCreateSlug("");
      setCreateDescription("");
      setCreateStatus("ACTIVE");
      router.refresh();
    } else {
      if (res.fieldErrors) {
        setCreateErrors(res.fieldErrors);
      }
      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setEditSubmitting(true);
    setEditErrors({});
    setFeedback(null);

    const formData = new FormData();
    formData.append("name", editName);
    formData.append("slug", editSlug);
    formData.append("description", editDescription);
    formData.append("status", editStatus);

    const res: CategoryActionResult = await updateCategoryAction(
      editingCategory._id,
      { success: false },
      formData
    );
    setEditSubmitting(false);

    if (res.success) {
      setFeedback({
        type: "success",
        message: res.message || "বিভাগ সফলভাবে হালনাগাদ হয়েছে।",
      });
      setEditingCategory(null);
      router.refresh();
    } else {
      if (res.fieldErrors) {
        setEditErrors(res.fieldErrors);
      }
      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border p-4 text-sm font-medium font-[family-name:var(--font-bengali)] ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-5 shrink-0 text-destructive" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-foreground/60 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Control Bar: Filter Tabs, Search & Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex rounded-lg border border-border/60 bg-muted/30 p-1 text-xs font-[family-name:var(--font-bengali)]">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "ALL"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            সকল বিভাগ ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "ACTIVE"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            সক্রিয় ({counts.active})
          </button>
          <button
            onClick={() => setActiveTab("INACTIVE")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "INACTIVE"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            নিষ্ক্রিয় ({counts.inactive})
          </button>
        </div>

        {/* Actions: Search & Create */}
        <div className="flex flex-1 items-center gap-3 sm:max-w-md sm:justify-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="বিভাগ বা স্লাগ খুঁজুন..."
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Button
            onClick={() => {
              setIsCreateOpen(true);
              setCreateErrors({});
            }}
            className="flex h-9 shrink-0 items-center gap-1.5 text-xs font-semibold font-[family-name:var(--font-bengali)]"
          >
            <Plus className="size-4" />
            <span>নতুন বিভাগ</span>
          </Button>
        </div>
      </div>

      {/* Categories Cards / Table */}
      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <FolderTree className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
            কোনো বিভাগ পাওয়া যায়নি
          </h3>
          <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)] max-w-sm">
            {searchQuery
              ? `"${searchQuery}" অনুসন্ধানের বিপরীতে কোনো বিভাগ মেলেনি।`
              : "প্ল্যাটফর্মে এখনো কোনো বিভাগ যুক্ত করা হয়নি।"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
          <div className="divide-y divide-border/60">
            {filteredCategories.map((cat) => (
              <div
                key={cat._id}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/15 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground font-[family-name:var(--font-bengali)]">
                      {cat.name}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium font-[family-name:var(--font-bengali)] ${
                        cat.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border/60"
                      }`}
                    >
                      {cat.status === "ACTIVE" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-brand/5 px-2 py-0.5 text-[11px] font-medium text-brand">
                      <BookOpen className="size-3" />
                      <span>{cat.bookCount}টি বই</span>
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono text-muted-foreground/80">
                      /{cat.slug}
                    </span>
                    {cat.description && (
                      <span className="truncate max-w-md font-[family-name:var(--font-bengali)]">
                        {cat.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/books?category=${cat.slug}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex h-8 items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
                    title="পাবলিক পেজ দেখুন"
                  >
                    <ExternalLink className="size-3.5" />
                    <span className="hidden sm:inline font-[family-name:var(--font-bengali)]">
                      দেখুন
                    </span>
                  </a>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(cat)}
                    className="h-8 gap-1 text-xs font-[family-name:var(--font-bengali)]"
                  >
                    <Edit2 className="size-3.5" />
                    <span>সম্পাদনা</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleToggleStatus(cat)}
                    className={`h-8 gap-1 text-xs font-[family-name:var(--font-bengali)] ${
                      cat.status === "ACTIVE"
                        ? "text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                        : "text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                    }`}
                    title={cat.status === "ACTIVE" ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                  >
                    <Power className="size-3.5" />
                    <span>{cat.status === "ACTIVE" ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Plus className="size-5" />
                </span>
                <h2 className="text-lg font-bold text-foreground font-[family-name:var(--font-bengali)]">
                  নতুন বিভাগ তৈরি করুন
                </h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-[family-name:var(--font-bengali)]">
                  বিভাগের নাম <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="যেমন: বিজ্ঞান ও প্রযুক্তি"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                />
                {createErrors.name && (
                  <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                    {createErrors.name[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-[family-name:var(--font-bengali)]">
                  স্লাগ (Slug)
                </label>
                <input
                  type="text"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="খালি রাখলে স্বয়ংক্রিয় তৈরি হবে (যেমন: biggan-o-projukti)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs"
                />
                {createErrors.slug && (
                  <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                    {createErrors.slug[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-[family-name:var(--font-bengali)]">
                  বিবরণ (ঐচ্ছিক)
                </label>
                <textarea
                  rows={3}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="বিভাগের সংক্ষিপ্ত পরিচিতি লিখুন..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                />
                {createErrors.description && (
                  <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                    {createErrors.description[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-[family-name:var(--font-bengali)]">
                  স্ট্যাটাস
                </label>
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                >
                  <option value="ACTIVE">সক্রিয় (বই ও পাবলিক পেজে দৃশ্যমান)</option>
                  <option value="INACTIVE">নিষ্ক্রিয় (লুকানো)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="font-[family-name:var(--font-bengali)]"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  disabled={createSubmitting}
                  className="gap-1.5 font-[family-name:var(--font-bengali)] font-semibold"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <span>তৈরি করুন</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Edit2 className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-foreground font-[family-name:var(--font-bengali)]">
                    বিভাগ সম্পাদনা করুন
                  </h2>
                  <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                    {editingCategory.bookCount > 0 ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        সতর্কতা: এই বিভাগে {editingCategory.bookCount}টি বই বিদ্যমান।
                      </span>
                    ) : (
                      "বিভাগের তথ্য পরিবর্তন করুন।"
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCategory(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-[family-name:var(--font-bengali)]">
                  বিভাগের নাম <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                />
                {editErrors.name && (
                  <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                    {editErrors.name[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-[family-name:var(--font-bengali)]">
                  স্লাগ (Slug)
                </label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs"
                />
                {editErrors.slug && (
                  <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                    {editErrors.slug[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-[family-name:var(--font-bengali)]">
                  বিবরণ
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                />
                {editErrors.description && (
                  <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                    {editErrors.description[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-[family-name:var(--font-bengali)]">
                  স্ট্যাটাস
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-[family-name:var(--font-bengali)]"
                >
                  <option value="ACTIVE">সক্রিয় (সবার জন্য উন্মুক্ত)</option>
                  <option value="INACTIVE">নিষ্ক্রিয় (লুকানো)</option>
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">
                  নিষ্ক্রিয় করলে পূর্বে প্রকাশিত বইয়ের বিভাগ সংরক্ষিত থাকবে, তবে নতুন বই তৈরিতে নির্বাচন করা যাবে না।
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                  className="font-[family-name:var(--font-bengali)]"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  disabled={editSubmitting}
                  className="gap-1.5 font-[family-name:var(--font-bengali)] font-semibold"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <span>পরিবর্তন সংরক্ষণ করুন</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
