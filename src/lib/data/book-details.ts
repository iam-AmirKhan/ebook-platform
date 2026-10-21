/**
 * Server-only Data Access Layer for book details.
 *
 * SECURITY CONTRACT
 * -----------------
 * Full chapter content is NEVER sent to unauthorized clients.
 * The stripping happens here, inside this module, before any data leaves
 * the server. This module must not be imported by Client Components.
 *
 * The ownership check is derived from the authenticated session + database.
 * No client-supplied boolean is trusted. The caller (Server Component) passes
 * the userId obtained from `requireUser()` / `getCurrentUser()` — both of
 * which read from the signed JWT cookie, not from client input.
 *
 * Fail-closed: if ownership cannot be confirmed (error, missing record, etc.)
 * the function treats the user as not owning the book and strips locked content.
 */

import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Review from "@/models/Review";
import Purchase from "@/models/Purchase";
import type {
  BookDetails,
  BookReview,
  BookRatingSummary,
  ChapterPreview,
} from "@/types/book-details";
import type { HomepageBook } from "@/types/homepage";

// ---------------------------------------------------------------------------
// Internal: derive book ownership from session userId + database.
// Fail-closed: any error → false (no access).
// ---------------------------------------------------------------------------
async function resolveOwnership(
  userId: string | null | undefined,
  bookId: string
): Promise<boolean> {
  if (!userId) return false;
  try {
    const purchase = await Purchase.findOne({
      user: userId,
      book: bookId,
      status: "ACTIVE",
    }).lean();
    return purchase !== null;
  } catch {
    // Ownership unverifiable — fail closed.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal: strip chapter content for unauthorized users.
// Preview chapters always expose content.
// Locked chapters expose only order, title, isPreview, and teaser on initial
// page load. Full locked chapter content is NEVER bundled into the initial page
// props or RSC payload, preventing complete book leakage into client HTML/DOM.
// Authorized purchasers fetch locked chapters on-demand via the protected API.
// ---------------------------------------------------------------------------
function applyChapterAccessControl(
  rawChapters: Array<{
    order: number;
    title: string;
    isPreview: boolean;
    teaser: string;
    content: string;
  }>,
  isFreeBook = false
): ChapterPreview[] {
  return rawChapters
    .slice() // avoid mutating the lean result
    .sort((a, b) => a.order - b.order)
    .map((ch) => ({
      order: ch.order,
      title: ch.title,
      isPreview: ch.isPreview,
      teaser: ch.teaser,
      // Content is only included when the chapter is a preview OR the book is 100% free.
      // Locked chapters in paid books must be loaded on demand by authorized readers.
      content: ch.isPreview || isFreeBook ? ch.content : null,
    }));
}

// ---------------------------------------------------------------------------
// Public: getBookBySlug
//
// @param slug     - The book's unique URL slug.
// @param userId   - From getCurrentUser().id (server-session-derived, not
//                   client-supplied). Pass null for unauthenticated visitors.
//
// Returns BookDetails with chapters already access-controlled, or null.
// ---------------------------------------------------------------------------
export async function getBookBySlug(
  slug: string,
  userId: string | null | undefined
): Promise<BookDetails | null> {
  await dbConnect();

  const book = await Book.findOne({ slug })
    .populate<{
      author: { _id: unknown; penName: string; slug: string; bio: string | null };
    }>("author", "penName slug bio")
    .populate<{
      category: { _id: unknown; name: string; slug: string };
    }>("category", "name slug")
    .lean();

  if (!book) {
    return null;
  }

  const bookId = String(book._id);

  // Resolve ownership server-side. Fail-closed.
  const isFreeBook = book.price === 0;
  const isPurchased = await resolveOwnership(userId, bookId);
  const isOwned = isFreeBook || isPurchased;

  // If the book is not publicly published, ONLY an authenticated active purchaser can view it
  if (book.status !== "PUBLISHED" && !isPurchased) {
    return null;
  }

  // Strip chapter content according to access control rules.
  const rawChapters = (book.chapters ?? []) as Array<{
    order: number;
    title: string;
    isPreview: boolean;
    teaser: string;
    content: string;
  }>;
  const chapters = applyChapterAccessControl(rawChapters, book.status === "PUBLISHED" && isFreeBook);

  return {
    _id: bookId,
    title: book.title,
    slug: book.slug,
    description: book.description,
    coverImage: book.coverImage ?? null,
    price: book.price,
    discountPrice: book.discountPrice ?? null,
    currency: book.currency,
    createdAt:
      book.createdAt instanceof Date
        ? book.createdAt.toISOString()
        : String(book.createdAt),
    author: {
      _id: String(book.author?._id),
      penName: book.author?.penName ?? "Unknown Author",
      slug: book.author?.slug ?? "",
      bio: book.author?.bio ?? null,
    },
    category: {
      _id: String(book.category?._id),
      name: book.category?.name ?? "Uncategorised",
      slug: book.category?.slug ?? "",
    },
    language: book.language ?? null,
    summary: book.summary ?? null,
    learningOutcomes: book.learningOutcomes ?? [],
    chapters,
    isOwned,
  };
}

// ---------------------------------------------------------------------------
// Public: getProtectedChapter
//
// Resolves on-demand chapter content with strict authorization and zero client trust.
// ---------------------------------------------------------------------------
export interface ProtectedChapterResult {
  allowed: boolean;
  statusCode: number;
  error?: string;
  chapter?: {
    order: number;
    title: string;
    teaser: string;
    content: string;
    isPreview: boolean;
  };
  reader?: {
    identifier: string;
    pustokaId: string;
  };
}

export async function getProtectedChapter(
  slug: string,
  chapterOrder: number,
  userId: string | null | undefined,
  userDisplayName?: string | null
): Promise<ProtectedChapterResult> {
  await dbConnect();

  const book = await Book.findOne({ slug })
    .select("_id title slug price currency chapters status")
    .lean();

  if (!book) {
    return {
      allowed: false,
      statusCode: 404,
      error: "বইটি পাওয়া যায়নি।",
    };
  }

  const rawChapters = (book.chapters ?? []) as Array<{
    order: number;
    title: string;
    isPreview: boolean;
    teaser: string;
    content: string;
  }>;

  const chapter = rawChapters.find((ch) => ch.order === chapterOrder);
  if (!chapter) {
    return {
      allowed: false,
      statusCode: 404,
      error: "অধ্যায়টি পাওয়া যায়নি।",
    };
  }

  // If the book is not publicly published (e.g. ARCHIVED, DRAFT, unpublished):
  // Public storefront access (including preview chapters & free books) is closed.
  // ONLY an authenticated user with an ACTIVE purchase is entitled to access.
  if (book.status !== "PUBLISHED") {
    if (!userId) {
      return {
        allowed: false,
        statusCode: 401,
        error: "এই অধ্যায়টি পড়তে লগইন করা প্রয়োজন।",
      };
    }

    const hasAccess = await Purchase.exists({
      user: userId,
      book: book._id,
      status: "ACTIVE",
    });

    if (!hasAccess) {
      return {
        allowed: false,
        statusCode: 403,
        error: "এই অধ্যায়টি পড়তে বইটি কেনা প্রয়োজন।",
      };
    }

    return {
      allowed: true,
      statusCode: 200,
      chapter: {
        order: chapter.order,
        title: chapter.title,
        teaser: chapter.teaser,
        content: chapter.content,
        isPreview: chapter.isPreview,
      },
      reader: {
        identifier: userDisplayName || "Verified Reader",
        pustokaId: userId.slice(-6).toUpperCase(),
      },
    };
  }

  const isFreeBook = book.price === 0;

  // Preview chapters or 100% free books can be read without purchase
  if (chapter.isPreview || isFreeBook) {
    return {
      allowed: true,
      statusCode: 200,
      chapter: {
        order: chapter.order,
        title: chapter.title,
        teaser: chapter.teaser,
        content: chapter.content,
        isPreview: chapter.isPreview,
      },
      reader: userId
        ? {
            identifier: userDisplayName || "Verified Reader",
            pustokaId: userId.slice(-6).toUpperCase(),
          }
        : {
            identifier: "Pustoka Reader",
            pustokaId: "PREVIEW",
          },
    };
  }

  // Locked chapter in a paid book — requires authenticated user
  if (!userId) {
    return {
      allowed: false,
      statusCode: 401,
      error: "এই অধ্যায়টি পড়তে লগইন করা প্রয়োজন।",
    };
  }

  // Verify active purchase
  const hasAccess = await Purchase.exists({
    user: userId,
    book: book._id,
    status: "ACTIVE",
  });

  if (!hasAccess) {
    return {
      allowed: false,
      statusCode: 403,
      error: "এই অধ্যায়টি পড়তে বইটি কেনা প্রয়োজন।",
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    chapter: {
      order: chapter.order,
      title: chapter.title,
      teaser: chapter.teaser,
      content: chapter.content,
      isPreview: false,
    },
    reader: {
      identifier: userDisplayName || "Verified Reader",
      pustokaId: userId.slice(-6).toUpperCase(),
    },
  };
}

// ---------------------------------------------------------------------------
// Public: checkUserOwnership
//
// Convenience wrapper for callers that only need the boolean flag (e.g. to
// determine CTA state). Internally calls resolveOwnership.
// ---------------------------------------------------------------------------
export async function checkUserOwnership(
  userId: string,
  bookId: string
): Promise<boolean> {
  await dbConnect();
  return resolveOwnership(userId, bookId);
}

// ---------------------------------------------------------------------------
// Public: getBookReviews (Approved only)
// ---------------------------------------------------------------------------
export async function getBookReviews(bookId: string): Promise<BookReview[]> {
  await dbConnect();

  const reviews = await Review.find({
    book: bookId,
    status: { $in: ["APPROVED", "PUBLISHED"] },
  })
    .sort({ createdAt: -1 })
    .populate<{ user: { name: string; _id: unknown } }>("user", "name")
    .lean();

  return reviews.map((r) => ({
    _id: String(r._id),
    rating: r.rating,
    comment: r.comment,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED" | "HIDDEN",
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    reviewerName: r.user?.name ?? "Anonymous Reader",
    reviewerId: r.user?._id ? String(r.user._id) : undefined,
  }));
}

// ---------------------------------------------------------------------------
// Public: getBookRatingSummary (Derived strictly from approved reviews)
// ---------------------------------------------------------------------------
export async function getBookRatingSummary(
  bookId: string
): Promise<BookRatingSummary> {
  await dbConnect();

  const approvedReviews = await Review.find({
    book: bookId,
    status: { $in: ["APPROVED", "PUBLISHED"] },
  })
    .select("rating")
    .lean();

  const totalReviews = approvedReviews.length;
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of approvedReviews) {
    sum += r.rating;
    const roundedRating = Math.min(5, Math.max(1, Math.round(r.rating)));
    breakdown[roundedRating] = (breakdown[roundedRating] || 0) + 1;
  }

  const averageRating =
    totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : 0;

  return {
    averageRating,
    totalReviews,
    breakdown,
  };
}

// ---------------------------------------------------------------------------
// Authenticated: getUserBookReview (returns user's own review regardless of status)
// ---------------------------------------------------------------------------
export async function getUserBookReview(
  bookId: string,
  userId: string | null | undefined
): Promise<BookReview | null> {
  if (!userId) return null;
  await dbConnect();

  const review = await Review.findOne({
    book: bookId,
    user: userId,
  })
    .populate<{ user: { name: string } }>("user", "name")
    .lean();

  if (!review) return null;

  return {
    _id: String(review._id),
    rating: review.rating,
    comment: review.comment,
    status: review.status as "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED" | "HIDDEN",
    createdAt:
      review.createdAt instanceof Date
        ? review.createdAt.toISOString()
        : String(review.createdAt),
    reviewerName: review.user?.name ?? "Anonymous Reader",
    reviewerId: userId,
  };
}

// ---------------------------------------------------------------------------
// Public: getRelatedBooks
// ---------------------------------------------------------------------------
export async function getRelatedBooks(
  categoryId: string,
  excludeBookId: string
): Promise<HomepageBook[]> {
  await dbConnect();

  const raw = await Book.find({
    status: "PUBLISHED",
    category: categoryId,
    _id: { $ne: excludeBookId },
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .populate<{ author: { penName: string; slug: string } | null }>(
      "author",
      "penName slug"
    )
    .populate<{ category: { name: string; slug: string } | null }>(
      "category",
      "name slug"
    )
    .select("title slug coverImage price discountPrice currency createdAt")
    .lean();

  return raw.map((r) => ({
    _id: String(r._id),
    title: r.title,
    slug: r.slug,
    coverImage: r.coverImage ?? null,
    price: r.price,
    discountPrice: r.discountPrice ?? null,
    currency: r.currency,
    authorName: r.author?.penName ?? "Unknown Author",
    authorSlug: r.author?.slug ?? "",
    categoryName: r.category?.name ?? "Uncategorised",
    categorySlug: r.category?.slug ?? "",
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
  }));
}
