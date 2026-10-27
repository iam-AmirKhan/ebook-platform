"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import Book, { type BookStatus } from "@/models/Book";
import Category from "@/models/Category";
import Author from "@/models/Author";
import User from "@/models/User";
import {
  BookUpdateSchema,
  BookPublishSchema,
  generateSlug,
} from "@/validators/book";
import type { ActionResult } from "@/types/author";
import { handleBookCoverUpload } from "@/actions/books";
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
    // Ignore completely empty untouched chapter stubs so drafts can be saved incrementally
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
      .select("_id status slug author coverImage firstPublishedAt")
      .lean();

    if (!existingBook) {
      return {
        success: false,
        error: "বইটি খুঁজে পাওয়া যায়নি",
      };
    }

    // 4. Process cover image upload / URL (preserves existing cover if not modified)
    const coverUploadRes = await handleBookCoverUpload(
      formData,
      String(existingBook.author),
      existingBook.coverImage
    );
    if (!coverUploadRes.success) {
      const err = coverUploadRes.error || "কভার ছবি আপলোড ব্যর্থ হয়েছে";
      return { success: false, error: err, fieldErrors: { coverImage: [err] } };
    }

    // 5. Parse and validate form fields
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

    // 6. Validate category exists and is active
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

    // 8. Status transition rules
    const isDraftIntent = actionIntent === "draft";
    const isPublishIntent = actionIntent === "publish";

    let targetStatus: BookStatus = existingBook.status;
    if (isDraftIntent) {
      targetStatus = "DRAFT";
    } else if (isPublishIntent) {
      targetStatus = "PUBLISHED";
    }

    // 9. If target status is PUBLISHED, enforce strict publish validation requirements
    if (targetStatus === "PUBLISHED") {
      const publishCheck = BookPublishSchema.safeParse(data);
      if (!publishCheck.success) {
        const fieldErrors = publishCheck.error.flatten().fieldErrors as Record<string, string[]>;
        const firstError =
          firstFieldError(fieldErrors, "প্রকাশিত বইয়ের প্রয়োজনীয় সকল তথ্য পূরণ থাকতে হবে।");
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
      { _id: bookId },
      { $set: updateSet }
    );

    if (isFirstPublication) {
      try {
        const authorDoc = await Author.findById(existingBook.author)
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
          "[adminUpdateBook] Non-fatal notification error:",
          notifyErr instanceof Error ? notifyErr.message : "Unknown notification error"
        );
      }
    }

    // 11. Revalidate relevant paths (non-fatal post-save side effects)
    try {
      revalidatePath("/admin");
      revalidatePath("/admin/books");
      revalidatePath(`/admin/books/${bookId}/edit`);
      revalidatePath("/books");
      if (existingBook.slug) {
        revalidatePath(`/books/${existingBook.slug}`);
      }
      if (existingBook.slug !== data.slug) {
        revalidatePath(`/books/${data.slug}`);
      }
      revalidatePath("/author");
    } catch (revalidateError) {
      console.warn("[adminUpdateBook] Non-fatal revalidation error:", revalidateError);
    }

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
    revalidatePath("/admin");
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
      { $set: { status: "DRAFT", displayOrder: 10000 } }
    );

    if (unpublishResult.matchedCount === 0) {
      return {
        success: false,
        error: "বইয়ের স্ট্যাটাস পরিবর্তিত হয়েছে। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন।",
      };
    }

    // 6. Revalidate affected paths
    revalidatePath("/");
    revalidatePath("/admin");
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
      { $set: { status: "ARCHIVED", displayOrder: 10000 } }
    );

    if (archiveResult.matchedCount === 0) {
      return {
        success: false,
        error: "বইয়ের স্ট্যাটাস পরিবর্তিত হয়েছে। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন।",
      };
    }

    // 6. Revalidate affected paths
    revalidatePath("/");
    revalidatePath("/admin");
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

/**
 * Server Action for admins to explicitly select and sequence up to 8 featured books for the Home page.
 * Strictly verifies requireAdmin(), enforces maximum 8 books, validates ObjectIds,
 * prevents duplicates, verifies that all selected books exist and are PUBLISHED,
 * and atomically sets displayOrder 1..N while resetting unselected books to 10000.
 */
export async function adminSaveFeaturedBooks(
  featuredBookIds: string[]
): Promise<ActionResult> {
  // 1. Authenticate + authorize as ADMIN
  await requireAdmin();

  // 2. Validate input array
  if (!Array.isArray(featuredBookIds)) {
    return { success: false, error: "বইয়ের তালিকা প্রদান করুন" };
  }

  // 3. Enforce maximum 8 featured books
  if (featuredBookIds.length > 8) {
    return { success: false, error: "হোমপেজে সর্বোচ্চ ৮টি বই ফিচার্ড করা সম্ভব।" };
  }

  // 4. Validate ObjectId format
  for (const id of featuredBookIds) {
    if (!isValidObjectId(id)) {
      return { success: false, error: `অবৈধ বই আইডি: ${id}` };
    }
  }

  // 5. Duplicate prevention
  const uniqueIds = new Set(featuredBookIds);
  if (uniqueIds.size !== featuredBookIds.length) {
    return { success: false, error: "তালিকায় ডুপ্লিকেট বই আইডি রয়েছে" };
  }

  try {
    await dbConnect();

    // 6. Verify all selected books exist and are published
    if (featuredBookIds.length > 0) {
      const publishedCount = await Book.countDocuments({
        _id: { $in: featuredBookIds },
        status: "PUBLISHED",
      });

      if (publishedCount !== featuredBookIds.length) {
        return {
          success: false,
          error: "নির্বাচিত এক বা একাধিক বই প্রকাশিত নয় বা খুঁজে পাওয়া যায়নি।",
        };
      }
    }

    // 7. Reset previously featured books that are not in the new selection to 10000
    await Book.updateMany(
      { displayOrder: { $lte: 8 }, _id: { $nin: featuredBookIds } },
      { $set: { displayOrder: 10000 } }
    );

    // 8. Atomically update displayOrder in bulk for the selected featured books
    if (featuredBookIds.length > 0) {
      const bulkOperations = featuredBookIds.map((bookId, index) => ({
        updateOne: {
          filter: { _id: bookId },
          update: { $set: { displayOrder: index + 1 } },
        },
      }));

      await Book.bulkWrite(bulkOperations);
    }

    // 9. Revalidate affected paths
    try {
      revalidatePath("/");
      revalidatePath("/admin/books");
      revalidatePath("/books");
    } catch {
      // Revalidation may fail in non-request or test environments
    }

    return { success: true };
  } catch (error) {
    console.error("adminSaveFeaturedBooks error:", error);
    return {
      success: false,
      error: "ফিচার্ড বই সংরক্ষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

/**
 * Server Action for admins to manually set displayOrder sequence for published books.
 * Strictly verifies requireAdmin(), checks for valid ObjectIds, checks for duplicates,
 * and updates each book's displayOrder atomically via MongoDB bulkWrite.
 */
export async function adminReorderBooks(
  orderedBookIds: string[]
): Promise<ActionResult> {
  // 1. Authenticate + authorize as ADMIN
  await requireAdmin();

  // 2. Validate input array
  if (!Array.isArray(orderedBookIds) || orderedBookIds.length === 0) {
    return { success: false, error: "বইয়ের তালিকা প্রদান করুন" };
  }

  // 3. Validate ObjectId format
  for (const id of orderedBookIds) {
    if (!isValidObjectId(id)) {
      return { success: false, error: `অবৈধ বই আইডি: ${id}` };
    }
  }

  // 4. Duplicate prevention
  const uniqueIds = new Set(orderedBookIds);
  if (uniqueIds.size !== orderedBookIds.length) {
    return { success: false, error: "তালিকায় ডুপ্লিকেট বই আইডি রয়েছে" };
  }

  try {
    await dbConnect();

    // 5. Verify all books exist and are published
    const booksInDb = await Book.find({
      _id: { $in: orderedBookIds },
      status: "PUBLISHED",
    })
      .select("_id")
      .lean();

    if (booksInDb.length !== orderedBookIds.length) {
      return {
        success: false,
        error: "তালিকায় থাকা এক বা একাধিক বই খুঁজে পাওয়া যায়নি অথবা প্রকাশিত নয়।",
      };
    }

    // 6. Protect homepage featured books:
    // Featured books (displayOrder 1..8) can ONLY be changed via adminSaveFeaturedBooks.
    // Generic catalog reordering must not overwrite or reset featured books.
    const featuredBooks = await Book.find({
      status: "PUBLISHED",
      displayOrder: { $gte: 1, $lte: 8 },
    })
      .select("_id")
      .lean();

    const featuredIdSet = new Set(featuredBooks.map((b) => String(b._id)));

    // Generic displayOrder sequence starts after the featured range (9+)
    let nextGenericOrder = 9;
    const bulkOperations = [];

    for (const bookId of orderedBookIds) {
      // If a book is currently featured, preserve its featured rank
      if (featuredIdSet.has(bookId)) {
        continue;
      }
      bulkOperations.push({
        updateOne: {
          filter: { _id: bookId },
          update: { $set: { displayOrder: nextGenericOrder++ } },
        },
      });
    }

    if (bulkOperations.length > 0) {
      await Book.bulkWrite(bulkOperations);
    }

    // 7. Revalidate affected paths
    try {
      revalidatePath("/");
      revalidatePath("/admin/books");
      revalidatePath("/books");
    } catch {
      // Revalidation may fail in non-request or test environments
    }

    return { success: true };
  } catch (error) {
    console.error("adminReorderBooks error:", error);
    return {
      success: false,
      error: "বই প্রদর্শনের ক্রম সংরক্ষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}


