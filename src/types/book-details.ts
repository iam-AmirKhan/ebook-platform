import type { HomepageBook } from "./homepage";

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
}

export interface BookReview {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
}

export interface BookDetailsData {
  book: BookDetails;
  reviews: BookReview[];
  relatedBooks: HomepageBook[];
  isOwnedByUser: boolean;
}
