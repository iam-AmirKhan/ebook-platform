/**
 * Server-only Data Access Layer for the author dashboard.
 *
 * All functions require a verified authorId derived from the authenticated
 * session — never from client input. They return plain serializable objects.
 */

import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Category from "@/models/Category";
import Author from "@/models/Author";
import type { AuthorBookListItem, BookFormData, CategoryOption } from "@/types/author";
import type { Types } from "mongoose";

// ---------------------------------------------------------------------------
// Look up the Author document for the given User._id.
// Returns null if no Author profile exists.
// ---------------------------------------------------------------------------
export async function getAuthorByUserId(
  userId: string
): Promise<{ _id: string; penName: string } | null> {
  await dbConnect();

  const author = await Author.findOne({ user: userId, status: "ACTIVE" })
    .select("_id penName")
    .lean();

  if (!author) return null;

  return {
    _id: String(author._id),
    penName: author.penName,
  };
}

// ---------------------------------------------------------------------------
// Fetch all books belonging to this author, sorted by most recently updated.
// ---------------------------------------------------------------------------
export async function getAuthorBooks(
  authorId: string
): Promise<AuthorBookListItem[]> {
  await dbConnect();

  // Register Category model for population
  await import("@/models/Category");

  const books = await Book.find({ author: authorId })
    .sort({ updatedAt: -1 })
    .populate<{ category: { name: string; slug: string } | null }>(
      "category",
      "name slug"
    )
    .select(
      "title slug coverImage status price currency updatedAt createdAt"
    )
    .lean();

  return books.map((b) => ({
    _id: String(b._id),
    title: b.title,
    slug: b.slug,
    coverImage: b.coverImage ?? null,
    status: b.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    price: b.price,
    currency: b.currency,
    categoryName: (b.category as { name: string } | null)?.name ?? "অশ্রেণীবদ্ধ",
    updatedAt:
      b.updatedAt instanceof Date
        ? b.updatedAt.toISOString()
        : String(b.updatedAt),
    createdAt:
      b.createdAt instanceof Date
        ? b.createdAt.toISOString()
        : String(b.createdAt),
  }));
}

// ---------------------------------------------------------------------------
// Fetch a single book for editing.
// Verifies the book belongs to the given authorId — returns null on mismatch.
// ---------------------------------------------------------------------------
export async function getBookForEdit(
  bookId: string,
  authorId: string
): Promise<BookFormData | null> {
  await dbConnect();

  const book = await Book.findOne({
    _id: bookId,
    author: authorId,
  }).lean();

  if (!book) return null;

  return {
    _id: String(book._id),
    title: book.title,
    slug: book.slug,
    coverImage: book.coverImage ?? null,
    categoryId: String(book.category as Types.ObjectId),
    language: book.language ?? "বাংলা",
    summary: book.summary ?? "",
    description: book.description,
    learningOutcomes: book.learningOutcomes ?? [],
    price: book.price,
    discountPrice: book.discountPrice ?? null,
    status: book.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    chapters: (book.chapters ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ch) => ({
        order: ch.order,
        title: ch.title,
        teaser: ch.teaser ?? "",
        content: ch.content,
        isPreview: ch.isPreview,
      })),
  };
}

// ---------------------------------------------------------------------------
// Fetch all active categories for the book form dropdown.
// ---------------------------------------------------------------------------
export async function getActiveCategories(): Promise<CategoryOption[]> {
  await dbConnect();

  const categories = await Category.find({ status: "ACTIVE" })
    .sort({ name: 1 })
    .select("_id name slug")
    .lean();

  return categories.map((c) => ({
    _id: String(c._id),
    name: c.name,
    slug: c.slug,
  }));
}
