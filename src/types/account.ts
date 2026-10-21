export interface LibraryBook {
  _id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  authorName: string;
  categoryName: string;
  purchasedAt: string;
  price: number;
  currency: string;
  progress: number;
  lastReadAt: string | null;
}

export interface PurchaseHistoryItem {
  _id: string;
  bookTitle: string;
  price: number;
  currency: string;
  status: string;
  purchasedAt: string;
}

export interface UserOrderItem {
  _id: string;
  orderNumber: string;
  bookTitle: string;
  items?: { title: string; price: number }[];
  price: number;
  currency: string;
  paymentMethod: string;
  transactionId: string | null;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
  createdAt: string;
}

export interface AccountDashboardData {
  library: LibraryBook[];
  recentReads: LibraryBook[]; // Derived from library books that have progress
  purchaseHistory: PurchaseHistoryItem[];
  orders: UserOrderItem[];
}
