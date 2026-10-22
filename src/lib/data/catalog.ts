import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Author from "@/models/Author";
import Category from "@/models/Category";
import type { PipelineStage } from "mongoose";
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
  displayOrder?: number;
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
    displayOrder: typeof raw.displayOrder === "number" ? raw.displayOrder : 10000,
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

    const inactiveAuthorIds = await Author.find({ status: "INACTIVE" }).distinct("_id");

    const query: Record<string, unknown> = {
      status: "PUBLISHED",
      ...(inactiveAuthorIds.length > 0 ? { author: { $nin: inactiveAuthorIds } } : {}),
    };
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

    const isDefaultSort = !params.sort || params.sort === "featured";

    let rawBooks: Array<{
      _id: unknown;
      title: string;
      slug: string;
      coverImage?: string | null;
      price: number;
      discountPrice?: number | null;
      currency: string;
      createdAt: Date;
      displayOrder?: number;
      author?: { penName?: string; slug?: string } | null;
      category?: { name?: string; slug?: string } | null;
    }> = [];
    let totalCount = 0;

    if (isDefaultSort) {
      // In MongoDB, null/missing fields sort BEFORE numbers in ascending order.
      // We use aggregation with $ifNull to evaluate null/missing displayOrder as 10000,
      // ensuring explicitly ranked books (1-8) appear first without any database writes.
      const pipeline: PipelineStage[] = [
        { $match: query },
        {
          $addFields: {
            effectiveDisplayOrder: {
              $ifNull: ["$displayOrder", 10000],
            },
          },
        },
        { $sort: { effectiveDisplayOrder: 1, createdAt: -1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            title: 1,
            slug: 1,
            coverImage: 1,
            price: 1,
            discountPrice: 1,
            currency: 1,
            createdAt: 1,
            displayOrder: 1,
            author: 1,
            category: 1,
          },
        },
      ];

      const [rawAggBooks, count] = await Promise.all([
        Book.aggregate(pipeline),
        Book.countDocuments(query),
      ]);

      void Author;
      void Category;
      rawBooks = (await Book.populate(rawAggBooks, [
        { path: "author", select: "penName slug" },
        { path: "category", select: "name slug" },
      ])) as typeof rawBooks;
      totalCount = count;
    } else {
      let sortObj: Record<string, 1 | -1>;
      if (params.sort === "latest") {
        sortObj = { createdAt: -1, _id: 1 };
      } else if (params.sort === "price-asc") {
        sortObj = { price: 1, createdAt: -1, _id: 1 };
      } else if (params.sort === "price-desc") {
        sortObj = { price: -1, createdAt: -1, _id: 1 };
      } else if (params.sort === "title-asc") {
        sortObj = { title: 1, createdAt: -1, _id: 1 };
      } else {
        sortObj = { createdAt: -1, _id: 1 };
      }

      // Execute Data Queries in Parallel
      const [foundBooks, count] = await Promise.all([
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
          .select("title slug coverImage price discountPrice currency createdAt displayOrder")
          .lean(),
        Book.countDocuments(query),
      ]);

      rawBooks = foundBooks as typeof rawBooks;
      totalCount = count;
    }

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

    const inactiveAuthorIds = await Author.find({ status: "INACTIVE" }).distinct("_id");

    const publishedCategoryIds = await Book.distinct("category", {
      status: "PUBLISHED",
      ...(inactiveAuthorIds.length > 0 ? { author: { $nin: inactiveAuthorIds } } : {}),
    });

    const raw = await Category.find({
      _id: { $in: publishedCategoryIds },
      status: "ACTIVE",
    })
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
