"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Category from "@/models/Category";
import {
  BookUpdateSchema,
  BookPublishSchema,
  generateSlug,
} from "@/validators/book";
import type { ActionResult } from "@/types/author";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && OBJECT_ID_REGEX.test(id);
}

function hasRecordKey(value: unknown, key: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

function isDuplicateSlugError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const maybe = error as {
    code?: unknown;
    keyPattern?: unknown;
    keyValue?: unknown;
  };
  return (
    maybe.code === 11000 &&
    (hasRecordKey(maybe.keyPattern, "slug") || hasRecordKey(maybe.keyValue, "slug"))
  );
}

function getDuplicateSlug(error: unknown, fallback?: string): string | undefined {
  if (typeof error !== "object" || error === null) return fallback;
  const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue;
  return typeof keyValue?.slug === "string" ? keyValue.slug : fallback;
}

function duplicateSlugResult(slug?: string): ActionResult {
  const label = slug ? `"${slug}"` : "This slug";
  return {
    success: false,
    error: `${label} is already in use. Choose another slug.`,
    fieldErrors: { slug: ["This slug is already in use."] },
  };
}

function firstFieldError(
  fieldErrors: Record<string, string[]>,
  fallback: string
): string {
  return Object.values(fieldErrors)[0]?.[0] ?? fallback;
}

function parseChapters(formData: FormData) {
  const chaptersJson = formData.get("chapters");
  if (!chaptersJson || typeof chaptersJson !== "string") return [];
  try {
    const parsed = JSON.parse(chaptersJson);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function parseLearningOutcomes(formData: FormData): string[] {
  const json = formData.get("learningOutcomes");
  if (!json || typeof json !== "string") return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

function formNumber(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return NaN;
  return Number(value);
}

const GENERIC_UPDATE_ERROR = "বই আপডেট করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";

/**
 * Server Action for admin book updates across any author's book.
 * Strictly verifies requireAdmin() and preserves existing book author and status.
 */
export async function adminUpdateBook(
  bookId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 1. Authenticate + authorize as ADMIN
  await requireAdmin();

  // 2. Validate bookId format
  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }

  let attemptedSlug: string | undefined;

  try {
    await dbConnect();

    // 3. Verify book exists
    const existingBook = await Book.findById(bookId)
      .select("_id status slug author")
      .lean();

    if (!existingBook) {
      return {
        success: false,
        error: "বইটি খুঁজে পাওয়া যায়নি",
      };
    }

    // 4. Parse and validate form fields
    const rawSlug = formData.get("slug");
    const rawTitle = formData.get("title");

    const input = {
      title: String(rawTitle ?? ""),
      slug:
        String(rawSlug ?? "").trim() ||
        generateSlug(String(rawTitle ?? "")),
      coverImage: (formData.get("coverImage") as string) || null,
      categoryId: String(formData.get("categoryId") ?? ""),
      language: String(formData.get("language") ?? "বাংলা"),
      summary: String(formData.get("summary") ?? ""),
      description: String(formData.get("description") ?? ""),
      learningOutcomes: parseLearningOutcomes(formData),
      price: formNumber(formData.get("price")),
      discountPrice:
        formData.get("discountPrice") !== "" && formData.get("discountPrice") !== null
          ? formNumber(formData.get("discountPrice"))
          : null,
      chapters: parseChapters(formData),
    };

    const parsed = BookUpdateSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      const firstError = firstFieldError(fieldErrors, "ইনপুট ত্রুটি");
      return { success: false, error: firstError, fieldErrors };
    }

    const data = parsed.data;
    attemptedSlug = data.slug;

    // 5. Validate category exists and is active
    if (!isValidObjectId(data.categoryId)) {
      return { success: false, error: "বৈধ ক্যাটাগরি নির্বাচন করুন" };
    }
    const categoryExists = await Category.exists({ _id: data.categoryId, status: "ACTIVE" });
    if (!categoryExists) {
      return { success: false, error: "নির্বাচিত ক্যাটাগরি পাওয়া যায়নি" };
    }

    // 6. Check slug uniqueness (excluding this book)
    const slugConflict = await Book.exists({
      slug: data.slug,
      _id: { $ne: bookId },
    });
    if (slugConflict) {
      return duplicateSlugResult(data.slug);
    }

    // 7. If existing book is PUBLISHED, enforce strict publish validation requirements
    if (existingBook.status === "PUBLISHED") {
      const publishCheck = BookPublishSchema.safeParse(data);
      if (!publishCheck.success) {
        const fieldErrors = publishCheck.error.flatten().fieldErrors as Record<string, string[]>;
        const firstError =
          firstFieldError(fieldErrors, "প্রকাশিত বইয়ের প্রয়োজনীয় সকল তথ্য পূরণ থাকতে হবে।");
        return { success: false, error: firstError, fieldErrors };
      }
    }

    // 8. Update — only declared content fields; preserve author and status!
    await Book.updateOne(
      { _id: bookId },
      {
        $set: {
          title: data.title,
          slug: data.slug,
          description: data.description,
          coverImage: data.coverImage || null,
          category: data.categoryId,
          price: data.price,
          discountPrice: data.discountPrice ?? null,
          language: data.language,
          summary: data.summary,
          learningOutcomes: data.learningOutcomes,
          chapters: data.chapters.map((ch, i) => ({
            order: ch.order ?? i + 1,
            title: ch.title,
            teaser: ch.teaser ?? "",
            content: ch.content,
            isPreview: ch.isPreview ?? false,
          })),
        },
      }
    );

    // 9. Revalidate relevant paths
    revalidatePath("/admin/books");
    revalidatePath(`/admin/books/${bookId}/edit`);
    revalidatePath("/books");
    revalidatePath(`/books/${existingBook.slug}`);
    if (existingBook.slug !== data.slug) {
      revalidatePath(`/books/${data.slug}`);
    }
    revalidatePath("/author");

    return {
      success: true,
      bookId,
      slug: data.slug,
    };
  } catch (error) {
    console.error("adminUpdateBook error:", error);
    if (isDuplicateSlugError(error)) {
      return duplicateSlugResult(getDuplicateSlug(error, attemptedSlug));
    }
    return { success: false, error: GENERIC_UPDATE_ERROR };
  }
}
