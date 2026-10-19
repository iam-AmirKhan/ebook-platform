import dbConnect from "@/lib/db/mongoose";
import Author from "@/models/Author";
import Book from "@/models/Book";
import { Types } from "mongoose";
import type {
  PublicAuthorCard,
  PublicAuthorProfile,
  PublicAuthorsResult,
} from "@/types/author";
import type { HomepageBook } from "@/types/homepage";

export interface PublicAuthorsSearchParams {
  q?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Helper: map a populated lean book document to HomepageBook
// ---------------------------------------------------------------------------
function mapBook(raw: {
  _id: unknown;
  title: string;
  slug: string;
  coverImage?: string | null;
  price: number;
  discountPrice?: number | null;
  currency: string;
  createdAt: Date;
  author?: { penName?: string; slug?: string } | null;
  category?: { name?: string; slug?: string } | null;
}): HomepageBook {
  return {
    _id: String(raw._id),
    title: raw.title,
    slug: raw.slug,
    coverImage: raw.coverImage ?? null,
    price: raw.price,
    discountPrice: raw.discountPrice ?? null,
    currency: raw.currency,
    authorName: raw.author?.penName ?? "Unknown Author",
    authorSlug: raw.author?.slug ?? "",
    categoryName: raw.category?.name ?? "Uncategorised",
    categorySlug: raw.category?.slug ?? "",
    createdAt:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Public: getPublicAuthors
// Returns active author cards with published book counts, search, and pagination.
// Avoids N+1 queries by using an indexed aggregation for book counts.
// Never exposes private user fields.
// ---------------------------------------------------------------------------
export async function getPublicAuthors(
  params: PublicAuthorsSearchParams = {}
): Promise<PublicAuthorsResult> {
  try {
    await dbConnect();
    // Ensure User model is loaded for populate
    await import("@/models/User");

    const limit = params.limit && params.limit > 0 ? params.limit : 12;
    const currentPage = params.page && params.page > 0 ? params.page : 1;
    const skip = (currentPage - 1) * limit;

    const query: Record<string, unknown> = { status: "ACTIVE" };

    if (params.q && params.q.trim()) {
      const escaped = params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.penName = { $regex: escaped, $options: "i" };
    }

    const [rawAuthors, totalCount, bookCounts] = await Promise.all([
      Author.find(query)
        .sort({ penName: 1 })
        .skip(skip)
        .limit(limit)
        .populate<{ user: { image?: string | null } }>("user", "image")
        .select("_id penName slug bio profileImage createdAt user")
        .lean(),
      Author.countDocuments(query),
      Book.aggregate([
        { $match: { status: "PUBLISHED" } },
        { $group: { _id: "$author", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map<string, number>();
    for (const item of bookCounts) {
      if (item._id) {
        countMap.set(String(item._id), item.count);
      }
    }

    const authors: PublicAuthorCard[] = rawAuthors.map((a) => {
      const authorId = String(a._id);
      const userImage =
        (a.user as { image?: string | null } | null)?.image ?? null;
      return {
        _id: authorId,
        penName: a.penName,
        slug: a.slug,
        bio: a.bio ?? null,
        profileImage: a.profileImage || userImage || null,
        publishedBooksCount: countMap.get(authorId) ?? 0,
        createdAt:
          a.createdAt instanceof Date
            ? a.createdAt.toISOString()
            : String(a.createdAt),
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      authors,
      totalCount,
      totalPages,
      currentPage,
    };
  } catch (error) {
    console.error("Error fetching public authors:", error);
    return {
      authors: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
    };
  }
}

// ---------------------------------------------------------------------------
// Public: getPublicAuthorBySlug
// Look up an active author profile by unique slug.
// ---------------------------------------------------------------------------
export async function getPublicAuthorBySlug(
  slug: string
): Promise<PublicAuthorProfile | null> {
  try {
    await dbConnect();
    await import("@/models/User");

    const cleanSlug = slug.toLowerCase().trim();
    const author = await Author.findOne({ slug: cleanSlug, status: "ACTIVE" })
      .populate<{ user: { image?: string | null } }>("user", "image")
      .select("_id penName slug bio profileImage createdAt user")
      .lean();

    if (!author) {
      return null;
    }

    const authorId = String(author._id);
    const publishedBooksCount = await Book.countDocuments({
      author: author._id,
      status: "PUBLISHED",
    });

    const userImage =
      (author.user as { image?: string | null } | null)?.image ?? null;

    return {
      _id: authorId,
      penName: author.penName,
      slug: author.slug,
      bio: author.bio ?? null,
      profileImage: author.profileImage || userImage || null,
      publishedBooksCount,
      createdAt:
        author.createdAt instanceof Date
          ? author.createdAt.toISOString()
          : String(author.createdAt),
    };
  } catch (error) {
    console.error("Error fetching author by slug:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public: getAuthorPublishedBooks
// Returns only PUBLISHED books belonging to this author.
// Drafts, archived, and unpublished books are strictly excluded.
// ---------------------------------------------------------------------------
export async function getAuthorPublishedBooks(
  authorId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{
  books: HomepageBook[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    await dbConnect();
    await import("@/models/Category");
    await import("@/models/Author");

    if (!Types.ObjectId.isValid(authorId)) {
      return { books: [], totalCount: 0, totalPages: 0, currentPage: 1 };
    }

    const limit = params.limit && params.limit > 0 ? params.limit : 12;
    const currentPage = params.page && params.page > 0 ? params.page : 1;
    const skip = (currentPage - 1) * limit;

    const query: Record<string, unknown> = {
      author: new Types.ObjectId(authorId),
      status: "PUBLISHED",
    };

    const [rawBooks, totalCount] = await Promise.all([
      Book.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ author: { penName: string; slug: string } | null }>(
          "author",
          "penName slug"
        )
        .populate<{ category: { name: string; slug: string } | null }>(
          "category",
          "name slug"
        )
        .select(
          "title slug coverImage price discountPrice currency createdAt author category"
        )
        .lean(),
      Book.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      books: (rawBooks as unknown as Parameters<typeof mapBook>[0][]).map(mapBook),
      totalCount,
      totalPages,
      currentPage,
    };
  } catch (error) {
    console.error("Error fetching author published books:", error);
    return {
      books: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
    };
  }
}
