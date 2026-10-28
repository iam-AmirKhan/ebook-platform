"use client";

/**
 * BookForm — client component for creating and editing books.
 *
 * Uses useActionState (React 19) for server action integration.
 * Chapter management uses local React state with manual ordering.
 * All security enforcement happens in the server actions, not here.
 */

import { useActionState, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { generateSlug, countSubstantiveChapters } from "@/validators/book";
import type { ActionResult, BookFormData, CategoryOption, ChapterFormData } from "@/types/author";
import { BookCoverImage } from "@/components/books/BookCoverImage";

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
  const router = useRouter();
  const initialState: ActionResult = { success: false };
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [savingAction, setSavingAction] = useState<"chapter" | "draft" | "submit" | "save" | null>(null);
  const [savingChapterKey, setSavingChapterKey] = useState<string | null>(null);
  const prevStateRef = useRef(state);

  // ── Title / slug linkage ───────────────────────────────────────────────
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!defaultValues?.slug);
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? "");
  const [language, setLanguage] = useState(defaultValues?.language ?? "বাংলা");
  const [summary, setSummary] = useState(defaultValues?.summary ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");

  // ── Pricing state & client-side validation ──────────────────────────────
  const [price, setPrice] = useState<string>(() => {
    if (defaultValues?.price !== undefined && defaultValues?.price !== null) {
      return String(defaultValues.price);
    }
    return "100";
  });
  const [discountPrice, setDiscountPrice] = useState<string>(() => {
    if (defaultValues?.discountPrice !== undefined && defaultValues?.discountPrice !== null) {
      return String(defaultValues.discountPrice);
    }
    return "";
  });
  const [priceClientError, setPriceClientError] = useState<string | null>(null);
  const [discountPriceClientError, setDiscountPriceClientError] = useState<string | null>(null);

  const validatePrice = (val: string): boolean => {
    if (!val || val.trim() === "") {
      setPriceClientError("বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)");
      return false;
    }
    const num = Number(val);
    if (isNaN(num) || num < 100) {
      setPriceClientError("বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)");
      return false;
    }
    setPriceClientError(null);
    return true;
  };

  const validateDiscountPrice = (dVal: string, pVal: string): boolean => {
    if (!dVal || dVal.trim() === "") {
      setDiscountPriceClientError(null);
      return true;
    }
    const dNum = Number(dVal);
    if (isNaN(dNum) || dNum < 100) {
      setDiscountPriceClientError("ছাড়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)");
      return false;
    }
    if (dNum > 300) {
      setDiscountPriceClientError("ছাড়ের মূল্য সর্বোচ্চ ৩০০ টাকা হতে হবে (সর্বোচ্চ ৳৩০০)");
      return false;
    }
    const pNum = Number(pVal);
    if (!isNaN(pNum) && dNum > pNum) {
      setDiscountPriceClientError("ছাড়ের মূল্য মূল বইয়ের মূল্যের চেয়ে বেশি হতে পারবে না");
      return false;
    }
    setDiscountPriceClientError(null);
    return true;
  };

  // ── Cover Image & File Upload ──────────────────────────────────────────
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [manualCoverUrl, setManualCoverUrl] = useState(defaultValues?.coverImage ?? "");
  const [removeCover, setRemoveCover] = useState(false);
  const [coverClientError, setCoverClientError] = useState<string | null>(null);
  const [coverModified, setCoverModified] = useState(false);
  const [showUrlOption, setShowUrlOption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Synchronize state with incoming props during render
  const [prevDefaultCover, setPrevDefaultCover] = useState(defaultValues?.coverImage);
  if (defaultValues?.coverImage !== prevDefaultCover) {
    setPrevDefaultCover(defaultValues?.coverImage);
    setManualCoverUrl(defaultValues?.coverImage ?? "");
  }

  const [prevActionState, setPrevActionState] = useState(state);
  if (state !== prevActionState) {
    setPrevActionState(state);
    setCoverModified(false);
    if (state.success && state.coverUrl !== undefined) {
      setManualCoverUrl(state.coverUrl ?? "");
      setRemoveCover(false);
      setSelectedCoverFile(null);
      setCoverPreviewUrl(null);
    }
  }

  // Active cover error: suppress previous server error once author changes cover
  const activeServerCoverError = !coverModified ? state.fieldErrors?.coverImage?.[0] : null;

  // Active general error: suppress previous general error once author modifies the cover
  const displayGeneralError =
    !coverModified || !state.fieldErrors?.coverImage ? state.error : null;

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (objectUrlRef.current && objectUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverClientError(null);
    setCoverModified(true);

    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validations
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setCoverClientError("কভার ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারে।");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const normalizedType = (file.type || "").split(";")[0].trim().toLowerCase();
    const ALLOWED_MIME_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/pjpeg",
      "image/png",
      "image/x-png",
      "image/webp",
      "image/x-webp",
    ];

    const extMatch = file.name.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "";
    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(normalizedType);
    const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);

    const isExplicitlyForbiddenMime =
      Boolean(normalizedType) &&
      !normalizedType.startsWith("image/") &&
      normalizedType !== "application/octet-stream";

    if (isExplicitlyForbiddenMime || (!isMimeAllowed && !isExtAllowed)) {
      setCoverClientError("শুধুমাত্র JPEG, PNG অথবা WebP ফরম্যাটের ছবি গ্রহণযোগ্য।");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (objectUrlRef.current && objectUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const newUrl = URL.createObjectURL(file);
    objectUrlRef.current = newUrl;
    setSelectedCoverFile(file);
    setCoverPreviewUrl(newUrl);
    setRemoveCover(false);
  };

  const handleClearSelectedFile = () => {
    if (objectUrlRef.current && objectUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSelectedCoverFile(null);
    setCoverPreviewUrl(null);
    setCoverClientError(null);
    setCoverModified(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveExistingCover = () => {
    handleClearSelectedFile();
    setRemoveCover(true);
    setManualCoverUrl("");
    setCoverClientError(null);
    setCoverModified(true);
  };

  const handleRestoreExistingCover = () => {
    setRemoveCover(false);
    setManualCoverUrl(defaultValues?.coverImage ?? "");
    setCoverClientError(null);
    setCoverModified(true);
  };

  const currentCoverDisplay = removeCover
    ? null
    : coverPreviewUrl
    ? coverPreviewUrl
    : manualCoverUrl || defaultValues?.coverImage || null;

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

  // ── Unsaved draft persistence & recovery ────────────────────────────────
  const draftStorageKey = defaultValues?._id
    ? `pustoka_book_draft_${defaultValues._id}`
    : "pustoka_book_draft_new";

  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);
  const isAutoSavingRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(draftStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed || parsed.version !== 1) return;

      if (defaultValues?.updatedAt) {
        const serverTime = new Date(defaultValues.updatedAt).getTime();
        if (serverTime > parsed.savedAt) {
          localStorage.removeItem(draftStorageKey);
          return;
        }
      }

      const hasMeaningfulData =
        parsed.title ||
        parsed.description ||
        parsed.summary ||
        (parsed.chapters && parsed.chapters.length > 0);

      if (hasMeaningfulData) {
        setTimeout(() => {
          if (parsed.title !== undefined) setTitle(parsed.title);
          if (parsed.slug !== undefined) setSlug(parsed.slug);
          if (parsed.categoryId !== undefined) setCategoryId(parsed.categoryId);
          if (parsed.language !== undefined) setLanguage(parsed.language);
          if (parsed.summary !== undefined) setSummary(parsed.summary);
          if (parsed.description !== undefined) setDescription(parsed.description);
          if (parsed.outcomes !== undefined) setOutcomes(parsed.outcomes);
          if (parsed.price !== undefined) setPrice(parsed.price);
          if (parsed.discountPrice !== undefined) setDiscountPrice(parsed.discountPrice);
          if (parsed.chapters && Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
            setChapters(parsed.chapters.map((ch: ChapterFormData) => ({ ...ch, _key: makeKey() })));
          }
          setHasRecoveredDraft(true);
        }, 0);
      }
    } catch {
      // storage error fallback
    }
  }, [draftStorageKey, defaultValues]);

  const handleDiscardRecoveredDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
    setHasRecoveredDraft(false);
    setTitle(defaultValues?.title ?? "");
    setSlug(defaultValues?.slug ?? "");
    setSlugEdited(!!defaultValues?.slug);
    setCategoryId(defaultValues?.categoryId ?? "");
    setLanguage(defaultValues?.language ?? "বাংলা");
    setSummary(defaultValues?.summary ?? "");
    setDescription(defaultValues?.description ?? "");
    setOutcomes(defaultValues?.learningOutcomes ?? []);
    setPrice(
      defaultValues?.price !== undefined && defaultValues?.price !== null
        ? String(defaultValues.price)
        : "100"
    );
    setDiscountPrice(
      defaultValues?.discountPrice !== undefined && defaultValues?.discountPrice !== null
        ? String(defaultValues.discountPrice)
        : ""
    );
    setChapters(
      (defaultValues?.chapters ?? []).map((ch) => ({ ...ch, _key: makeKey() }))
    );
    setExpandedChapter(null);
    toast.info("অসংরক্ষিত খসড়া মুছে ফেলা হয়েছে");
  };

  useEffect(() => {
    if (!isAutoSavingRef.current) {
      isAutoSavingRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      try {
        const dataToSave = {
          version: 1,
          savedAt: Date.now(),
          title,
          slug,
          categoryId,
          language,
          summary,
          description,
          outcomes,
          price,
          discountPrice,
          chapters: chapters.map((ch) => ({
            order: ch.order,
            title: ch.title,
            teaser: ch.teaser,
            content: ch.content,
            isPreview: ch.isPreview,
          })),
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(dataToSave));
      } catch {
        // quota or privacy mode error
      }
    }, 750);
    return () => clearTimeout(timer);
  }, [
    title,
    slug,
    categoryId,
    language,
    summary,
    description,
    outcomes,
    price,
    discountPrice,
    chapters,
    draftStorageKey,
  ]);

  // ── Form ref for hidden JSON fields ───────────────────────────────────
  const formRef = useRef<HTMLFormElement>(null);
  const draftSubmitRef = useRef<HTMLButtonElement>(null);

  const handleSaveDraft = () => {
    setSavingAction("draft");
    setSavingChapterKey(null);
    if (draftSubmitRef.current) {
      draftSubmitRef.current.click();
    } else if (formRef.current) {
      const submitter = formRef.current.querySelector<HTMLButtonElement>(
        'button[type="submit"][name="actionIntent"][value="draft"]'
      );
      submitter?.click();
    }
  };

  const handleSaveChapter = (chapterKey: string) => {
    setSavingAction("chapter");
    setSavingChapterKey(chapterKey);
    if (draftSubmitRef.current) {
      draftSubmitRef.current.click();
    } else if (formRef.current) {
      const submitter = formRef.current.querySelector<HTMLButtonElement>(
        'button[type="submit"][name="actionIntent"][value="draft"]'
      );
      submitter?.click();
    }
  };

  // ── Success & Toast feedback ──────────────────────────────────────────
  const [successMsg, setSuccessMsg] = useState("");
  const justCreatedToastRef = useRef(false);

  useEffect(() => {
    if (justCreated && !justCreatedToastRef.current) {
      justCreatedToastRef.current = true;
      toast.success("বই সফলভাবে তৈরি হয়েছে! এখন অধ্যায় ও প্রয়োজনীয় তথ্য যোগ করুন।");
    }
  }, [justCreated]);

  useEffect(() => {
    if (state !== prevStateRef.current) {
      prevStateRef.current = state;

      if (state.success) {
        if (objectUrlRef.current && objectUrlRef.current.startsWith("blob:")) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        try {
          localStorage.removeItem(draftStorageKey);
        } catch {}

        let bannerMsg = state.message || "পরিবর্তন সংরক্ষিত হয়েছে।";
        if (savingAction === "chapter") {
          bannerMsg = "অধ্যায় সংরক্ষিত হয়েছে।";
          toast.success("অধ্যায় সংরক্ষিত হয়েছে");
        } else if (savingAction === "draft") {
          bannerMsg = "খসড়া সংরক্ষিত হয়েছে।";
          toast.success("খসড়া সংরক্ষিত হয়েছে");
        } else if (savingAction === "submit") {
          bannerMsg = "বইটি রিভিউয়ের জন্য জমা দেওয়া হয়েছে।";
          toast.success("বইটি রিভিউয়ের জন্য জমা দেওয়া হয়েছে");
          router.push("/author?tab=books&submitted=1");
        } else if (savingAction === "save") {
          bannerMsg = "বইয়ের তথ্য সংরক্ষিত হয়েছে।";
          toast.success("বইয়ের তথ্য সংরক্ষিত হয়েছে");
        } else {
          toast.success(bannerMsg);
        }

        const msgToSet = bannerMsg;
        const actionType = savingAction;
        const timerA = setTimeout(() => {
          setSuccessMsg(msgToSet);
          setSavingAction(null);
          setSavingChapterKey(null);
          setHasRecoveredDraft(false);
          if (actionType === "chapter") {
            setExpandedChapter(null);
          }
        }, 0);

        const timerB = setTimeout(() => {
          setSuccessMsg("");
        }, 4000);

        return () => {
          clearTimeout(timerA);
          clearTimeout(timerB);
        };
      } else if (state.error) {
        if (savingAction === "chapter") {
          toast.error(state.error || "অধ্যায় সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
        } else if (savingAction === "submit") {
          toast.error(state.error || "রিভিউয়ের জন্য জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        } else {
          toast.error(state.error || "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
        }
        const timerErr = setTimeout(() => {
          setSavingAction(null);
          setSavingChapterKey(null);
        }, 0);
        return () => clearTimeout(timerErr);
      }
    }
  }, [state, savingAction, router, draftStorageKey]);

  // ── Error scroll/focus feedback ──────────────────────────────────────
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current.focus();
    }
  }, [state.error]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const isPriceValid = validatePrice(price);
    const isDiscountValid = validateDiscountPrice(discountPrice, price);
    if (!isPriceValid || !isDiscountValid) {
      e.preventDefault();
      const firstInvalidId = !isPriceValid ? "price" : "discountPrice";
      const targetEl = document.getElementById(firstInvalidId);
      targetEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl?.focus();
      return;
    }

    const submitter = (e.nativeEvent as SubmitEvent)?.submitter as HTMLButtonElement | null;
    if (submitter) {
      const intent = submitter.value;
      if (savingAction !== "chapter") {
        if (intent === "submit") setSavingAction("submit");
        else if (intent === "draft") setSavingAction("draft");
        else if (intent === "save") setSavingAction("save");
      }
    } else if (!savingAction) {
      setSavingAction(defaultValues?.status === "PUBLISHED" ? "save" : "draft");
    }
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleFormSubmit}
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
      {hasRecoveredDraft && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-300 font-[family-name:var(--font-bengali)]"
        >
          <div className="flex items-center gap-2">
            <span>⚠️ আপনার সংরক্ষিত না হওয়া পূর্বের খসড়া তথ্য স্বয়ংক্রিয়ভাবে উদ্ধার করা হয়েছে।</span>
          </div>
          <button
            type="button"
            onClick={handleDiscardRecoveredDraft}
            className="self-start sm:self-center rounded-md border border-amber-500/40 bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            খসড়া মুছে ফেলুন
          </button>
        </div>
      )}
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-medium text-brand font-[family-name:var(--font-bengali)]"
        >
          {successMsg}
        </div>
      )}
      {displayGeneralError && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive font-[family-name:var(--font-bengali)] outline-none focus:ring-2 focus:ring-destructive/40"
        >
          {displayGeneralError}
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
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
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
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={`${inputClass} font-[family-name:var(--font-bengali)]`}
            placeholder="বাংলা"
          />
        </div>

        {/* Cover image upload & preview */}
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
          <label className={labelClass}>
            কভার ছবি
          </label>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Visual Preview */}
            <div className="w-28 sm:w-32 flex-shrink-0 shadow-md rounded-lg overflow-hidden border border-border bg-card">
              <BookCoverImage
                key={currentCoverDisplay ?? "empty-cover"}
                src={currentCoverDisplay}
                title={title || "কভার প্রিভিউ"}
                aspectRatio="aspect-[2/3]"
              />
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-3 w-full">
              <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
                ডিভাইসের গ্যালারি অথবা ফাইলস থেকে ২:৩ অনুপাতের স্পষ্ট কভার ছবি আপলোড করুন (JPEG, PNG, WebP — সর্বোচ্চ ৫MB)।
              </p>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                id="coverFile"
                name="coverFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg,image/pjpeg,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
                aria-label="কভার ছবি নির্বাচন করুন"
              />

              {/* Hidden flag if cover was explicitly removed */}
              <input
                type="hidden"
                name="removeCover"
                value={removeCover ? "true" : "false"}
              />

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-[family-name:var(--font-bengali)] text-xs h-9 cursor-pointer"
                >
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
                    className="mr-1.5"
                    aria-hidden="true"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  কভার ছবি নির্বাচন করুন
                </Button>

                {selectedCoverFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelectedFile}
                    className="text-muted-foreground hover:text-destructive font-[family-name:var(--font-bengali)] text-xs h-9"
                  >
                    ছবি বাতিল করুন
                  </Button>
                )}

                {!selectedCoverFile && (defaultValues?.coverImage || manualCoverUrl) && !removeCover && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveExistingCover}
                    className="text-destructive hover:bg-destructive/10 font-[family-name:var(--font-bengali)] text-xs h-9"
                  >
                    কভার মুছে ফেলুন
                  </Button>
                )}

                {removeCover && (
                  <div className="flex items-center gap-2 text-xs font-[family-name:var(--font-bengali)]">
                    <span className="text-destructive font-medium">কভার মুছে ফেলা হবে</span>
                    <button
                      type="button"
                      onClick={handleRestoreExistingCover}
                      className="text-primary underline hover:opacity-80 cursor-pointer"
                    >
                      পূর্বাবস্থায় ফেরান
                    </button>
                  </div>
                )}
              </div>

              {selectedCoverFile && (
                <p className="text-xs text-muted-foreground font-mono">
                  নির্বাচিত: {selectedCoverFile.name} ({(selectedCoverFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}

              {/* Cover validation error (client or server) */}
              {(coverClientError || activeServerCoverError) && (
                <p className="text-xs text-destructive font-[family-name:var(--font-bengali)]">
                  {coverClientError || activeServerCoverError}
                </p>
              )}

              {/* URL fallback toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowUrlOption((prev) => !prev)}
                  className="text-xs text-muted-foreground hover:text-foreground underline font-[family-name:var(--font-bengali)] cursor-pointer"
                >
                  {showUrlOption ? "URL ইনপুট লুকান" : "অথবা ছবির সরাসরি URL ব্যবহার করুন"}
                </button>

                {showUrlOption && (
                  <div className="mt-2 space-y-1">
                    <input
                      id="coverImage"
                      name="coverImage"
                      type="url"
                      value={removeCover ? "" : manualCoverUrl}
                      onChange={(e) => {
                        setManualCoverUrl(e.target.value);
                        if (removeCover) setRemoveCover(false);
                      }}
                      className={inputClass}
                      placeholder="https://example.com/cover.jpg"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                      যদি কোনো ফাইল নির্বাচন না করা থাকে, তবে এই URL কভার হিসেবে সংরক্ষিত হবে।
                    </p>
                  </div>
                )}

                {/* Hidden input to retain manual/existing coverUrl when URL input is collapsed */}
                {!showUrlOption && (
                  <input
                    type="hidden"
                    name="coverImage"
                    value={removeCover ? "" : manualCoverUrl}
                  />
                )}
              </div>
            </div>
          </div>
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
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                step={1}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  validatePrice(e.target.value);
                  if (discountPrice) {
                    validateDiscountPrice(discountPrice, e.target.value);
                  }
                }}
                onBlur={(e) => {
                  validatePrice(e.target.value);
                  if (discountPrice) {
                    validateDiscountPrice(discountPrice, e.target.value);
                  }
                }}
                className={`${inputClass} pl-7 font-[family-name:var(--font-bengali)]`}
                placeholder="১০০"
                aria-describedby={
                  priceClientError || state.fieldErrors?.price ? "price-error" : "price-hint"
                }
              />
            </div>
            <p id="price-hint" className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)।
            </p>
            {(priceClientError || state.fieldErrors?.price?.[0]) && (
              <p id="price-error" className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                {priceClientError || state.fieldErrors?.price?.[0]}
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
                min={100}
                max={300}
                step={1}
                value={discountPrice}
                onChange={(e) => {
                  setDiscountPrice(e.target.value);
                  validateDiscountPrice(e.target.value, price);
                }}
                onBlur={(e) => {
                  validateDiscountPrice(e.target.value, price);
                }}
                className={`${inputClass} pl-7`}
                placeholder="১০০ - ৩০০"
                aria-describedby={
                  discountPriceClientError || state.fieldErrors?.discountPrice
                    ? "discount-price-error"
                    : "discount-price-hint"
                }
              />
            </div>
            <p id="discount-price-hint" className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              ছাড়ের মূল্য ৳১০০ থেকে ৳৩০০ এর মধ্যে হতে হবে (ঐচ্ছিক)।
            </p>
            {(discountPriceClientError || state.fieldErrors?.discountPrice?.[0]) && (
              <p id="discount-price-error" className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]">
                {discountPriceClientError || state.fieldErrors?.discountPrice?.[0]}
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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSaveDraft}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="font-[family-name:var(--font-bengali)] h-8 text-xs cursor-pointer"
            >
              {isPending ? "সংরক্ষণ হচ্ছে…" : "ড্রাফট সংরক্ষণ করুন"}
            </Button>
            <button
              type="button"
              onClick={addChapter}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/20 font-[family-name:var(--font-bengali)]"
            >
              + অধ্যায় যোগ করুন
            </button>
          </div>
        </div>

        {countSubstantiveChapters(chapters) < 5 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 font-[family-name:var(--font-bengali)]">
            বই প্রকাশের জন্য কমপক্ষে ৫টি পূর্ণাঙ্গ ও অর্থপূর্ণ অধ্যায় (প্রতিটিতে অন্তত ৫০ অক্ষর) প্রয়োজন। বর্তমানে {countSubstantiveChapters(chapters)}টি পূর্ণাঙ্গ অধ্যায় রয়েছে। আপনি একটি করে অধ্যায় লিখে ড্রাফট সংরক্ষণ করতে পারেন এবং পরবর্তীতে আরও অধ্যায় যোগ করতে পারবেন।
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
              isPending={isPending}
              isSavingThisChapter={isPending && savingAction === "chapter" && savingChapterKey === ch._key}
              isExpanded={expandedChapter === ch._key}
              onToggle={() =>
                setExpandedChapter((prev) =>
                  prev === ch._key ? null : ch._key
                )
              }
              onChange={(field, value) => updateChapter(ch._key, field, value)}
              onRemove={() => removeChapter(ch._key)}
              onMove={(dir) => moveChapter(ch._key, dir)}
              onSaveChapter={() => handleSaveChapter(ch._key)}
              onSaveDraft={handleSaveDraft}
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
      {displayGeneralError && (
        <div
          aria-hidden="true"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive font-[family-name:var(--font-bengali)]"
        >
          {displayGeneralError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {defaultValues?.status === "PUBLISHED" ? (
          <>
            <Button
              type="submit"
              name="actionIntent"
              value="save"
              onClick={() => setSavingAction("save")}
              disabled={isPending}
              className="font-[family-name:var(--font-bengali)] cursor-pointer"
            >
              {isPending && savingAction === "save" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  সংরক্ষণ হচ্ছে…
                </>
              ) : (
                "পরিবর্তন সংরক্ষণ করুন"
              )}
            </Button>
            <Button
              ref={draftSubmitRef}
              type="submit"
              name="actionIntent"
              value="draft"
              onClick={() => setSavingAction("draft")}
              disabled={isPending}
              variant="outline"
              className="font-[family-name:var(--font-bengali)] cursor-pointer"
            >
              {isPending && savingAction === "draft" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  সংরক্ষণ হচ্ছে…
                </>
              ) : (
                "ড্রাফট সংরক্ষণ করুন"
              )}
            </Button>
            <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              &ldquo;ড্রাফট সংরক্ষণ করুন&rdquo; চাপলে বইটি ড্রাফট তালিকায় স্থানান্তরিত হবে।
            </p>
          </>
        ) : (
          <>
            <Button
              ref={draftSubmitRef}
              type="submit"
              name="actionIntent"
              value="draft"
              onClick={() => setSavingAction("draft")}
              disabled={isPending}
              variant="outline"
              className="font-[family-name:var(--font-bengali)] cursor-pointer"
            >
              {isPending && savingAction === "draft" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  সংরক্ষণ হচ্ছে…
                </>
              ) : (
                "ড্রাফট সংরক্ষণ করুন"
              )}
            </Button>
            <Button
              type="submit"
              name="actionIntent"
              value="submit"
              onClick={() => setSavingAction("submit")}
              disabled={isPending}
              className="font-[family-name:var(--font-bengali)] bg-brand text-brand-foreground hover:bg-brand/90 cursor-pointer"
            >
              {isPending && savingAction === "submit" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  জমা হচ্ছে…
                </>
              ) : (
                "রিভিউয়ের জন্য জমা দিন"
              )}
            </Button>
            <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              বইটি ড্রাফট রাখতে &ldquo;ড্রাফট সংরক্ষণ করুন&rdquo; অথবা অ্যাডমিন অনুমোদনের জন্য পাঠাতে &ldquo;রিভিউয়ের জন্য জমা দিন&rdquo; নির্বাচন করুন।
            </p>
          </>
        )}
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
  isPending?: boolean;
  isSavingThisChapter?: boolean;
  onToggle: () => void;
  onChange: (field: keyof ChapterFormData, value: string | boolean | number) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  onSaveChapter?: () => void;
  onSaveDraft?: () => void;
}

function ChapterEditor({
  chapter,
  index,
  total,
  isExpanded,
  isPending,
  isSavingThisChapter,
  onToggle,
  onChange,
  onRemove,
  onMove,
  onSaveChapter,
  onSaveDraft,
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
          <span>
            {chapter.title || <span className="text-muted-foreground italic">শিরোনাম নেই</span>}
          </span>
          {chapter.content ? (
            <span className="hidden sm:inline-block ml-2 text-[11px] font-normal text-muted-foreground font-mono">
              ({chapter.content.trim().length} অক্ষর)
            </span>
          ) : null}
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

          {/* Chapter Draft Save Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              onClick={onSaveChapter || onSaveDraft}
              disabled={isPending}
              size="sm"
              className="font-[family-name:var(--font-bengali)] gap-1.5 cursor-pointer"
            >
              {isSavingThisChapter ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  অধ্যায় সংরক্ষণ হচ্ছে…
                </>
              ) : (
                "অধ্যায় সংরক্ষণ করুন"
              )}
            </Button>
            <span className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              অধ্যায়টি ড্রাফট হিসেবে সংরক্ষিত থাকবে।
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
