"use server";

/**
 * Server Actions for author book management.
 *
 * SECURITY CONTRACT
 * -----------------
 * - Every action calls requireAuthor() first. This redirects to /forbidden
 *   for unauthenticated users and users without AUTHOR/ADMIN role.
 * - Author identity is ALWAYS derived from the session (session.user.id →
 *   Author record lookup). Client-supplied author IDs are never trusted.
 * - Ownership is verified before any mutation: Book.author must equal the
 *   session user's Author._id.
 * - All inputs are validated with Zod before any database operation.
 * - Only declared fields are written — no mass assignment.
 * - ObjectId format is validated before DB queries.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthor } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Category from "@/models/Category";
import Author from "@/models/Author";
import User from "@/models/User";
import {
  BookCreateSchema,
  BookUpdateSchema,
  BookPublishSchema,
  generateSlug,
} from "@/validators/book";
import type { ActionResult } from "@/types/author";
import type { Types } from "mongoose";
import { sendAdminBookPublishedEmail } from "@/lib/notifications/admin-book-published";
import { sendAuthorBookPublishedEmail } from "@/lib/notifications/author-book-published";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && OBJECT_ID_REGEX.test(id);
}

class PublicActionError extends Error {
  name = "PublicActionError";
}

const GENERIC_CREATE_ERROR = "Could not create the book. Please try again.";
const GENERIC_UPDATE_ERROR = "Could not update the book. Please try again.";
const GENERIC_PUBLISH_ERROR = "Could not publish the book. Please try again.";
const GENERIC_UNPUBLISH_ERROR = "Could not unpublish the book. Please try again.";
const GENERIC_ARCHIVE_ERROR = "Could not archive the book. Please try again.";

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

function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof PublicActionError) return error.message;
  return fallback;
}

function firstFieldError(
  fieldErrors: Record<string, string[]>,
  fallback: string
): string {
  return Object.values(fieldErrors)[0]?.[0] ?? fallback;
}

/**
 * Resolve the Author document for the current session user.
 * Returns { authorId } or throws to be caught by the action.
 */
async function resolveAuthorId(userId: string): Promise<string> {
  await dbConnect();
  const author = await Author.findOne({ user: userId, status: "ACTIVE" })
    .select("_id")
    .lean();
  if (!author) {
    throw new PublicActionError("Active author profile not found.");
  }
  return String(author._id);
}

/** Parse chapters from a FormData structure where chapter data is JSON-encoded. */
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

/** Parse learning outcomes from a FormData structure where the value is JSON. */
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

/** Convert a FormData value to a number, returning NaN if not parseable. */
function formNumber(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return NaN;
  return Number(value);
}

// ---------------------------------------------------------------------------
// createBook
// ---------------------------------------------------------------------------

export async function createBook(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 1. Authenticate + authorize
  const user = await requireAuthor();
  let attemptedSlug: string | undefined;

  try {
    // 2. Resolve Author._id from session
    const authorId = await resolveAuthorId(user.id);

    // 3. Parse and validate form data
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

    const parsed = BookCreateSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      const firstError = firstFieldError(fieldErrors, "ইনপুট ত্রুটি");
      return { success: false, error: firstError, fieldErrors };
    }

    const data = parsed.data;
    attemptedSlug = data.slug;

    // 4. Validate category exists
    if (!isValidObjectId(data.categoryId)) {
      return { success: false, error: "বৈধ ক্যাটাগরি নির্বাচন করুন" };
    }
    const categoryExists = await Category.exists({ _id: data.categoryId, status: "ACTIVE" });
    if (!categoryExists) {
      return { success: false, error: "নির্বাচিত ক্যাটাগরি পাওয়া যায়নি" };
    }

    // 5. Check slug uniqueness
    const slugTaken = await Book.exists({ slug: data.slug });
    if (slugTaken) {
      return duplicateSlugResult(data.slug);
    }

    // 6. Create the book as DRAFT
    const book = await Book.create({
      title: data.title,
      slug: data.slug,
      description: data.description,
      coverImage: data.coverImage || null,
      author: authorId as unknown as Types.ObjectId,
      category: data.categoryId as unknown as Types.ObjectId,
      price: data.price,
      discountPrice: data.discountPrice ?? null,
      currency: "BDT",
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
      status: "DRAFT",
    });

    revalidatePath("/author");

    return {
      success: true,
      bookId: String(book._id),
      slug: book.slug,
    };
  } catch (error) {
    console.error("createBook error:", error);
    if (isDuplicateSlugError(error)) {
      return duplicateSlugResult(getDuplicateSlug(error, attemptedSlug));
    }
    return { success: false, error: publicErrorMessage(error, GENERIC_CREATE_ERROR) };
  }
}

// ---------------------------------------------------------------------------
// updateBook
// ---------------------------------------------------------------------------

export async function updateBook(
  bookId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 1. Authenticate + authorize
  const user = await requireAuthor();

  // 2. Validate bookId format
  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }
  let attemptedSlug: string | undefined;

  try {
    // 3. Resolve Author._id from session
    const authorId = await resolveAuthorId(user.id);

    // 4. Verify book ownership
    const existingBook = await Book.findOne({
      _id: bookId,
      author: authorId,
    })
      .select("_id status slug")
      .lean();

    if (!existingBook) {
      return {
        success: false,
        error: "বইটি পাওয়া যায়নি অথবা আপনার এটি সম্পাদনার অধিকার নেই",
      };
    }

    // 5. Parse and validate
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

    // 6. Validate category exists
    if (!isValidObjectId(data.categoryId)) {
      return { success: false, error: "বৈধ ক্যাটাগরি নির্বাচন করুন" };
    }
    const categoryExists = await Category.exists({ _id: data.categoryId, status: "ACTIVE" });
    if (!categoryExists) {
      return { success: false, error: "নির্বাচিত ক্যাটাগরি পাওয়া যায়নি" };
    }

    // 7. Check slug uniqueness (excluding this book)
    const slugConflict = await Book.exists({
      slug: data.slug,
      _id: { $ne: bookId },
    });
    if (slugConflict) {
      return duplicateSlugResult(data.slug);
    }

    if (existingBook.status === "PUBLISHED") {
      const publishCheck = BookPublishSchema.safeParse(data);
      if (!publishCheck.success) {
        const fieldErrors = publishCheck.error.flatten().fieldErrors as Record<string, string[]>;
        const firstError =
          firstFieldError(fieldErrors, "Published books must keep all required publish fields complete.");
        return { success: false, error: firstError, fieldErrors };
      }
    }

    // 8. Update — only declared fields, no mass assignment
    await Book.updateOne(
      { _id: bookId, author: authorId },
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

    // 9. Revalidate relevant paths (non-fatal post-save side effects)
    try {
      revalidatePath("/author");
      revalidatePath(`/author/books/${bookId}/edit`);
      if (existingBook.slug) {
        revalidatePath(`/books/${existingBook.slug}`);
      }
      if (existingBook.slug !== data.slug) {
        revalidatePath(`/books/${data.slug}`);
      }
    } catch (revalidateError) {
      console.warn("[updateBook] Non-fatal revalidation error:", revalidateError);
    }

    return { success: true, bookId, slug: data.slug };
  } catch (error) {
    console.error("updateBook error:", error);
    if (isDuplicateSlugError(error)) {
      return duplicateSlugResult(getDuplicateSlug(error, attemptedSlug));
    }
    return { success: false, error: publicErrorMessage(error, GENERIC_UPDATE_ERROR) };
  }
}

// ---------------------------------------------------------------------------
// publishBook
// ---------------------------------------------------------------------------

export async function publishBook(bookId: string): Promise<ActionResult> {
  // 1. Authenticate + authorize
  const user = await requireAuthor();

  // 2. Validate bookId format
  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }

  try {
    // 3. Resolve Author._id from session
    const authorId = await resolveAuthorId(user.id);

    // 4. Fetch the book with full data to validate publish requirements
    const book = await Book.findOne({
      _id: bookId,
      author: authorId,
    }).lean();

    if (!book) {
      return {
        success: false,
        error: "বইটি পাওয়া যায়নি অথবা আপনার এটি প্রকাশের অধিকার নেই",
      };
    }

    if (book.status === "PUBLISHED") {
      return { success: true, bookId, slug: book.slug }; // already published
    }

    if (book.status === "ARCHIVED") {
      return { success: false, error: "Archived books cannot be published." };
    }

    // 5. Validate publish requirements using the stricter schema
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
      const firstError =
        firstFieldError(
          publishCheck.error.flatten().fieldErrors as Record<string, string[]>,
          publishCheck.error.flatten().formErrors[0] ??
            "প্রকাশের জন্য প্রয়োজনীয় তথ্য পূরণ করুন"
        );
      return { success: false, error: firstError };
    }

    const categoryIsActive = await Category.exists({
      _id: book.category,
      status: "ACTIVE",
    });
    if (!categoryIsActive) {
      return { success: false, error: "Choose an active category before publishing." };
    }

    // 6. Set status to PUBLISHED
    const isFirstPublication = !book.firstPublishedAt;
    const updateSet: Record<string, unknown> = { status: "PUBLISHED" };
    if (isFirstPublication) {
      updateSet.firstPublishedAt = new Date();
    }

    const publishResult = await Book.updateOne(
      { _id: bookId, author: authorId, status: "DRAFT" },
      { $set: updateSet }
    );

    if (publishResult.matchedCount === 0) {
      return {
        success: false,
        error: "Book status changed. Refresh the dashboard and try again.",
      };
    }

    if (publishResult.modifiedCount === 1 && isFirstPublication) {
      try {
        const [authorDoc, userDoc] = await Promise.all([
          Author.findById(authorId).select("penName").lean(),
          User.findById(user.id).select("email name").lean(),
        ]);

        const authorName = authorDoc?.penName || userDoc?.name || user.name || "লেখক";
        const authorEmail = (userDoc?.email || user.email)?.trim().toLowerCase();

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
            "[publishBook] Skipped author confirmation email: No verified user email found."
          );
        }

        await Promise.allSettled(notifications);
      } catch (notifyErr) {
        console.error(
          "[publishBook] Non-fatal notification error:",
          notifyErr instanceof Error ? notifyErr.message : "Unknown notification error"
        );
      }
    }

    revalidatePath("/author");
    revalidatePath("/books");
    revalidatePath(`/books/${book.slug}`);

    return { success: true, bookId, slug: book.slug };
  } catch (error) {
    console.error("publishBook error:", error);
    return { success: false, error: publicErrorMessage(error, GENERIC_PUBLISH_ERROR) };
  }
}

// ---------------------------------------------------------------------------
// unpublishBook — revert PUBLISHED → DRAFT
// ---------------------------------------------------------------------------

export async function unpublishBook(bookId: string): Promise<ActionResult> {
  const user = await requireAuthor();

  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }

  try {
    const authorId = await resolveAuthorId(user.id);

    const book = await Book.findOne({ _id: bookId, author: authorId })
      .select("_id slug status")
      .lean();

    if (!book) {
      return { success: false, error: "বইটি পাওয়া যায়নি" };
    }

    if (book.status === "ARCHIVED") {
      return { success: false, error: "Archived books cannot be unpublished." };
    }

    if (book.status === "DRAFT") {
      return { success: true, bookId };
    }

    const unpublishResult = await Book.updateOne(
      { _id: bookId, author: authorId, status: "PUBLISHED" },
      { $set: { status: "DRAFT" } }
    );

    if (unpublishResult.matchedCount === 0) {
      return {
        success: false,
        error: "Book status changed. Refresh the dashboard and try again.",
      };
    }

    revalidatePath("/author");
    revalidatePath("/books");
    revalidatePath(`/books/${book.slug}`);

    return { success: true, bookId };
  } catch (error) {
    console.error("unpublishBook error:", error);
    return { success: false, error: publicErrorMessage(error, GENERIC_UNPUBLISH_ERROR) };
  }
}

// ---------------------------------------------------------------------------
// archiveBook — soft-delete via status: ARCHIVED
// ---------------------------------------------------------------------------

export async function archiveBook(bookId: string): Promise<ActionResult> {
  const user = await requireAuthor();

  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }

  try {
    const authorId = await resolveAuthorId(user.id);

    const book = await Book.findOne({ _id: bookId, author: authorId })
      .select("_id slug status")
      .lean();

    if (!book) {
      return { success: false, error: "বইটি পাওয়া যায়নি" };
    }

    if (book.status === "ARCHIVED") {
      return { success: true, bookId };
    }

    const archiveResult = await Book.updateOne(
      { _id: bookId, author: authorId, status: { $in: ["DRAFT", "PUBLISHED"] } },
      { $set: { status: "ARCHIVED" } }
    );

    if (archiveResult.matchedCount === 0) {
      return {
        success: false,
        error: "Book status changed. Refresh the dashboard and try again.",
      };
    }

    revalidatePath("/author");
    revalidatePath("/books");
    revalidatePath(`/books/${book.slug}`);

    return { success: true, bookId };
  } catch (error) {
    console.error("archiveBook error:", error);
    return { success: false, error: publicErrorMessage(error, GENERIC_ARCHIVE_ERROR) };
  }
}

// ---------------------------------------------------------------------------
// createBookAndRedirect — used by the new book form to redirect after creation
// ---------------------------------------------------------------------------

export async function createBookAndRedirect(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const result = await createBook(prevState, formData);

  if (result.success && result.bookId) {
    redirect(`/author/books/${result.bookId}/edit?created=1`);
  }

  return result;
}
