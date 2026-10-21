import dbConnect from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/auth/authorization";
import Category, { type CategoryStatus } from "@/models/Category";
import Book from "@/models/Book";

export interface AdminCategoryItem {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  status: CategoryStatus;
  bookCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategoryCounts {
  all: number;
  active: number;
  inactive: number;
}

export interface AdminCategoriesResult {
  categories: AdminCategoryItem[];
  counts: AdminCategoryCounts;
}

export async function getAdminCategories(): Promise<AdminCategoriesResult> {
  await requireAdmin();
  await dbConnect();

  const [categoriesRaw, bookCounts] = await Promise.all([
    Category.find({}).sort({ name: 1 }).lean(),
    Book.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map<string, number>();
  for (const item of bookCounts) {
    if (item._id) {
      countMap.set(String(item._id), item.count);
    }
  }

  let active = 0;
  let inactive = 0;

  const categories: AdminCategoryItem[] = categoriesRaw.map((c) => {
    const isAct = c.status === "ACTIVE";
    if (isAct) active += 1;
    else inactive += 1;

    return {
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      status: c.status,
      bookCount: countMap.get(String(c._id)) ?? 0,
      createdAt:
        c.createdAt instanceof Date
          ? c.createdAt.toISOString()
          : String(c.createdAt),
      updatedAt:
        c.updatedAt instanceof Date
          ? c.updatedAt.toISOString()
          : String(c.updatedAt),
    };
  });

  return {
    categories,
    counts: {
      all: categories.length,
      active,
      inactive,
    },
  };
}
