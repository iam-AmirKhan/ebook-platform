import dbConnect from "@/lib/db/mongoose";
import Book, { type BookStatus } from "@/models/Book";
import Author from "@/models/Author";
import Category from "@/models/Category";
import type { BookFormData } from "@/types/author";

export interface AdminBookCounts {
  all: number;
  published: number;
  draft: number;
  archived: number;
}

export interface AdminBooksSearchParams {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminBookItem {
  _id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  price: number;
  discountPrice: number | null;
  currency: string;
  status: BookStatus;
  authorName: string;
  authorSlug: string;
  categoryName: string;
  categorySlug: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBooksResult {
  books: AdminBookItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface AdminBookEditData extends BookFormData {
  _id: string;
  author: {
    _id: string;
    penName: string;
    slug: string;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && OBJECT_ID_REGEX.test(id);
}

function toValidObjectIdString(id: unknown): string {
  if (!id) return "";
  const str = String(id);
  return OBJECT_ID_REGEX.test(str) ? str : "";
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Retrieve platform-wide book counts across all authors from MongoDB.
 * Counts all books by their status: ALL, PUBLISHED, DRAFT, ARCHIVED.
 */
export async function getAdminBookCounts(): Promise<AdminBookCounts> {
  await dbConnect();

  const [all, published, draft, archived] = await Promise.all([
    Book.countDocuments({}),
    Book.countDocuments({ status: "PUBLISHED" }),
    Book.countDocuments({ status: "DRAFT" }),
    Book.countDocuments({ status: "ARCHIVED" }),
  ]);

  return {
    all,
    published,
    draft,
    archived,
  };
}

/**
 * Fetch books for admin overview with author, category, status filters, search, and pagination.
 */
export async function getAdminBooks(
  params: AdminBooksSearchParams = {}
): Promise<AdminBooksResult> {
  await dbConnect();

  // Ensure referenced models are registered in Mongoose runtime
  void Author;
  void Category;

  const limit =
    typeof params.limit === "number" && params.limit > 0
      ? Math.floor(params.limit)
      : 15;
  const requestedPage =
    typeof params.page === "number" && !isNaN(params.page) && params.page > 0
      ? Math.floor(params.page)
      : 1;

  const query: Record<string, unknown> = {};

  // Status Filter
  const statusUpper = params.status?.toUpperCase();
  if (
    statusUpper === "PUBLISHED" ||
    statusUpper === "DRAFT" ||
    statusUpper === "ARCHIVED"
  ) {
    query.status = statusUpper;
  }

  // Search Filter (by title)
  if (params.q?.trim()) {
    query.title = { $regex: escapeRegex(params.q.trim()), $options: "i" };
  }

  // Determine the total number of matching books before calculating the effective page
  const totalCount = await Book.countDocuments(query);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
  const effectivePage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;
  const skip = (effectivePage - 1) * limit;

  const rawBooks = await Book.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate<{ author: { penName?: string; slug?: string } | null }>(
      "author",
      "penName slug"
    )
    .populate<{ category: { name?: string; slug?: string } | null }>(
      "category",
      "name slug"
    )
    .lean();

  const books: AdminBookItem[] = rawBooks.map((book) => {
    const rawAuthor = book.author as
      | { penName?: string; slug?: string }
      | null
      | undefined;
    const rawCategory = book.category as
      | { name?: string; slug?: string }
      | null
      | undefined;

    return {
      _id: String(book._id),
      title: book.title,
      slug: book.slug,
      coverImage: book.coverImage ?? null,
      price: typeof book.price === "number" ? book.price : 0,
      discountPrice:
        typeof book.discountPrice === "number" ? book.discountPrice : null,
      currency: book.currency || "BDT",
      status: book.status,
      authorName: rawAuthor?.penName ?? "অজানা লেখক",
      authorSlug: rawAuthor?.slug ?? "",
      categoryName: rawCategory?.name ?? "শ্রেণীবিহীন",
      categorySlug: rawCategory?.slug ?? "",
      createdAt:
        book.createdAt instanceof Date
          ? book.createdAt.toISOString()
          : String(book.createdAt),
      updatedAt:
        book.updatedAt instanceof Date
          ? book.updatedAt.toISOString()
          : String(book.updatedAt),
    };
  });

  return {
    books,
    totalCount,
    totalPages,
    currentPage: effectivePage,
  };
}

/**
 * Fetch a single book across any author for admin editing.
 * Returns editable fields + author/category details, or null on invalid ID / not found.
 */
export async function getAdminBookForEdit(
  bookId: string
): Promise<AdminBookEditData | null> {
  if (!isValidObjectId(bookId)) {
    return null;
  }

  await dbConnect();

  // Ensure referenced models are registered in Mongoose runtime
  void Author;
  void Category;

  const book = await Book.findById(bookId)
    .populate<{ author: { _id: unknown; penName?: string; slug?: string } | null }>(
      "author",
      "_id penName slug"
    )
    .populate<{ category: { _id: unknown; name?: string; slug?: string } | null }>(
      "category",
      "_id name slug"
    )
    .lean();

  if (!book) {
    return null;
  }

  const rawAuthor = book.author as
    | { _id: unknown; penName?: string; slug?: string }
    | null
    | undefined;
  const rawCategory = book.category as
    | { _id: unknown; name?: string; slug?: string }
    | null
    | undefined;

  const validCategoryId =
    toValidObjectIdString(rawCategory?._id) ||
    toValidObjectIdString(book.category);

  const validAuthorId =
    toValidObjectIdString(rawAuthor?._id) ||
    toValidObjectIdString(book.author);

  return {
    _id: String(book._id),
    title: book.title,
    slug: book.slug,
    coverImage: book.coverImage ?? null,
    categoryId: validCategoryId,
    language: book.language ?? "বাংলা",
    summary: book.summary ?? "",
    description: book.description,
    learningOutcomes: book.learningOutcomes ?? [],
    price: typeof book.price === "number" ? book.price : 0,
    discountPrice: typeof book.discountPrice === "number" ? book.discountPrice : null,
    status: book.status,
    chapters: (book.chapters ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ch) => ({
        order: ch.order,
        title: ch.title,
        teaser: ch.teaser ?? "",
        content: ch.content ?? "",
        isPreview: ch.isPreview ?? false,
      })),
    author: {
      _id: validAuthorId,
      penName: rawAuthor?.penName ?? "অজানা লেখক",
      slug: rawAuthor?.slug ?? "",
    },
    category: {
      _id: validCategoryId,
      name: rawCategory?.name ?? "শ্রেণীবিহীন",
      slug: rawCategory?.slug ?? "",
    },
  };
}
