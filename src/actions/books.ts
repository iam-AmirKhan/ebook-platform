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

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthor } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import Book, { type BookStatus } from "@/models/Book";
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
import { uploadCoverToGridFS } from "@/lib/storage/gridfs";

function safeRevalidatePath(pathStr: string): void {
  try {
    revalidatePath(pathStr);
  } catch {
    // Safe fallback when invoked outside Next.js request context (e.g. unit/regression tests)
  }
}

type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp";

/**
 * Detect image format from binary magic bytes.
 * Validates JPEG (SOI), PNG (signature + IHDR), and WebP (RIFF + WEBP + VP8/VP8L/VP8X).
 */
function detectImageFormat(buffer: Buffer): {
  mimeType: AllowedImageMime;
  extension: "jpg" | "png" | "webp";
} | null {
  if (!buffer || buffer.length < 24) {
    return null;
  }

  // 1. JPEG: SOI marker 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  // 2. PNG: 8-byte signature 89 50 4E 47 0D 0A 1A 0A followed by IHDR chunk
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    const chunkType = buffer.toString("ascii", 12, 16);
    if (chunkType === "IHDR") {
      return { mimeType: "image/png", extension: "png" };
    }
  }

  // 3. WebP: RIFF [4 bytes size] WEBP [VP8 | VP8L | VP8X]
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunkType = buffer.toString("ascii", 12, 16);
    if (chunkType === "VP8 " || chunkType === "VP8L" || chunkType === "VP8X") {
      return { mimeType: "image/webp", extension: "webp" };
    }
  }

  return null;
}

function isUploadFile(value: unknown): value is File {
  // A real upload must have actual bytes. An empty File (size=0, name="")
  // is what browsers send when a file input has no file selected — it must
  // NOT be treated as a new upload.
  return (
    (value instanceof File && value.size > 0) ||
    (typeof value === "object" &&
      value !== null &&
      !(value instanceof File) &&
      typeof (value as Blob).arrayBuffer === "function" &&
      typeof (value as File).size === "number" &&
      (value as File).size > 0)
  );
}

export async function handleBookCoverUpload(
  formData: FormData,
  authorId: string,
  existingCover?: string | null
): Promise<{ success: boolean; coverUrl?: string | null; error?: string }> {
  const removeCover = formData.get("removeCover") === "true";
  if (removeCover) {
    return { success: true, coverUrl: null };
  }

  const coverFile = formData.get("coverFile");
  if (isUploadFile(coverFile)) {
    // 1. Max size: 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (coverFile.size > MAX_SIZE) {
      return {
        success: false,
        error: "কভার ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারে।",
      };
    }

    // 2. Reject explicitly non-image MIME types (e.g. application/pdf, text/plain)
    const reportedMime = (coverFile.type || "").split(";")[0].trim().toLowerCase();
    const FORBIDDEN_MIMES = [
      "application/pdf",
      "text/plain",
      "application/x-msdownload",
      "application/zip",
      "application/x-rar-compressed",
    ];
    if (
      FORBIDDEN_MIMES.includes(reportedMime) ||
      reportedMime.startsWith("video/") ||
      reportedMime.startsWith("audio/")
    ) {
      return {
        success: false,
        error: "শুধুমাত্র JPEG, PNG অথবা WebP ফরম্যাটের ছবি গ্রহণযোগ্য।",
      };
    }

    // 3. Binary magic bytes validation & format detection
    const buffer = Buffer.from(await coverFile.arrayBuffer());
    const detected = detectImageFormat(buffer);
    if (!detected) {
      return {
        success: false,
        error: "শুধুমাত্র JPEG, PNG অথবা WebP ফরম্যাটের ছবি গ্রহণযোগ্য।",
      };
    }

    const { mimeType, extension: ext } = detected;

    // 4. Save to MongoDB GridFS durable storage
    const safeFileName = `cover-${authorId}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}.${ext}`;

    const gridFsFile = await uploadCoverToGridFS(
      buffer,
      safeFileName,
      mimeType,
      { authorId }
    );

    // 5. Best-effort local file write for local development caching
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "covers");
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, safeFileName), buffer);
    } catch {
      // Ignored in read-only / serverless environments (e.g. Vercel)
    }

    return { success: true, coverUrl: `/api/covers/${gridFsFile.id}` };
  }

  // If no file uploaded, check for explicit coverImage input URL or fallback to existingCover
  const manualCoverImage = (formData.get("coverImage") as string)?.trim();
  if (manualCoverImage) {
    return { success: true, coverUrl: manualCoverImage };
  }

  // Preserve existing cover if not explicitly removed
  return { success: true, coverUrl: existingCover ?? null };
}

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
    // Ignore completely empty untouched chapter stubs so authors can save drafts incrementally
    const nonEmpty = parsed.filter((ch) => {
      if (!ch || typeof ch !== "object") return false;
      const title = typeof ch.title === "string" ? ch.title.trim() : "";
      const content = typeof ch.content === "string" ? ch.content.trim() : "";
      const teaser = typeof ch.teaser === "string" ? ch.teaser.trim() : "";
      return title.length > 0 || content.length > 0 || teaser.length > 0;
    });
    return nonEmpty.map((ch, idx) => ({
      ...ch,
      order: idx + 1,
    }));
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

    // 3. Process cover image upload / URL
    const coverUploadRes = await handleBookCoverUpload(formData, authorId);
    if (!coverUploadRes.success) {
      const err = coverUploadRes.error || "কভার ছবি আপলোড ব্যর্থ হয়েছে";
      return { success: false, error: err, fieldErrors: { coverImage: [err] } };
    }

    // 4. Parse and validate form data
    const rawSlug = formData.get("slug");
    const rawTitle = formData.get("title");

    const input = {
      title: String(rawTitle ?? ""),
      slug:
        String(rawSlug ?? "").trim() ||
        generateSlug(String(rawTitle ?? "")),
      coverImage: coverUploadRes.coverUrl || null,
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

    const actionIntent = String(formData.get("actionIntent") || "").trim().toLowerCase();
    const isSubmitIntent = actionIntent === "submit" || actionIntent === "publish";

    if (isSubmitIntent) {
      const publishCheck = BookPublishSchema.safeParse(data);
      if (!publishCheck.success) {
        const fieldErrors = publishCheck.error.flatten().fieldErrors as Record<string, string[]>;
        const firstError = firstFieldError(
          fieldErrors,
          "রিভিউয়ের জন্য জমা দেওয়ার আগে প্রয়োজনীয় সকল তথ্য ও কমপক্ষে ৫টি পূর্ণাঙ্গ অধ্যায় পূরণ থাকতে হবে।"
        );
        return { success: false, error: firstError, fieldErrors };
      }
    }

    const targetStatus: BookStatus = isSubmitIntent ? "PENDING_REVIEW" : "DRAFT";

    // 6. Create the book as DRAFT or PENDING_REVIEW
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
      status: targetStatus,
    });

    safeRevalidatePath("/author");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/books");

    return {
      success: true,
      bookId: String(book._id),
      slug: book.slug,
      coverUrl: (book.coverImage as string | null) ?? null,
      message: isSubmitIntent
        ? "বইটি সফলভাবে রিভিউয়ের জন্য জমা দেওয়া হয়েছে"
        : "খসড়া সংরক্ষিত হয়েছে",
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
      .select("_id status slug coverImage firstPublishedAt")
      .lean();

    if (!existingBook) {
      return {
        success: false,
        error: "বইটি পাওয়া যায়নি অথবা আপনার এটি সম্পাদনার অধিকার নেই",
      };
    }

    // 5. Process cover image upload / URL (preserves existing cover if not modified)
    const coverUploadRes = await handleBookCoverUpload(formData, authorId, existingBook.coverImage);
    if (!coverUploadRes.success) {
      const err = coverUploadRes.error || "কভার ছবি আপলোড ব্যর্থ হয়েছে";
      return { success: false, error: err, fieldErrors: { coverImage: [err] } };
    }

    // 6. Parse and validate
    const rawSlug = formData.get("slug");
    const rawTitle = formData.get("title");
    const actionIntent = String(formData.get("actionIntent") || "").trim().toLowerCase();

    const input = {
      title: String(rawTitle ?? ""),
      slug:
        String(rawSlug ?? "").trim() ||
        generateSlug(String(rawTitle ?? "")),
      coverImage: coverUploadRes.coverUrl || null,
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

    // 7. Validate category exists
    if (!isValidObjectId(data.categoryId)) {
      return { success: false, error: "বৈধ ক্যাটাগরি নির্বাচন করুন" };
    }
    const categoryExists = await Category.exists({ _id: data.categoryId, status: "ACTIVE" });
    if (!categoryExists) {
      return { success: false, error: "নির্বাচিত ক্যাটাগরি পাওয়া যায়নি" };
    }

    // 8. Check slug uniqueness (excluding this book)
    const slugConflict = await Book.exists({
      slug: data.slug,
      _id: { $ne: bookId },
    });
    if (slugConflict) {
      return duplicateSlugResult(data.slug);
    }

    // 9. Status transition rules
    const isDraftIntent = actionIntent === "draft";
    const isSubmitIntent = actionIntent === "submit" || actionIntent === "publish";
    const isSaveIntent = actionIntent === "save";

    let targetStatus: BookStatus = existingBook.status;
    if (isDraftIntent) {
      targetStatus = "DRAFT";
    } else if (isSubmitIntent) {
      // Authors CANNOT publish directly. Any submit/publish intent sets status to PENDING_REVIEW
      if (existingBook.status !== "PUBLISHED") {
        targetStatus = "PENDING_REVIEW";
      }
    } else if (isSaveIntent) {
      // BUG-002: ordinary save preserves existing status
      targetStatus = existingBook.status;
    }

    // Authors can NEVER transition to PUBLISHED directly:
    if (existingBook.status !== "PUBLISHED" && targetStatus === "PUBLISHED") {
      targetStatus = "PENDING_REVIEW";
    }

    // If submitting for review (transitioning to PENDING_REVIEW), enforce BookPublishSchema
    if (targetStatus === "PENDING_REVIEW" && isSubmitIntent) {
      const publishCheck = BookPublishSchema.safeParse(data);
      if (!publishCheck.success) {
        const fieldErrors = publishCheck.error.flatten().fieldErrors as Record<string, string[]>;
        const firstError = firstFieldError(
          fieldErrors,
          "রিভিউয়ের জন্য জমা দেওয়ার আগে প্রয়োজনীয় সকল তথ্য ও কমপক্ষে ৫টি পূর্ণাঙ্গ অধ্যায় পূরণ থাকতে হবে।"
        );
        return { success: false, error: firstError, fieldErrors };
      }
    }

    // 10. Update MongoDB record
    const updateSet: Record<string, unknown> = {
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
      status: targetStatus,
    };

    if (targetStatus === "DRAFT" && existingBook.status === "PUBLISHED") {
      updateSet.displayOrder = 10000;
    }

    const isFirstPublication = targetStatus === "PUBLISHED" && !existingBook.firstPublishedAt;
    if (isFirstPublication) {
      updateSet.firstPublishedAt = new Date();
    }

    await Book.updateOne(
      { _id: bookId, author: authorId },
      { $set: updateSet }
    );

    if (isFirstPublication) {
      try {
        const [authorDoc, userDoc] = await Promise.all([
          Author.findById(authorId).select("penName").lean(),
          User.findById(user.id).select("email name").lean(),
        ]);

        const authorName = authorDoc?.penName || userDoc?.name || user.name || "লেখক";
        const authorEmail = (userDoc?.email || user.email)?.trim().toLowerCase();

        const notifications: Promise<unknown>[] = [
          sendAdminBookPublishedEmail({
            bookId: String(bookId),
            bookTitle: data.title,
            bookSlug: data.slug,
            authorName,
            price: data.price,
            currency: "BDT",
          }),
        ];

        if (authorEmail) {
          notifications.push(
            sendAuthorBookPublishedEmail({
              recipientEmail: authorEmail,
              recipientName: authorName,
              bookTitle: data.title,
              bookSlug: data.slug,
            })
          );
        }

        await Promise.allSettled(notifications);
      } catch (notifyErr) {
        console.error(
          "[updateBook] Non-fatal notification error:",
          notifyErr instanceof Error ? notifyErr.message : "Unknown notification error"
        );
      }
    }

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

    return {
      success: true,
      bookId,
      slug: data.slug,
      coverUrl: (updateSet.coverImage as string | null) ?? null,
      message:
        targetStatus === "PENDING_REVIEW"
          ? "বইটি সফলভাবে রিভিউয়ের জন্য জমা দেওয়া হয়েছে"
          : targetStatus === "PUBLISHED"
          ? "বইয়ের তথ্য সংরক্ষিত হয়েছে"
          : "খসড়া সংরক্ষিত হয়েছে",
    };
  } catch (error) {
    console.error("updateBook error:", error);
    if (isDuplicateSlugError(error)) {
      return duplicateSlugResult(getDuplicateSlug(error, attemptedSlug));
    }
    return { success: false, error: publicErrorMessage(error, GENERIC_UPDATE_ERROR) };
  }
}

// ---------------------------------------------------------------------------
// submitBookForReview — author submits book for admin approval
// ---------------------------------------------------------------------------

export async function submitBookForReview(bookId: string): Promise<ActionResult> {
  // 1. Authenticate + authorize as author
  const user = await requireAuthor();

  // 2. Validate bookId format
  if (!isValidObjectId(bookId)) {
    return { success: false, error: "বৈধ বই আইডি নয়" };
  }

  try {
    // 3. Resolve Author._id from session
    const authorId = await resolveAuthorId(user.id);

    // 4. Fetch the book to validate publish readiness requirements
    const book = await Book.findOne({
      _id: bookId,
      author: authorId,
    }).lean();

    if (!book) {
      return {
        success: false,
        error: "বইটি পাওয়া যায়নি অথবা আপনার এটি সম্পাদনার অধিকার নেই",
      };
    }

    if (book.status === "PUBLISHED") {
      return { success: false, error: "বইটি ইতিমধ্যে প্রকাশিত আছে।" };
    }

    if (book.status === "ARCHIVED") {
      return { success: false, error: "সংরক্ষিত বই রিভিউতে পাঠানো সম্ভব নয়।" };
    }

    // 5. Validate publication readiness requirements
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
            "রিভিউয়ের জন্য জমা দেওয়ার আগে প্রয়োজনীয় সকল তথ্য ও কমপক্ষে ৫টি পূর্ণাঙ্গ অধ্যায় পূরণ থাকতে হবে।"
        );
      return { success: false, error: firstError };
    }

    const categoryIsActive = await Category.exists({
      _id: book.category,
      status: "ACTIVE",
    });
    if (!categoryIsActive) {
      return { success: false, error: "রিভিউতে জমা দেওয়ার আগে একটি সক্রিয় ক্যাটাগরি নির্বাচন করুন।" };
    }

    // 6. Atomically transition status to PENDING_REVIEW
    const updateRes = await Book.updateOne(
      { _id: bookId, author: authorId, status: { $in: ["DRAFT", "PENDING_REVIEW"] } },
      { $set: { status: "PENDING_REVIEW" } }
    );

    if (updateRes.matchedCount === 0) {
      return {
        success: false,
        error: "বইয়ের স্ট্যাটাস পরিবর্তিত হয়েছে। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন।",
      };
    }

    safeRevalidatePath("/author");
    safeRevalidatePath(`/author/books/${bookId}/edit`);
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/books");

    return {
      success: true,
      bookId,
      slug: book.slug,
      message: "বইটি সফলভাবে রিভিউয়ের জন্য জমা দেওয়া হয়েছে",
    };
  } catch (error) {
    console.error("submitBookForReview error:", error);
    return { success: false, error: "রিভিউয়ের জন্য জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" };
  }
}

// ---------------------------------------------------------------------------
// publishBook — STRICTLY BLOCKED for authors (Admin-only capability)
// ---------------------------------------------------------------------------

export async function publishBook(_bookId: string): Promise<ActionResult> {
  void _bookId;
  return {
    success: false,
    error: "লেখকদের সরাসরি বই প্রকাশের অনুমতি নেই। অনুগ্রহ করে রিভিউয়ের জন্য জমা দিন।",
  };
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
      { $set: { status: "DRAFT", displayOrder: 10000 } }
    );

    if (unpublishResult.matchedCount === 0) {
      return {
        success: false,
        error: "Book status changed. Refresh the dashboard and try again.",
      };
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/author");
    safeRevalidatePath("/books");
    safeRevalidatePath(`/books/${book.slug}`);

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
      { _id: bookId, author: authorId, status: { $in: ["DRAFT", "PENDING_REVIEW", "PUBLISHED"] } },
      { $set: { status: "ARCHIVED", displayOrder: 10000 } }
    );

    if (archiveResult.matchedCount === 0) {
      return {
        success: false,
        error: "Book status changed. Refresh the dashboard and try again.",
      };
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/author");
    safeRevalidatePath("/books");
    safeRevalidatePath(`/books/${book.slug}`);

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
    const actionIntent = String(formData.get("actionIntent") || "").trim().toLowerCase();
    if (actionIntent === "submit" || actionIntent === "publish") {
      redirect(`/author?tab=books&submitted=1`);
    } else {
      redirect(`/author/books/${result.bookId}/edit?created=1`);
    }
  }

  return result;
}
