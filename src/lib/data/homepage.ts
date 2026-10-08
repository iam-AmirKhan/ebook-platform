/**
 * Server-side data fetching for the homepage.
 *
 * All functions connect to MongoDB via the cached singleton, query only
 * the fields the homepage needs, and return plain serialisable objects
 * (no Mongoose document methods leak to the caller).
 *
 * These functions are intentionally kept separate from UI components so
 * data-fetching strategy can evolve (caching, ISR, CDN) independently.
 */

import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Author from "@/models/Author";
import Category from "@/models/Category";
import type {
  HomepageBook,
  HomepageCategory,
  HomepageStats,
} from "@/types/homepage";

const FEATURED_LIMIT = 6;
const LATEST_LIMIT = 6;
const CATEGORIES_LIMIT = 12;

// ---------------------------------------------------------------------------
// Internal helper — map a populated lean book document to HomepageBook
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
    createdAt: raw.createdAt instanceof Date
      ? raw.createdAt.toISOString()
      : String(raw.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Featured books — newest PUBLISHED books, limit 6
// Replace with curated/editorial selection in a future phase.
// ---------------------------------------------------------------------------
export async function getFeaturedBooks(): Promise<HomepageBook[]> {
  try {
    await dbConnect();

    const raw = await Book.find({ status: "PUBLISHED" })
      .sort({ createdAt: -1 })
      .limit(FEATURED_LIMIT)
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

    return raw.map(mapBook);
  } catch {
    // Fail gracefully — empty state handles missing data in the UI.
    return [];
  }
}

// ---------------------------------------------------------------------------
// Latest books — same query shape, different offset/sort (for second section)
// Skip the first 6 to avoid repeating featured books.
// ---------------------------------------------------------------------------
export async function getLatestBooks(): Promise<HomepageBook[]> {
  try {
    await dbConnect();

    const raw = await Book.find({ status: "PUBLISHED" })
      .sort({ createdAt: -1 })
      .skip(FEATURED_LIMIT)
      .limit(LATEST_LIMIT)
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

    return raw.map(mapBook);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Active categories — limit 12, sorted by name
// ---------------------------------------------------------------------------
export async function getActiveCategories(): Promise<HomepageCategory[]> {
  try {
    await dbConnect();

    const raw = await Category.find({ status: "ACTIVE" })
      .sort({ name: 1 })
      .limit(CATEGORIES_LIMIT)
      .select("name slug description image")
      .lean();

    return raw.map((c) => ({
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      image: c.image ?? null,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Platform stats — real counts from DB, null if the collection is empty.
// The homepage UI shows placeholder text when values are null.
// ---------------------------------------------------------------------------
export async function getHomepageStats(): Promise<HomepageStats> {
  try {
    await dbConnect();

    const [publishedBooks, activeAuthors] = await Promise.all([
      Book.countDocuments({ status: "PUBLISHED" }),
      Author.countDocuments({ status: "ACTIVE" }),
    ]);

    return {
      publishedBooks: publishedBooks > 0 ? publishedBooks : null,
      activeAuthors: activeAuthors > 0 ? activeAuthors : null,
    };
  } catch {
    return { publishedBooks: null, activeAuthors: null };
  }
}
