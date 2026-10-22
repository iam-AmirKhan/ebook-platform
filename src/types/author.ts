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
  message?: string;
}

export interface AuthorFinancialSummary {
  lifetimeEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  withdrawnTotal: number;
}

export interface AuthorBookSaleItem {
  bookId: string;
  title: string;
  slug: string;
  coverImage: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  price: number;
  unitsSold: number;
  grossSales: number;
  authorEarnings: number;
}

export interface AuthorWithdrawalItem {
  _id: string;
  amount: number;
  currency: string;
  payoutMethod: "BKASH" | "NAGAD";
  payoutAccountNumber: string;
  status: "PENDING" | "ACCEPTED" | "PAID" | "REJECTED" | "CANCELLED";
  rejectionReason: string | null;
  cancellationReason: string | null;
  paymentTransactionId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
}

export interface AuthorProfileData {
  _id: string;
  userId: string;
  penName: string;
  slug: string;
  bio: string | null;
  profileImage: string | null;
  email: string;
  name: string;
  pendingEmail?: string | null;
  isOAuthUser?: boolean;
}

export interface PublicAuthorCard {
  _id: string;
  penName: string;
  slug: string;
  bio: string | null;
  profileImage: string | null;
  publishedBooksCount: number;
  createdAt: string;
}

export interface PublicAuthorProfile extends PublicAuthorCard {
  userImage?: string | null;
}

export interface PublicAuthorsResult {
  authors: PublicAuthorCard[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

