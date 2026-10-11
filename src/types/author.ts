/**
 * Plain serializable types for the author dashboard.
 * These are returned by the DAL after .lean() calls and are safe
 * to pass as props from Server Components to Client Components.
 */

export interface AuthorBookListItem {
  _id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  price: number;
  currency: string;
  categoryName: string;
  updatedAt: string; // ISO string
  createdAt: string; // ISO string
}

export interface CategoryOption {
  _id: string;
  name: string;
  slug: string;
}

export interface BookFormData {
  _id?: string;
  title: string;
  slug: string;
  coverImage: string | null;
  categoryId: string;
  language: string;
  summary: string;
  description: string;
  learningOutcomes: string[];
  price: number;
  discountPrice: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  chapters: ChapterFormData[];
}

export interface ChapterFormData {
  order: number;
  title: string;
  teaser: string;
  content: string;
  isPreview: boolean;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  bookId?: string;
  slug?: string;
}
