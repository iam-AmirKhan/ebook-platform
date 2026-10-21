import type { HomepageBook } from "./homepage";

// ---------------------------------------------------------------------------
// Chapter sent to the client after server-side access control.
//
// SECURITY: `content` is null for locked chapters when the user does not own
// the book. The field is stripped inside the Data Access Layer (server-only)
// before the data is serialized into props. It never reaches unauthorized
// clients through rendered HTML, RSC payload, or serialized props.
// ---------------------------------------------------------------------------
export interface ChapterPreview {
  order: number;
  title: string;
  isPreview: boolean;
  teaser: string;
  /** Full chapter text, or null when the chapter is locked for this user. */
  content: string | null;
}

export interface BookDetails {
  _id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  price: number;
  discountPrice: number | null;
  currency: string;
  createdAt: string;
  author: {
    _id: string;
    penName: string;
    slug: string;
    bio: string | null;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };

  // -------------------------------------------------------------------------
  // Phase 6 additions — optional so existing callers remain type-safe
  // -------------------------------------------------------------------------
  language: string | null;
  summary: string | null;
  learningOutcomes: string[];
  /**
   * Chapters after access-control stripping.
   * Locked chapter content is null. The array is sorted by `order` ascending.
   */
  chapters: ChapterPreview[];
  /** Whether the current requesting user has active ownership/purchase of the book. */
  isOwned?: boolean;
}

export interface BookReview {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
  reviewerId?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED" | "HIDDEN";
}

export interface BookRatingSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<number, number>;
}

export interface BookDetailsData {
  book: BookDetails;
  reviews: BookReview[];
  relatedBooks: HomepageBook[];
  isOwnedByUser: boolean;
  ratingSummary?: BookRatingSummary;
  userReview?: BookReview | null;
}

