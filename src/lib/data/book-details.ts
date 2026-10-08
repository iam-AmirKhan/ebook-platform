import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Review from "@/models/Review";
import Purchase from "@/models/Purchase";
import type {
  BookDetails,
  BookReview,
} from "@/types/book-details";
import type { HomepageBook } from "@/types/homepage";

export async function getBookBySlug(slug: string): Promise<BookDetails | null> {
  await dbConnect();

  const book = await Book.findOne({ slug, status: "PUBLISHED" })
    .populate<{
      author: { _id: unknown; penName: string; slug: string; bio: string | null };
    }>("author", "penName slug bio")
    .populate<{
      category: { _id: unknown; name: string; slug: string };
    }>("category", "name slug")
    .lean();

  if (!book) {
    return null;
  }

  return {
    _id: String(book._id),
    title: book.title,
    slug: book.slug,
    description: book.description,
    coverImage: book.coverImage ?? null,
    price: book.price,
    discountPrice: book.discountPrice ?? null,
    currency: book.currency,
    createdAt: book.createdAt instanceof Date ? book.createdAt.toISOString() : String(book.createdAt),
    author: {
      _id: String(book.author?._id),
      penName: book.author?.penName ?? "Unknown Author",
      slug: book.author?.slug ?? "",
      bio: book.author?.bio ?? null,
    },
    category: {
      _id: String(book.category?._id),
      name: book.category?.name ?? "Uncategorised",
      slug: book.category?.slug ?? "",
    },
  };
}

export async function checkUserOwnership(
  userId: string,
  bookId: string
): Promise<boolean> {
  await dbConnect();
  const purchase = await Purchase.findOne({
    user: userId,
    book: bookId,
    status: "ACTIVE",
  }).lean();

  return !!purchase;
}

export async function getBookReviews(bookId: string): Promise<BookReview[]> {
  await dbConnect();

  const reviews = await Review.find({
    book: bookId,
    status: "PUBLISHED",
  })
    .sort({ createdAt: -1 })
    .populate<{ user: { name: string } }>("user", "name")
    .lean();

  return reviews.map((r) => ({
    _id: String(r._id),
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    reviewerName: r.user?.name ?? "Anonymous Reader",
  }));
}

export async function getRelatedBooks(
  categoryId: string,
  excludeBookId: string
): Promise<HomepageBook[]> {
  await dbConnect();

  const raw = await Book.find({
    status: "PUBLISHED",
    category: categoryId,
    _id: { $ne: excludeBookId },
  })
    .sort({ createdAt: -1 })
    .limit(6)
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

  return raw.map((r) => ({
    _id: String(r._id),
    title: r.title,
    slug: r.slug,
    coverImage: r.coverImage ?? null,
    price: r.price,
    discountPrice: r.discountPrice ?? null,
    currency: r.currency,
    authorName: r.author?.penName ?? "Unknown Author",
    authorSlug: r.author?.slug ?? "",
    categoryName: r.category?.name ?? "Uncategorised",
    categorySlug: r.category?.slug ?? "",
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }));
}
