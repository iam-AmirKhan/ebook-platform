import { Types } from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import Purchase from "@/models/Purchase";
import ReadingProgress, { type IReadingProgressDocument } from "@/models/ReadingProgress";
import type {
  LibraryBook,
  PurchaseHistoryItem,
  AccountDashboardData,
} from "@/types/account";
import "@/models/Book"; // Ensure Book is registered for population
import "@/models/Author"; // Ensure Author is registered
import "@/models/Category"; // Ensure Category is registered

export async function getAccountDashboardData(
  userId: string
): Promise<AccountDashboardData> {
  await dbConnect();

  // 1. Fetch all ACTIVE purchases for the user (to build the library)
  // Populate the book, and nested author + category
  const activePurchases = await Purchase.find({
    user: userId,
    status: "ACTIVE",
  })
    .sort({ purchasedAt: -1 })
    .populate({
      path: "book",
      select: "title slug coverImage author category status",
      match: { status: "PUBLISHED" }, // Only include if the book is still published
      populate: [
        { path: "author", select: "penName" },
        { path: "category", select: "name" },
      ],
    })
    .lean();

  // Filter out purchases where the book was not found or not published
  const validPurchases = activePurchases.filter((p) => p.book != null);

  interface PopulatedBook {
    _id: unknown;
    title: string;
    slug: string;
    coverImage?: string | null;
    author?: { penName: string } | null;
    category?: { name: string } | null;
  }

  // Extract book IDs from the valid library to fetch their progress
  const libraryBookIds: Types.ObjectId[] = validPurchases.map(
    (p) => (p.book as unknown as PopulatedBook)._id as Types.ObjectId
  );

  // 2. Fetch all reading progress records for these books in one query
  const progressRecords = await ReadingProgress.find({
    user: userId,
    book: { $in: libraryBookIds },
  }).lean();

  // Map progress records by book ID for quick lookup
  const progressMap = new Map<string, IReadingProgressDocument>();
  for (const record of progressRecords) {
    progressMap.set(String(record.book), record);
  }

  // 3. Build the final Library array
  const library: LibraryBook[] = validPurchases.map((p) => {
    const bookDoc = p.book as unknown as PopulatedBook;
    const bookId = String(bookDoc._id);
    const progressDoc = progressMap.get(bookId);

    return {
      _id: bookId,
      title: bookDoc.title,
      slug: bookDoc.slug,
      coverImage: bookDoc.coverImage ?? null,
      authorName: bookDoc.author?.penName ?? "Unknown Author",
      categoryName: bookDoc.category?.name ?? "Uncategorised",
      purchasedAt: p.purchasedAt instanceof Date ? p.purchasedAt.toISOString() : String(p.purchasedAt),
      price: p.price,
      currency: p.currency,
      progress: progressDoc?.progress ?? 0,
      lastReadAt: progressDoc?.lastReadAt
        ? progressDoc.lastReadAt instanceof Date
          ? progressDoc.lastReadAt.toISOString()
          : String(progressDoc.lastReadAt)
        : null,
    };
  });

  // 4. Derive recent reads (books with >0 progress or a lastReadAt date)
  // Sort them by lastReadAt descending
  const recentReads = library
    .filter((b) => b.lastReadAt !== null)
    .sort((a, b) => {
      if (!a.lastReadAt || !b.lastReadAt) return 0;
      return new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime();
    })
    .slice(0, 4); // Limit to top 4 recent reads

  // 5. Fetch ALL purchase history (including refunded/cancelled)
  const allPurchases = await Purchase.find({ user: userId })
    .sort({ purchasedAt: -1 })
    .populate({ path: "book", select: "title" })
    .lean();

  const purchaseHistory: PurchaseHistoryItem[] = allPurchases.map((p) => ({
    _id: String(p._id),
    bookTitle: (p.book as unknown as PopulatedBook)?.title ?? "Unknown Book",
    price: p.price,
    currency: p.currency,
    status: p.status,
    purchasedAt: p.purchasedAt instanceof Date ? p.purchasedAt.toISOString() : String(p.purchasedAt),
  }));

  return {
    library,
    recentReads,
    purchaseHistory,
  };
}
