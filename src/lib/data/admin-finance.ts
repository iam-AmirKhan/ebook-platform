/**
 * Server-only Data Access Layer for Admin Finance.
 * Requires verified ADMIN session at the caller level.
 */

import { Types } from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/auth/authorization";
import Order, { type OrderStatus } from "@/models/Order";
import Withdrawal, {
  type WithdrawalStatus,
} from "@/models/Withdrawal";
import Author from "@/models/Author";
import Book from "@/models/Book";
import User from "@/models/User";
import FinancialLedger from "@/models/FinancialLedger";
import {
  calculatePlatformStats,
  calculateAuthorBalances,
  type PlatformFinancialStats,
} from "@/lib/services/finance";
import {
  getPlatformSettings,
  type AdminPlatformSettings,
} from "./platform-settings";

export interface AdminOrderItemBook {
  bookId: string;
  title: string;
  price: number;
  quantity: number;
}

export interface AdminOrderItem {
  _id: string;
  orderNumber: string;
  userName: string;
  userEmail: string;
  bookTitle: string;
  bookId: string;
  bookPrice: number;
  items: AdminOrderItemBook[];
  total: number;
  currency: string;
  paymentMethod: string;
  senderNumber: string | null;
  transactionId: string | null;
  status: OrderStatus;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminOrderListResult {
  orders: AdminOrderItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    all: number;
    pending: number;
    paid: number;
    cancelled: number;
  };
}

export interface AdminWithdrawalListItem {
  _id: string;
  authorId: string;
  authorPenName: string;
  authorEmail: string;
  amount: number;
  currency: string;
  payoutMethod: string;
  payoutAccountNumber: string;
  status: WithdrawalStatus;
  paymentTransactionId: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
}

export interface AdminWithdrawalListResult {
  withdrawals: AdminWithdrawalListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    all: number;
    pending: number;
    accepted: number;
    paid: number;
    rejected: number;
  };
}

export interface AdminAuthorFinanceItem {
  authorId: string;
  penName: string;
  userName: string;
  userEmail: string;
  publishedBooksCount: number;
  totalSalesUnits: number;
  totalGrossSales: number;
  totalAuthorEarnings: number;
  withdrawnTotal: number;
  availableBalance: number;
  pendingBalance: number;
}

export interface AdminFinanceDashboardData {
  stats: PlatformFinancialStats;
  recentOrders: AdminOrderItem[];
  recentWithdrawals: AdminWithdrawalListItem[];
  settings: AdminPlatformSettings;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fetch overview financial stats, recent transactions, and current settings.
 */
export async function getAdminFinancialDashboardData(): Promise<AdminFinanceDashboardData> {
  await requireAdmin();
  await dbConnect();

  const [stats, settings, recentOrdersResult, recentWithdrawalsResult] =
    await Promise.all([
      calculatePlatformStats(),
      getPlatformSettings(),
      getAdminOrders({ page: 1, limit: 5 }),
      getAdminWithdrawals({ page: 1, limit: 5 }),
    ]);

  return {
    stats,
    settings,
    recentOrders: recentOrdersResult.orders,
    recentWithdrawals: recentWithdrawalsResult.withdrawals,
  };
}

/**
 * Server-side paginated & searchable orders query.
 */
export async function getAdminOrders(options?: {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<AdminOrderListResult> {
  await requireAdmin();
  await dbConnect();

  const rawPage = options?.page ?? 1;
  const limit = Math.max(1, Math.min(50, options?.limit ?? 10));
  const statusFilter = options?.status?.toUpperCase();
  const search = options?.q?.trim();

  // 1. Build counts for all status tabs
  const [allCount, pendingCount, paidCount, cancelledCount] =
    await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "PENDING" }),
      Order.countDocuments({ status: "PAID" }),
      Order.countDocuments({ status: "CANCELLED" }),
    ]);

  const counts = {
    all: allCount,
    pending: pendingCount,
    paid: paidCount,
    cancelled: cancelledCount,
  };

  // 2. Build filtered query
  const query: Record<string, unknown> = {};

  if (statusFilter && ["PENDING", "PAID", "CANCELLED", "FAILED", "REFUNDED"].includes(statusFilter)) {
    query.status = statusFilter as OrderStatus;
  }

  if (search) {
    const escaped = escapeRegex(search);
    const regex = new RegExp(escaped, "i");

    // Search users by name/email
    const matchingUsers = await User.find({
      $or: [{ name: regex }, { email: regex }],
    })
      .select("_id")
      .lean();

    const userIds = matchingUsers.map((u) => u._id);

    query.$or = [
      { transactionId: regex },
      { senderNumber: regex },
      { "items.title": regex },
      { user: { $in: userIds } },
    ];
  }

  const totalCount = await Order.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);
  const skip = (currentPage - 1) * limit;

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate<{ user: { name: string; email: string } }>("user", "name email")
    .lean();

  const formattedOrders: AdminOrderItem[] = orders.map((o) => {
    const items: AdminOrderItemBook[] = (o.items || []).map((it) => ({
      bookId: String(it.book ?? ""),
      title: it.title,
      price: it.price,
      quantity: it.quantity ?? 1,
    }));
    const firstItem = items[0];
    const displayTitle =
      items.length > 1
        ? `${firstItem?.title || "বই"} (+${items.length - 1}টি বই)`
        : firstItem?.title ?? "বই";

    return {
      _id: String(o._id),
      orderNumber: String(o._id).slice(-6).toUpperCase(),
      userName: o.user?.name ?? "অজানা ব্যবহারকারী",
      userEmail: o.user?.email ?? "",
      bookTitle: displayTitle,
      bookId: firstItem?.bookId ?? "",
      bookPrice: firstItem?.price ?? o.total,
      items,
      total: o.total,
      currency: o.currency ?? "BDT",
      paymentMethod: o.paymentMethod,
      senderNumber: o.senderNumber ?? null,
      transactionId: o.transactionId ?? null,
      status: o.status,
      adminNote: o.adminNote ?? null,
      createdAt:
        o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
      reviewedAt:
        o.reviewedAt instanceof Date
          ? o.reviewedAt.toISOString()
          : o.reviewedAt
          ? String(o.reviewedAt)
          : null,
    };
  });

  return {
    orders: formattedOrders,
    totalCount,
    totalPages,
    currentPage,
    counts,
  };
}

/**
 * Server-side paginated & searchable author withdrawals query.
 */
export async function getAdminWithdrawals(options?: {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<AdminWithdrawalListResult> {
  await requireAdmin();
  await dbConnect();

  const rawPage = options?.page ?? 1;
  const limit = Math.max(1, Math.min(50, options?.limit ?? 10));
  const statusFilter = options?.status?.toUpperCase();
  const search = options?.q?.trim();

  // Tab counts
  const [allCount, pendingCount, acceptedCount, paidCount, rejectedCount] =
    await Promise.all([
      Withdrawal.countDocuments(),
      Withdrawal.countDocuments({ status: "PENDING" }),
      Withdrawal.countDocuments({ status: "ACCEPTED" }),
      Withdrawal.countDocuments({ status: "PAID" }),
      Withdrawal.countDocuments({ status: "REJECTED" }),
    ]);

  const counts = {
    all: allCount,
    pending: pendingCount,
    accepted: acceptedCount,
    paid: paidCount,
    rejected: rejectedCount,
  };

  const query: Record<string, unknown> = {};

  if (
    statusFilter &&
    ["PENDING", "ACCEPTED", "PAID", "REJECTED", "CANCELLED"].includes(statusFilter)
  ) {
    query.status = statusFilter as WithdrawalStatus;
  }

  if (search) {
    const escaped = escapeRegex(search);
    const regex = new RegExp(escaped, "i");

    // Search author by penName
    const matchingAuthors = await Author.find({ penName: regex })
      .select("_id")
      .lean();
    const authorIds = matchingAuthors.map((a) => a._id);

    query.$or = [
      { payoutAccountNumber: regex },
      { paymentTransactionId: regex },
      { author: { $in: authorIds } },
    ];
  }

  const totalCount = await Withdrawal.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);
  const skip = (currentPage - 1) * limit;

  const withdrawals = await Withdrawal.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate<{
      author: {
        _id: Types.ObjectId;
        penName: string;
        user: { name: string; email: string };
      };
    }>({
      path: "author",
      select: "penName user",
      populate: { path: "user", select: "name email" },
    })
    .lean();

  const formattedWithdrawals: AdminWithdrawalListItem[] = withdrawals.map((w) => ({
    _id: String(w._id),
    authorId: String(w.author?._id ?? ""),
    authorPenName: w.author?.penName ?? "অজানা লেখক",
    authorEmail: w.author?.user?.email ?? "",
    amount: w.amount,
    currency: w.currency ?? "BDT",
    payoutMethod: w.payoutMethod,
    payoutAccountNumber: w.payoutAccountNumber,
    status: w.status,
    paymentTransactionId: w.paymentTransactionId ?? null,
    rejectionReason: w.rejectionReason ?? null,
    cancellationReason: w.cancellationReason ?? null,
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

  return {
    withdrawals: formattedWithdrawals,
    totalCount,
    totalPages,
    currentPage,
    counts,
  };
}

/**
 * Fetch author financial summaries for all authors.
 */
export async function getAdminAuthorsFinance(): Promise<AdminAuthorFinanceItem[]> {
  await requireAdmin();
  await dbConnect();

  const authors = await Author.find({ status: "ACTIVE" })
    .populate<{ user: { name: string; email: string } }>("user", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const authorSummaries = await Promise.all(
    authors.map(async (author) => {
      const authorIdStr = String(author._id);

      // Count published books
      const publishedBooksCount = await Book.countDocuments({
        author: author._id,
        status: "PUBLISHED",
      });

      // Balances
      const balances = await calculateAuthorBalances(author._id);

      // Aggregates for gross sales and units sold from ledger
      const salesAgg = await FinancialLedger.aggregate<{
        _id: string;
        total: number;
        count: number;
      }>([
        {
          $match: {
            author: author._id,
            type: { $in: ["SALE", "AUTHOR_EARNING"] },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]);

      let totalSalesUnits = 0;
      let totalGrossSales = 0;

      for (const row of salesAgg) {
        if (row._id === "SALE") {
          totalSalesUnits = row.count;
          totalGrossSales = row.total;
        }
      }

      return {
        authorId: authorIdStr,
        penName: author.penName,
        userName: author.user?.name ?? "",
        userEmail: author.user?.email ?? "",
        publishedBooksCount,
        totalSalesUnits,
        totalGrossSales,
        totalAuthorEarnings: balances.lifetimeEarnings,
        withdrawnTotal: balances.withdrawnTotal,
        availableBalance: balances.availableBalance,
        pendingBalance: balances.pendingBalance,
      };
    })
  );

  return authorSummaries;
}
