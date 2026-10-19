import dbConnect from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/auth/authorization";
import Review from "@/models/Review";
import Book from "@/models/Book";
import User from "@/models/User";

export interface AdminReviewCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AdminReviewsSearchParams {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminReviewItem {
  _id: string;
  rating: number;
  comment: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED" | "HIDDEN";
  createdAt: string;
  updatedAt: string;
  moderatedAt?: string | null;
  moderatedByName?: string | null;
  book: {
    _id: string;
    title: string;
    slug: string;
    coverImage: string | null;
  };
  user: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface AdminReviewsResult {
  reviews: AdminReviewItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export async function getAdminReviewCounts(): Promise<AdminReviewCounts> {
  await requireAdmin();
  await dbConnect();

  const [all, pending, approved, rejected] = await Promise.all([
    Review.countDocuments(),
    Review.countDocuments({ status: "PENDING" }),
    Review.countDocuments({ status: { $in: ["APPROVED", "PUBLISHED"] } }),
    Review.countDocuments({ status: { $in: ["REJECTED", "HIDDEN"] } }),
  ]);

  return { all, pending, approved, rejected };
}

export async function getAdminReviews(
  params: AdminReviewsSearchParams
): Promise<AdminReviewsResult> {
  await requireAdmin();
  await dbConnect();

  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 50) : 15;
  const requestedPage = params.page && params.page > 0 ? params.page : 1;

  // 1. Build status filter
  const query: Record<string, unknown> = {};
  if (params.status && params.status !== "ALL") {
    if (params.status === "PENDING") {
      query.status = "PENDING";
    } else if (params.status === "APPROVED") {
      query.status = { $in: ["APPROVED", "PUBLISHED"] };
    } else if (params.status === "REJECTED") {
      query.status = { $in: ["REJECTED", "HIDDEN"] };
    }
  }

  // 2. Build search filter
  if (params.q && params.q.trim()) {
    const searchRegex = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [matchedUsers, matchedBooks] = await Promise.all([
      User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
        .select("_id")
        .lean(),
      Book.find({ title: searchRegex })
        .select("_id")
        .lean(),
    ]);

    const orConditions: Record<string, unknown>[] = [
      { comment: searchRegex },
    ];

    if (matchedUsers.length > 0) {
      orConditions.push({ user: { $in: matchedUsers.map((u) => u._id) } });
    }
    if (matchedBooks.length > 0) {
      orConditions.push({ book: { $in: matchedBooks.map((b) => b._id) } });
    }

    query.$or = orConditions;
  }

  // 3. Count documents
  const totalCount = await Review.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const skip = (currentPage - 1) * limit;

  // 4. Fetch populated reviews
  const rawReviews = await Review.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate<{ book: { _id: unknown; title?: string; slug?: string; coverImage?: string | null } | null }>(
      "book",
      "title slug coverImage"
    )
    .populate<{ user: { _id: unknown; name?: string; email?: string } | null }>(
      "user",
      "name email"
    )
    .populate<{ moderatedBy: { _id: unknown; name?: string } | null }>(
      "moderatedBy",
      "name"
    )
    .lean();

  const reviews: AdminReviewItem[] = rawReviews.map((r) => ({
    _id: String(r._id),
    rating: r.rating,
    comment: r.comment,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED" | "HIDDEN",
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    moderatedAt: r.moderatedAt instanceof Date ? r.moderatedAt.toISOString() : r.moderatedAt ? String(r.moderatedAt) : null,
    moderatedByName: r.moderatedBy?.name ?? null,
    book: {
      _id: String(r.book?._id ?? ""),
      title: r.book?.title ?? "অজানা বই",
      slug: r.book?.slug ?? "",
      coverImage: r.book?.coverImage ?? null,
    },
    user: {
      _id: String(r.user?._id ?? ""),
      name: r.user?.name ?? "অজানা ব্যবহারকারী",
      email: r.user?.email ?? "",
    },
  }));

  return {
    reviews,
    totalCount,
    totalPages,
    currentPage,
  };
}
