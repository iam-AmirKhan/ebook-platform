import dbConnect from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/auth/authorization";
import Book, { type BookStatus } from "@/models/Book";
import Author from "@/models/Author";
import Category from "@/models/Category";
import User from "@/models/User";
import type { BookFormData } from "@/types/author";

export interface AdminBookCounts {
  all: number;
  pendingReview: number;
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
  displayOrder: number;
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
  await requireAdmin();
  await dbConnect();

  const [all, pendingReview, published, draft, archived] = await Promise.all([
    Book.countDocuments({}),
    Book.countDocuments({ status: "PENDING_REVIEW" }),
    Book.countDocuments({ status: "PUBLISHED" }),
    Book.countDocuments({ status: "DRAFT" }),
    Book.countDocuments({ status: "ARCHIVED" }),
  ]);

  return {
    all,
    pendingReview,
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
  await requireAdmin();
  await dbConnect();

  // Ensure referenced models are registered in Mongoose runtime
  void Author;
  void Category;
  void User;

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
    statusUpper === "PENDING_REVIEW" ||
    statusUpper === "DRAFT" ||
    statusUpper === "ARCHIVED"
  ) {
    query.status = statusUpper;
  }

  // Search Filter (by title, author's pen/display name, category name/slug)
  if (params.q?.trim()) {
    const safeQ = escapeRegex(params.q.trim());
    const regex = { $regex: safeQ, $options: "i" };

    // Concurrently find matching categories (name or slug) and registered users (display name)
    const [matchingCategories, matchingUsers] = await Promise.all([
      Category.find({
        $or: [{ name: regex }, { slug: regex }],
      })
        .select("_id")
        .lean(),
      User.find({
        name: regex,
      })
        .select("_id")
        .lean(),
    ]);

    const matchingCategoryIds = matchingCategories.map((c) => c._id);
    const matchingUserIds = matchingUsers.map((u) => u._id);

    // Find matching authors by penName, slug, or matching registered user
    const authorOrConditions: Record<string, unknown>[] = [
      { penName: regex },
      { slug: regex },
    ];
    if (matchingUserIds.length > 0) {
      authorOrConditions.push({ user: { $in: matchingUserIds } });
    }

    const matchingAuthors = await Author.find({
      $or: authorOrConditions,
    })
      .select("_id")
      .lean();

    const matchingAuthorIds = matchingAuthors.map((a) => a._id);

    // Construct book-level $or conditions
    const bookOrConditions: Record<string, unknown>[] = [{ title: regex }];

    if (matchingAuthorIds.length > 0) {
      bookOrConditions.push({ author: { $in: matchingAuthorIds } });
    }

    if (matchingCategoryIds.length > 0) {
      bookOrConditions.push({ category: { $in: matchingCategoryIds } });
    }

    query.$or = bookOrConditions;
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
      displayOrder: typeof book.displayOrder === "number" ? book.displayOrder : 10000,
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
  await requireAdmin();
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
    updatedAt:
      book.updatedAt instanceof Date
        ? book.updatedAt.toISOString()
        : book.updatedAt
        ? String(book.updatedAt)
        : undefined,
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

/**
 * Retrieve all PUBLISHED books ordered by displayOrder ASC (and createdAt DESC)
 * exclusively for admin display-ordering management.
 */
export async function getAdminPublishedBooksForReorder(): Promise<AdminBookItem[]> {
  await requireAdmin();
  await dbConnect();

  // Ensure legacy documents without displayOrder default to 10000 so they don't precede numbers
  try {
    await Book.updateMany(
      { $or: [{ displayOrder: { $exists: false } }, { displayOrder: null }] },
      { $set: { displayOrder: 10000 } }
    );
  } catch (err) {
    console.error("Failed to update legacy displayOrder in admin-books:", err);
  }

  void Author;
  void Category;

  const rawBooks = await Book.find({ status: "PUBLISHED" })
    .sort({ displayOrder: 1, createdAt: -1, _id: 1 })
    .populate<{ author: { penName?: string; slug?: string } | null }>(
      "author",
      "penName slug"
    )
    .populate<{ category: { name?: string; slug?: string } | null }>(
      "category",
      "name slug"
    )
    .lean();

  return rawBooks.map((book) => {
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
      displayOrder: typeof book.displayOrder === "number" ? book.displayOrder : 10000,
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
}

