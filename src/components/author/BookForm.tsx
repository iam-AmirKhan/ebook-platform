"use client";

/**
 * BookForm — client component for creating and editing books.
 *
 * Uses useActionState (React 19) for server action integration.
 * Chapter management uses local React state with manual ordering.
 * All security enforcement happens in the server actions, not here.
 */

import { useActionState, useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { generateSlug, countSubstantiveChapters } from "@/validators/book";
import type { ActionResult, BookFormData, CategoryOption, ChapterFormData } from "@/types/author";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookFormProps {
  /** Server action bound with .bind(null, bookId) for update, or createBookAndRedirect for create */
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  /** Prefill values for edit mode */
  defaultValues?: Partial<BookFormData>;
  categories: CategoryOption[];
  /** Show success message from query param (e.g. after redirect) */
  justCreated?: boolean;
}

// ---------------------------------------------------------------------------
// Chapter editor state
// ---------------------------------------------------------------------------

type ChapterState = ChapterFormData & { _key: string };

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function defaultChapter(order: number): ChapterState {
  return {
    _key: makeKey(),
    order,
    title: "",
    teaser: "",
    content: "",
    isPreview: false,
  };
}

// ---------------------------------------------------------------------------
// Input styling helpers
// ---------------------------------------------------------------------------

const inputClass =
  "flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50";

const textareaClass = `${inputClass} resize-y min-h-[80px] leading-[1.7]`;

const bengaliTextareaClass = `${textareaClass} font-[family-name:var(--font-bengali)] text-[1rem] leading-[1.85] min-h-[140px]`;

const labelClass =
  "block text-sm font-medium text-foreground mb-1.5 font-[family-name:var(--font-bengali)]";

const sectionClass = "flex flex-col gap-5 rounded-xl border border-border/60 bg-card p-5 sm:p-6";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookForm({
  action,
  defaultValues,
  categories,
  justCreated,
}: BookFormProps) {
  const initialState: ActionResult = { success: false };
  const [state, formAction, isPending] = useActionState(action, initialState);

  // ── Title / slug linkage ───────────────────────────────────────────────
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!defaultValues?.slug);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (!slugEdited) {
      setSlug(generateSlug(e.target.value));
    }
  };

  // ── Learning outcomes ─────────────────────────────────────────────────
  const [outcomes, setOutcomes] = useState<string[]>(
    defaultValues?.learningOutcomes ?? []
  );

  const addOutcome = () => setOutcomes((prev) => [...prev, ""]);
  const removeOutcome = (i: number) =>
    setOutcomes((prev) => prev.filter((_, idx) => idx !== i));
  const updateOutcome = (i: number, val: string) =>
    setOutcomes((prev) => prev.map((o, idx) => (idx === i ? val : o)));

  // ── Chapters ──────────────────────────────────────────────────────────
  const [chapters, setChapters] = useState<ChapterState[]>(() =>
    (defaultValues?.chapters ?? []).map((ch) => ({ ...ch, _key: makeKey() }))
  );
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  const addChapter = useCallback(() => {
    const newCh = defaultChapter(chapters.length + 1);
    setChapters((prev) => [...prev, newCh]);
    setExpandedChapter(newCh._key);
  }, [chapters.length]);

  const removeChapter = (key: string) => {
    setChapters((prev) => {
      const next = prev.filter((ch) => ch._key !== key).map((ch, i) => ({
        ...ch,
        order: i + 1,
      }));
      return next;
    });
    if (expandedChapter === key) setExpandedChapter(null);
  };

  const moveChapter = (key: string, direction: "up" | "down") => {
    setChapters((prev) => {
      const idx = prev.findIndex((ch) => ch._key === key);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((ch, i) => ({ ...ch, order: i + 1 }));
    });
  };

  const updateChapter = (key: string, field: keyof ChapterFormData, value: string | boolean | number) => {
    setChapters((prev) =>
      prev.map((ch) => (ch._key === key ? { ...ch, [field]: value } : ch))
    );
  };

  // ── Form ref for hidden JSON fields ───────────────────────────────────
  const formRef = useRef<HTMLFormElement>(null);

  // ── Success redirect feedback ─────────────────────────────────────────
  const [successMsg, setSuccessMsg] = useState(
    justCreated ? "বই সফলভাবে তৈরি হয়েছে! এখন সম্পাদনা করুন।" : ""
  );

  useEffect(() => {
    if (state.success) {
      // Schedule in a timeout to avoid synchronous setState within effect
      const t1 = setTimeout(() => setSuccessMsg("পরিবর্তন সংরক্ষিত হয়েছে।"), 0);
      const t2 = setTimeout(() => setSuccessMsg(""), 4000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [state]);

  // ── Error scroll/focus feedback ──────────────────────────────────────
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current.focus();
    }
  }, [state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-8"
      noValidate
    >
      {/* Hidden JSON fields — chapters and learningOutcomes serialized as JSON */}
      <input
        type="hidden"
        name="chapters"
        value={JSON.stringify(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          chapters.map(({ _key: _unusedKey, ...ch }) => ch)
        )}
      />
      <input
        type="hidden"
        name="learningOutcomes"
        value={JSON.stringify(outcomes)}
      />

      {/* ── Status feedback ── */}
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-medium text-brand font-[family-name:var(--font-bengali)]"
        >
          {successMsg}
        </div>
      )}
      {state.error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive font-[family-name:var(--font-bengali)] outline-none focus:ring-2 focus:ring-destructive/40"
        >
          {state.error}
        </div>
      )}

      {/* ── Section 1: Basic info ── */}
      <section className={sectionClass} aria-labelledby="basic-info-heading">
        <h2
          id="basic-info-heading"
          className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]"
        >
          মূল তথ্য
        </h2>

        {/* Title */}
        <div>
          <label htmlFor="title" className={labelClass}>
            শিরোনাম <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={handleTitleChange}
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            placeholder="বইয়ের শিরোনাম লিখুন"
            aria-describedby={state.fieldErrors?.title ? "title-error" : undefined}
          />
          {state.fieldErrors?.title && (
            <p id="title-error" className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
              {state.fieldErrors.title[0]}
            </p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className={labelClass}>
            স্লাগ (URL){" "}
            <span className="text-xs font-normal text-muted-foreground">
              — শিরোনাম থেকে স্বয়ংক্রিয়ভাবে তৈরি, সম্পাদনাযোগ্য
            </span>
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            className={inputClass}
            placeholder="boi-slug"
            dir="ltr"
          />
          {slug && (
            <p className="mt-1 text-xs text-muted-foreground">
              URL: /books/<span className="font-mono text-foreground">{slug}</span>
            </p>
          )}
          {state.fieldErrors?.slug && (
            <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
              {state.fieldErrors.slug[0]}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="categoryId" className={labelClass}>
            বিভাগ <span className="text-destructive">*</span>
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={defaultValues?.categoryId ?? ""}
            className={`${inputClass} font-[family-name:var(--font-bengali)]`}
          >
            <option value="">— বিভাগ নির্বাচন করুন —</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoryId && (
            <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
              {state.fieldErrors.categoryId[0]}
            </p>
          )}
        </div>

        {/* Language */}
        <div>
          <label htmlFor="language" className={labelClass}>
            ভাষা
          </label>
          <input
            id="language"
            name="language"
            type="text"
            defaultValue={defaultValues?.language ?? "বাংলা"}
            className={`${inputClass} font-[family-name:var(--font-bengali)]`}
            placeholder="বাংলা"
          />
        </div>

        {/* Cover image URL */}
        <div>
          <label htmlFor="coverImage" className={labelClass}>
            কভার ইমেজ URL
          </label>
          <input
            id="coverImage"
            name="coverImage"
            type="url"
            defaultValue={defaultValues?.coverImage ?? ""}
            className={inputClass}
            placeholder="https://example.com/cover.jpg"
            dir="ltr"
          />
          <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            বর্তমানে শুধু HTTPS URL গ্রহণযোগ্য। ফাইল আপলোড পরবর্তী সংস্করণে আসবে।
          </p>
          {state.fieldErrors?.coverImage && (
            <p className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
              {state.fieldErrors.coverImage[0]}
            </p>
          )}
        </div>
      </section>

      {/* ── Section 2: Content ── */}
      <section className={sectionClass} aria-labelledby="content-heading">
        <h2
          id="content-heading"
          className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]"
        >
          বিষয়বস্তু
        </h2>

        {/* Summary */}
        <div>
          <label htmlFor="summary" className={labelClass}>
            সারসংক্ষেপ{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (সর্বোচ্চ ৫০০ অক্ষর)
            </span>
          </label>
          <textarea
            id="summary"
            name="summary"
            defaultValue={defaultValues?.summary ?? ""}
            className={bengaliTextareaClass}
            placeholder="বইয়ের সংক্ষিপ্ত পরিচিতি লিখুন"
            maxLength={500}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelClass}>
            বিস্তারিত বিবরণ
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            className={`${bengaliTextareaClass} min-h-[200px]`}
            placeholder="বইটি সম্পর্কে বিস্তারিত লিখুন"
            aria-describedby={state.fieldErrors?.description ? "description-error" : undefined}
          />
          {state.fieldErrors?.description && (
            <p id="description-error" className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
              {state.fieldErrors.description[0]}
            </p>
          )}
        </div>

        {/* Learning outcomes */}
        <div>
          <label className={labelClass}>
            শিক্ষার ফলাফল{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (পাঠক কী শিখবেন)
            </span>
          </label>
          <div className="flex flex-col gap-2">
            {outcomes.map((outcome, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => updateOutcome(i, e.target.value)}
                  className={`${inputClass} flex-1 font-[family-name:var(--font-bengali)]`}
                  placeholder={`${i + 1} নম্বর ফলাফল`}
                />
                <button
                  type="button"
                  onClick={() => removeOutcome(i)}
                  aria-label="ফলাফল সরান"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOutcome}
              className="flex h-9 w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand font-[family-name:var(--font-bengali)]"
            >
              + ফলাফল যোগ করুন
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 3: Pricing ── */}
      <section className={sectionClass} aria-labelledby="pricing-heading">
        <h2
          id="pricing-heading"
          className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]"
        >
          মূল্য
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className={labelClass}>
              মূল্য (BDT) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                ৳
              </span>
              <input
                id="price"
                name="price"
                type="number"
                min={100}
                max={300}
                step={1}
                defaultValue={defaultValues?.price ? Math.max(100, defaultValues.price) : 100}
                className={`${inputClass} pl-7 font-[family-name:var(--font-bengali)]`}
                placeholder="১০০"
                aria-describedby={state.fieldErrors?.price ? "price-error" : "price-hint"}
              />
            </div>
            <p id="price-hint" className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              বইয়ের অনুমোদিত মূল্য ৳১০০ থেকে ৳৩০০ (ন্যূনতম ৳১০০, সর্বোচ্চ ৳৩০০)।
            </p>
            {state.fieldErrors?.price && (
              <p id="price-error" className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                {state.fieldErrors.price[0]}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="discountPrice" className={labelClass}>
              ছাড়ের মূল্য (BDT){" "}
              <span className="text-xs font-normal text-muted-foreground">
                (ঐচ্ছিক)
              </span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                ৳
              </span>
              <input
                id="discountPrice"
                name="discountPrice"
                type="number"
                min={0}
                step={1}
                defaultValue={defaultValues?.discountPrice ?? ""}
                className={`${inputClass} pl-7`}
                placeholder="—"
                aria-describedby={state.fieldErrors?.discountPrice ? "discount-price-error" : undefined}
              />
            </div>
            {state.fieldErrors?.discountPrice && (
              <p id="discount-price-error" className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                {state.fieldErrors.discountPrice[0]}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 4: Chapters ── */}
      <section className={sectionClass} aria-labelledby="chapters-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="chapters-heading"
              className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]"
            >
              অধ্যায়সমূহ ({chapters.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              বই প্রকাশের জন্য কমপক্ষে ৫টি পূর্ণাঙ্গ অধ্যায় আবশ্যক (বর্তমান পূর্ণাঙ্গ: {countSubstantiveChapters(chapters)}টি)
            </p>
          </div>
          <button
            type="button"
            onClick={addChapter}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/20 font-[family-name:var(--font-bengali)]"
          >
            + অধ্যায় যোগ করুন
          </button>
        </div>

        {countSubstantiveChapters(chapters) < 5 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 font-[family-name:var(--font-bengali)]">
            বই প্রকাশের জন্য কমপক্ষে ৫টি পূর্ণাঙ্গ ও অর্থপূর্ণ অধ্যায় (প্রতিটিতে অন্তত ৫০ অক্ষর) প্রয়োজন। বর্তমানে {countSubstantiveChapters(chapters)}টি পূর্ণাঙ্গ অধ্যায় রয়েছে।
          </div>
        )}

        {chapters.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            এখনো কোনো অধ্যায় নেই। উপরের বোতামে ক্লিক করে অধ্যায় যোগ করুন।
          </p>
        )}

        <ol className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
          {chapters.map((ch, idx) => (
            <ChapterEditor
              key={ch._key}
              chapter={ch}
              index={idx}
              total={chapters.length}
              isExpanded={expandedChapter === ch._key}
              onToggle={() =>
                setExpandedChapter((prev) =>
                  prev === ch._key ? null : ch._key
                )
              }
              onChange={(field, value) => updateChapter(ch._key, field, value)}
              onRemove={() => removeChapter(ch._key)}
              onMove={(dir) => moveChapter(ch._key, dir)}
            />
          ))}
        </ol>

        {state.fieldErrors?.chapters && (
          <p className="text-xs text-destructive font-[family-name:var(--font-bengali)]">
            {state.fieldErrors.chapters[0]}
          </p>
        )}
      </section>

      {/* ── Submit buttons ── */}
      {state.error && (
        <div
          aria-hidden="true"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive font-[family-name:var(--font-bengali)]"
        >
          {state.error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="font-[family-name:var(--font-bengali)]"
        >
          {isPending ? "সংরক্ষণ হচ্ছে…" : "ড্রাফট সংরক্ষণ করুন"}
        </Button>

        <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
          বইটি প্রকাশ করতে ড্যাশবোর্ড থেকে &ldquo;প্রকাশ করুন&rdquo; বোতামটি ব্যবহার করুন।
        </p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// ChapterEditor — individual chapter row
// ---------------------------------------------------------------------------

interface ChapterEditorProps {
  chapter: ChapterState;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (field: keyof ChapterFormData, value: string | boolean | number) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}

function ChapterEditor({
  chapter,
  index,
  total,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
  onMove,
}: ChapterEditorProps) {
  const inputClass =
    "flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50";

  return (
    <li className="flex flex-col bg-card">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Order badge */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
          {index + 1}
        </span>

        {/* Title preview / click to expand */}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-0 text-left text-sm font-medium text-foreground font-[family-name:var(--font-bengali)] truncate hover:text-brand transition-colors"
          aria-expanded={isExpanded}
        >
          {chapter.title || <span className="text-muted-foreground italic">শিরোনাম নেই</span>}
        </button>

        {/* Preview badge */}
        {chapter.isPreview && (
          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand font-[family-name:var(--font-bengali)]">
            বিনামূল্যে
          </span>
        )}

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={index === 0}
            aria-label="উপরে সরান"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            aria-label="নিচে সরান"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isExpanded ? "সংকুচিত করুন" : "প্রসারিত করুন"}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
          >
            {isExpanded ? "▲" : "▼"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="অধ্যায় মুছুন"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t border-border/40 flex flex-col gap-4 bg-muted/10 px-4 py-4">
          {/* Chapter title */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]">
              অধ্যায়ের শিরোনাম <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={chapter.title}
              onChange={(e) => onChange("title", e.target.value)}
              className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
              placeholder="অধ্যায়ের শিরোনাম লিখুন"
            />
          </div>

          {/* Teaser */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]">
              টিজার{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (সর্বদা দৃশ্যমান সংক্ষিপ্ত বিবরণ)
              </span>
            </label>
            <textarea
              value={chapter.teaser}
              onChange={(e) => onChange("teaser", e.target.value)}
              rows={2}
              className={`${inputClass} resize-y font-[family-name:var(--font-bengali)] text-sm leading-[1.7]`}
              placeholder="অধ্যায়টি সম্পর্কে ছোট বিবরণ (সবার জন্য দৃশ্যমান)"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1 font-[family-name:var(--font-bengali)]">
              বিষয়বস্তু <span className="text-destructive">*</span>
            </label>
            <textarea
              value={chapter.content}
              onChange={(e) => onChange("content", e.target.value)}
              rows={12}
              className={`${inputClass} resize-y font-[family-name:var(--font-bengali)] text-[1rem] leading-[1.9] min-h-[200px]`}
              placeholder="অধ্যায়ের পূর্ণ বিষয়বস্তু লিখুন"
            />
          </div>

          {/* Preview toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={chapter.isPreview}
              onChange={(e) => onChange("isPreview", e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            <span className="text-sm text-foreground font-[family-name:var(--font-bengali)]">
              বিনামূল্যে প্রিভিউ (সবাই পড়তে পারবেন)
            </span>
          </label>
        </div>
      )}
    </li>
  );
}
