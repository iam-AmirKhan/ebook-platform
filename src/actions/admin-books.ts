"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Category from "@/models/Category";
import Author from "@/models/Author";
import User from "@/models/User";
import {
  BookUpdateSchema,
  BookPublishSchema,
  generateSlug,
} from "@/validators/book";
import type { ActionResult } from "@/types/author";
import { sendAdminBookPublishedEmail } from "@/lib/notifications/admin-book-published";
import { sendAuthorBookPublishedEmail } from "@/lib/notifications/author-book-published";

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

const GENERIC_PUBLISH_ERROR = "বই প্রকাশ করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
const GENERIC_UNPUBLISH_ERROR = "বই প্রত্যাহার করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
const GENERIC_ARCHIVE_ERROR = "বই সংরক্ষণাগারে পাঠানোর সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";

/**
 * Server Action for admins to publish any author's book.
 * Strictly verifies requireAdmin() and preserves author ownership.
 * Transitions DRAFT -> PUBLISHED only.
 * Dispatches publication notifications only on first publication.
 */
export async function adminPublishBook(bookId: string): Promise<ActionResult> {
  // 1. Authenticate + authorize as ADMIN
  await requireAdmin();

  // 2. Validate bookId format
  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }

  try {
    await dbConnect();

    // 3. Fetch book
    const book = await Book.findById(bookId).lean();
    if (!book) {
      return { success: false, error: "বইটি খুঁজে পাওয়া যায়নি" };
    }

    // 4. Status transition rules
    if (book.status === "PUBLISHED") {
      return { success: true, bookId, slug: book.slug };
    }

    if (book.status === "ARCHIVED") {
      return { success: false, error: "সংরক্ষিত বই প্রকাশ করা সম্ভব নয়।" };
    }

    // 5. Validate publish requirements using BookPublishSchema
    const publishCheck = BookPublishSchema.safeParse({
      title: book.title,
      slug: book.slug,
      categoryId: String(book.category),
      language: book.language ?? "বাংলা",
      summary: book.summary ?? "",
      description: book.description,
      learningOutcomes: book.learningOutcomes ?? [],
      price: book.price,
      discountPrice: book.discountPrice,
      coverImage: book.coverImage,
      chapters: book.chapters ?? [],
    });

    if (!publishCheck.success) {
      const fieldErrors = publishCheck.error.flatten().fieldErrors as Record<string, string[]>;
      const firstError = firstFieldError(
        fieldErrors,
        publishCheck.error.flatten().formErrors[0] ??
          "প্রকাশের জন্য প্রয়োজনীয় সকল তথ্য পূরণ থাকতে হবে।"
      );
      return { success: false, error: firstError, fieldErrors };
    }

    const categoryIsActive = await Category.exists({
      _id: book.category,
      status: "ACTIVE",
    });
    if (!categoryIsActive) {
      return { success: false, error: "নির্বাচিত ক্যাটাগরি সক্রিয় নয়" };
    }

    // 6. Set firstPublishedAt only if not set, and atomically transition status
    const isFirstPublication = !book.firstPublishedAt;
    const updateSet: Record<string, unknown> = {
      status: "PUBLISHED",
    };
    if (isFirstPublication) {
      updateSet.firstPublishedAt = new Date();
    }

    const publishResult = await Book.updateOne(
      { _id: bookId, status: "DRAFT" },
      { $set: updateSet }
    );

    if (publishResult.matchedCount === 0) {
      return {
        success: false,
        error: "বইয়ের স্ট্যাটাস পরিবর্তিত হয়েছে। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন।",
      };
    }

    // 7. Send notifications only on first publication, resolving the real author's user account
    if (publishResult.modifiedCount === 1 && isFirstPublication) {
      try {
        const authorDoc = await Author.findById(book.author)
          .select("user penName")
          .lean();

        let authorName = authorDoc?.penName || "লেখক";
        let authorEmail: string | undefined;

        if (authorDoc?.user) {
          const userDoc = await User.findById(authorDoc.user)
            .select("email name")
            .lean();
          if (userDoc) {
            authorEmail = userDoc.email?.trim().toLowerCase();
            if (!authorDoc.penName && userDoc.name) {
              authorName = userDoc.name;
            }
          }
        }

        const notifications: Promise<unknown>[] = [
          sendAdminBookPublishedEmail({
            bookId: String(book._id),
            bookTitle: book.title,
            bookSlug: book.slug,
            authorName,
            price: book.price,
            currency: book.currency || "BDT",
          }),
        ];

        if (authorEmail) {
          notifications.push(
            sendAuthorBookPublishedEmail({
              recipientEmail: authorEmail,
              recipientName: authorName,
              bookTitle: book.title,
              bookSlug: book.slug,
            })
          );
        } else {
          console.warn(
            "[adminPublishBook] Skipped author confirmation email: No verified user email found for author."
          );
        }

        await Promise.allSettled(notifications);
      } catch (notifyErr) {
        console.error(
          "[adminPublishBook] Non-fatal notification error:",
          notifyErr instanceof Error ? notifyErr.message : "Unknown notification error"
        );
      }
    }

    // 8. Revalidate affected paths
    revalidatePath("/admin/books");
    revalidatePath(`/admin/books/${bookId}/edit`);
    revalidatePath("/books");
    revalidatePath(`/books/${book.slug}`);
    revalidatePath("/author");

    return { success: true, bookId, slug: book.slug };
  } catch (error) {
    console.error("adminPublishBook error:", error);
    return { success: false, error: GENERIC_PUBLISH_ERROR };
  }
}

/**
 * Server Action for admins to unpublish any author's book (PUBLISHED -> DRAFT).
 * Strictly verifies requireAdmin() and preserves author ownership and firstPublishedAt.
 */
export async function adminUnpublishBook(bookId: string): Promise<ActionResult> {
  // 1. Authenticate + authorize as ADMIN
  await requireAdmin();

  // 2. Validate bookId format
  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }

  try {
    await dbConnect();

    // 3. Check existing book
    const book = await Book.findById(bookId).select("_id slug status").lean();
    if (!book) {
      return { success: false, error: "বইটি খুঁজে পাওয়া যায়নি" };
    }

    // 4. Status transition rules
    if (book.status === "DRAFT") {
      return { success: true, bookId, slug: book.slug };
    }

    if (book.status === "ARCHIVED") {
      return { success: false, error: "সংরক্ষিত বই অপ্রকাশিত করা সম্ভব নয়।" };
    }

    // 5. Atomic status update
    const unpublishResult = await Book.updateOne(
      { _id: bookId, status: "PUBLISHED" },
      { $set: { status: "DRAFT" } }
    );

    if (unpublishResult.matchedCount === 0) {
      return {
        success: false,
        error: "বইয়ের স্ট্যাটাস পরিবর্তিত হয়েছে। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন।",
      };
    }

    // 6. Revalidate affected paths
    revalidatePath("/admin/books");
    revalidatePath(`/admin/books/${bookId}/edit`);
    revalidatePath("/books");
    revalidatePath(`/books/${book.slug}`);
    revalidatePath("/author");

    return { success: true, bookId, slug: book.slug };
  } catch (error) {
    console.error("adminUnpublishBook error:", error);
    return { success: false, error: GENERIC_UNPUBLISH_ERROR };
  }
}

/**
 * Server Action for admins to archive any author's book (DRAFT/PUBLISHED -> ARCHIVED).
 * Strictly verifies requireAdmin() and preserves author ownership and firstPublishedAt.
 */
export async function adminArchiveBook(bookId: string): Promise<ActionResult> {
  // 1. Authenticate + authorize as ADMIN
  await requireAdmin();

  // 2. Validate bookId format
  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }

  try {
    await dbConnect();

    // 3. Check existing book
    const book = await Book.findById(bookId).select("_id slug status").lean();
    if (!book) {
      return { success: false, error: "বইটি খুঁজে পাওয়া যায়নি" };
    }

    // 4. Status transition rules
    if (book.status === "ARCHIVED") {
      return { success: true, bookId, slug: book.slug };
    }

    // 5. Atomic status update
    const archiveResult = await Book.updateOne(
      { _id: bookId, status: { $in: ["DRAFT", "PUBLISHED"] } },
      { $set: { status: "ARCHIVED" } }
    );

    if (archiveResult.matchedCount === 0) {
      return {
        success: false,
        error: "বইয়ের স্ট্যাটাস পরিবর্তিত হয়েছে। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন।",
      };
    }

    // 6. Revalidate affected paths
    revalidatePath("/admin/books");
    revalidatePath(`/admin/books/${bookId}/edit`);
    revalidatePath("/books");
    revalidatePath(`/books/${book.slug}`);
    revalidatePath("/author");

    return { success: true, bookId, slug: book.slug };
  } catch (error) {
    console.error("adminArchiveBook error:", error);
    return { success: false, error: GENERIC_ARCHIVE_ERROR };
  }
}
