import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Category from "@/models/Category";
import type { HomepageBook, HomepageCategory } from "@/types/homepage";

export interface CatalogSearchParams {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CatalogResult {
  books: HomepageBook[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  activeCategoryName?: string;
}

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
// Main catalog fetcher — handles search, filter, sort, pagination
// ---------------------------------------------------------------------------
export async function getCatalogBooks(
  params: CatalogSearchParams
): Promise<CatalogResult> {
  try {
    await dbConnect();

    const limit = params.limit && params.limit > 0 ? params.limit : 24;
    const currentPage = params.page && params.page > 0 ? params.page : 1;
    const skip = (currentPage - 1) * limit;

    const query: Record<string, unknown> = { status: "PUBLISHED" };
    let activeCategoryName: string | undefined = undefined;

    // Filter by Category
    if (params.category) {
      const categoryDoc = await Category.findOne({
        slug: params.category,
        status: "ACTIVE",
      }).lean();
      
      if (categoryDoc) {
        query.category = categoryDoc._id;
        activeCategoryName = categoryDoc.name;
      } else {
        // If an invalid category slug is provided, return 0 results gracefully
        return {
          books: [],
          totalCount: 0,
          totalPages: 0,
          currentPage,
        };
      }
    }

    // Filter by Search Query (Title)
    if (params.q) {
      query.title = { $regex: params.q, $options: "i" };
    }

    // Determine Sort Object
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 }; // default: latest
    if (params.sort === "price-asc") {
      sortObj = { price: 1, createdAt: -1 };
    } else if (params.sort === "price-desc") {
      sortObj = { price: -1, createdAt: -1 };
    } else if (params.sort === "title-asc") {
      sortObj = { title: 1, createdAt: -1 };
    }

    // Execute Data Queries in Parallel
    const [rawBooks, totalCount] = await Promise.all([
      Book.find(query)
        .sort(sortObj)
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
        .select("title slug coverImage price discountPrice currency createdAt")
        .lean(),
      Book.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      books: rawBooks.map(mapBook),
      totalCount,
      totalPages,
      currentPage,
      activeCategoryName,
    };
  } catch (error) {
    console.error("Error fetching catalog books:", error);
    return {
      books: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
    };
  }
}

// ---------------------------------------------------------------------------
// All active categories for the filter sidebar
// ---------------------------------------------------------------------------
export async function getAllActiveCategories(): Promise<HomepageCategory[]> {
  try {
    await dbConnect();

    const raw = await Category.find({ status: "ACTIVE" })
      .sort({ name: 1 })
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
