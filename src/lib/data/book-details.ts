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
// Locked chapters expose only order, title, isPreview, and teaser.
// ---------------------------------------------------------------------------
function applyChapterAccessControl(
  rawChapters: Array<{
    order: number;
    title: string;
    isPreview: boolean;
    teaser: string;
    content: string;
  }>,
  isOwned: boolean
): ChapterPreview[] {
  return rawChapters
    .slice() // avoid mutating the lean result
    .sort((a, b) => a.order - b.order)
    .map((ch) => ({
      order: ch.order,
      title: ch.title,
      isPreview: ch.isPreview,
      teaser: ch.teaser,
      // Content is only included when the chapter is a preview OR the user
      // has an ACTIVE purchase. In all other cases it is null.
      content: ch.isPreview || isOwned ? ch.content : null,
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

  const book = await Book.findOne({ slug, status: "PUBLISHED" })
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
  const isOwned = await resolveOwnership(userId, bookId);

  // Strip chapter content according to ownership.
  const rawChapters = (book.chapters ?? []) as Array<{
    order: number;
    title: string;
    isPreview: boolean;
    teaser: string;
    content: string;
  }>;
  const chapters = applyChapterAccessControl(rawChapters, isOwned);

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
// Public: getBookReviews
// ---------------------------------------------------------------------------
export async function getBookReviews(bookId: string): Promise<BookReview[]> {
  await dbConnect();

  const reviews = await Review.find({
    book: bookId,
    status: "PUBLISHED",
  })
    .sort({ createdAt: -1 })
    .populate<{ user: { name: string } }>("user", "name")
    .lean();

  return reviews.map((r) => ({
    _id: String(r._id),
    rating: r.rating,
    comment: r.comment,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    reviewerName: r.user?.name ?? "Anonymous Reader",
  }));
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
