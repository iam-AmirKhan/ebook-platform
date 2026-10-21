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
import FinancialLedger from "@/models/FinancialLedger";
import Withdrawal from "@/models/Withdrawal";
import { calculateAuthorBalances } from "@/lib/services/finance";
import type {
  AuthorBookListItem,
  AuthorBookSaleItem,
  AuthorFinancialSummary,
  AuthorProfileData,
  AuthorWithdrawalItem,
  BookFormData,
  CategoryOption,
} from "@/types/author";
import { Types } from "mongoose";

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

// ---------------------------------------------------------------------------
// Fetch author full profile data (display name, bio, image, user details).
// ---------------------------------------------------------------------------
export async function getAuthorFullProfile(
  userId: string
): Promise<AuthorProfileData | null> {
  await dbConnect();

  await import("@/models/User");

  const author = await Author.findOne({ user: userId, status: "ACTIVE" })
    .populate<{ user: { name: string; email: string } }>("user", "name email")
    .lean();

  if (!author) return null;

  return {
    _id: String(author._id),
    userId: String(author.user ? (author.user as unknown as { _id?: unknown })._id ?? userId : userId),
    penName: author.penName,
    slug: author.slug,
    bio: author.bio ?? null,
    profileImage: author.profileImage ?? null,
    name: author.user?.name ?? "",
    email: author.user?.email ?? "",
  };
}

// ---------------------------------------------------------------------------
// Fetch author financial summary (lifetime, available, pending, withdrawn).
// ---------------------------------------------------------------------------
export async function getAuthorFinancialSummary(
  authorId: string
): Promise<AuthorFinancialSummary> {
  return calculateAuthorBalances(authorId);
}

// ---------------------------------------------------------------------------
// Fetch per-book sales and earnings stats for this author.
// ---------------------------------------------------------------------------
export async function getAuthorBookSales(
  authorId: string
): Promise<AuthorBookSaleItem[]> {
  await dbConnect();

  const aId = new Types.ObjectId(authorId);

  // 1. Fetch all books by this author
  const books = await Book.find({ author: aId })
    .sort({ createdAt: -1 })
    .select("_id title slug coverImage status price")
    .lean();

  if (books.length === 0) return [];

  // 2. Aggregate sales and author earnings per book from ledger
  const salesAgg = await FinancialLedger.aggregate<{
    _id: { book: Types.ObjectId; type: string };
    total: number;
    count: number;
  }>([
    {
      $match: {
        author: aId,
        book: { $in: books.map((b) => b._id) },
        type: { $in: ["SALE", "AUTHOR_EARNING"] },
      },
    },
    {
      $group: {
        _id: { book: "$book", type: "$type" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const statsMap = new Map<
    string,
    { unitsSold: number; grossSales: number; authorEarnings: number }
  >();

  for (const item of salesAgg) {
    const bookIdStr = String(item._id.book);
    const existing = statsMap.get(bookIdStr) ?? {
      unitsSold: 0,
      grossSales: 0,
      authorEarnings: 0,
    };

    if (item._id.type === "SALE") {
      existing.unitsSold += item.count;
      existing.grossSales += item.total;
    } else if (item._id.type === "AUTHOR_EARNING") {
      existing.authorEarnings += item.total;
    }

    statsMap.set(bookIdStr, existing);
  }

  return books.map((b) => {
    const idStr = String(b._id);
    const stats = statsMap.get(idStr) ?? {
      unitsSold: 0,
      grossSales: 0,
      authorEarnings: 0,
    };
    return {
      bookId: idStr,
      title: b.title,
      slug: b.slug,
      coverImage: b.coverImage ?? null,
      status: b.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      price: b.price,
      unitsSold: stats.unitsSold,
      grossSales: stats.grossSales,
      authorEarnings: stats.authorEarnings,
    };
  });
}

// ---------------------------------------------------------------------------
// Fetch author withdrawal history with status and timeline.
// ---------------------------------------------------------------------------
export async function getAuthorWithdrawalHistory(
  authorId: string
): Promise<AuthorWithdrawalItem[]> {
  await dbConnect();

  const withdrawals = await Withdrawal.find({
    author: new Types.ObjectId(authorId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return withdrawals.map((w) => ({
    _id: String(w._id),
    amount: w.amount,
    currency: w.currency,
    payoutMethod: w.payoutMethod as "BKASH" | "NAGAD",
    payoutAccountNumber: w.payoutAccountNumber,
    status: w.status as "PENDING" | "ACCEPTED" | "PAID" | "REJECTED" | "CANCELLED",
    rejectionReason: w.rejectionReason ?? null,
    cancellationReason: w.cancellationReason ?? null,
    paymentTransactionId: w.paymentTransactionId ?? null,
    createdAt:
      w.createdAt instanceof Date ? w.createdAt.toISOString() : String(w.createdAt),
    reviewedAt:
      w.reviewedAt instanceof Date
        ? w.reviewedAt.toISOString()
        : w.reviewedAt
        ? String(w.reviewedAt)
        : null,
    paidAt:
      w.paidAt instanceof Date
        ? w.paidAt.toISOString()
        : w.paidAt
        ? String(w.paidAt)
        : null,
  }));
}
