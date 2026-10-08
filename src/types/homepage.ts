/**
 * Shared lean projection types for homepage data fetching.
 * These are plain serialisable objects returned by Mongoose .lean() calls
 * and safe to pass from Server Components to Client Components as props.
 */

export interface HomepageBook {
  _id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  price: number;
  discountPrice: number | null;
  currency: string;
  authorName: string;
  authorSlug: string;
  categoryName: string;
  categorySlug: string;
  createdAt: string; // serialised ISO string
}

export interface HomepageCategory {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
}

export interface HomepageStats {
  /** Total PUBLISHED books — null means DB not yet seeded; show placeholder. */
  publishedBooks: number | null;
  /** Total ACTIVE authors — null means DB not yet seeded; show placeholder. */
  activeAuthors: number | null;
}
