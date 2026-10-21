"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import Book from "@/models/Book";
import Purchase from "@/models/Purchase";
import Order from "@/models/Order";
import "@/models/Author";
import { getPlatformSettings } from "@/lib/data/platform-settings";

export interface PaymentActionResult {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  bookSlug?: string;
  paymentMethod?: "BKASH" | "NAGAD";
  amount?: number;
  transactionId?: string;
  message?: string;
}

/**
 * Server action: readers place a manual payment order for a book.
 * Validates session, book status, active purchase, payment method settings,
 * phone number format, and duplicate transaction ID before creating/updating a PENDING order.
 *
 * NOTE: Reader access and author earnings are NOT granted here.
 * They are only granted upon admin verification in `recordVerifiedSale()`.
 */
export async function createManualOrderAction(
  _prevState: PaymentActionResult | null,
  formData: FormData
): Promise<PaymentActionResult> {
  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return {
      success: false,
      error: "অর্ডার সম্পন্ন করতে প্রথমে সাইন ইন করুন।",
    };
  }

  const bookId = (formData.get("bookId") as string)?.trim();
  const paymentMethod = formData.get("paymentMethod") as "BKASH" | "NAGAD";
  const senderNumber = (formData.get("senderNumber") as string)?.trim();
  const rawTxId = (formData.get("transactionId") as string)?.trim();

  if (!bookId) {
    return {
      success: false,
      error: "বইয়ের তথ্য পাওয়া যায়নি।",
    };
  }

  if (paymentMethod !== "BKASH" && paymentMethod !== "NAGAD") {
    return {
      success: false,
      error: "সঠিক পেমেন্ট মাধ্যম (bKash অথবা Nagad) নির্বাচন করুন।",
    };
  }

  const phoneRegex = /^01[3-9]\d{8}$/;
  if (!senderNumber || !phoneRegex.test(senderNumber)) {
    return {
      success: false,
      error: "সঠিক ১১ ডিজিটের বিকাশ/নগদ নম্বর দিন (যেমন: 01712345678)।",
    };
  }

  // Normalize TrxID: strip spaces and convert to uppercase
  const txId = rawTxId?.replace(/\s+/g, "").toUpperCase();
  if (!txId || txId.length < 4 || txId.length > 35 || !/^[A-Z0-9]+$/.test(txId)) {
    return {
      success: false,
      error: "সঠিক ট্রানজেকশন আইডি (TrxID) দিন। TrxID শুধুমাত্র ইংরেজি বর্ণ ও সংখ্যা হতে হবে (৪-৩৫ অক্ষর)।",
    };
  }

  await dbConnect();

  // 1. Verify book exists and is published
  const book = await Book.findOne({ _id: bookId, status: "PUBLISHED" }).lean();
  if (!book) {
    return {
      success: false,
      error: "বইটি খুঁজে পাওয়া যায়নি অথবা এটি বর্তমানে বিক্রয়ের জন্য উন্মুক্ত নয়।",
    };
  }

  // 2. Check if reader already owns the book
  const existingPurchase = await Purchase.findOne({
    user: new Types.ObjectId(userId),
    book: book._id,
    status: "ACTIVE",
  }).lean();

  if (existingPurchase) {
    return {
      success: false,
      error: "আপনি ইতিমধ্যে এই বইটি কিনেছেন। বইটি আপনার লাইব্রেরিতে রয়েছে।",
    };
  }

  // 3. Verify manual payment method is enabled by admin
  const settings = await getPlatformSettings();
  if (paymentMethod === "BKASH" && !settings.bkashEnabled) {
    return {
      success: false,
      error: "বর্তমানে bKash পেমেন্ট সাময়িকভাবে বন্ধ আছে। অন্য মাধ্যম ব্যবহার করুন।",
    };
  }
  if (paymentMethod === "NAGAD" && !settings.nagadEnabled) {
    return {
      success: false,
      error: "বর্তমানে Nagad পেমেন্ট সাময়িকভাবে বন্ধ আছে। অন্য মাধ্যম ব্যবহার করুন।",
    };
  }

  // 4. Check if reader already has an existing PENDING order for this book
  const existingUserPendingOrder = await Order.findOne({
    user: new Types.ObjectId(userId),
    "items.book": book._id,
    status: "PENDING",
  });

  // 5. Concurrency check: prevent reuse of transaction ID for PENDING or PAID orders across ANY order
  const existingTxOrder = await Order.findOne({
    transactionId: txId,
    status: { $in: ["PENDING", "PAID"] },
    _id: { $ne: existingUserPendingOrder?._id },
  }).lean();

  if (existingTxOrder) {
    return {
      success: false,
      error: "এই ট্রানজেকশন আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে আপনার লেনদেনের সঠিক ট্রানজেকশন আইডি প্রদান করুন।",
    };
  }

  // 6. Server-side price calculation (never trust client amounts)
  const hasDiscount =
    book.discountPrice !== null &&
    book.discountPrice !== undefined &&
    book.discountPrice < book.price;
  const effectivePrice = hasDiscount ? book.discountPrice! : book.price;

  // 7. Create or update PENDING order
  let order;
  if (existingUserPendingOrder) {
    existingUserPendingOrder.paymentMethod = paymentMethod;
    existingUserPendingOrder.senderNumber = senderNumber;
    existingUserPendingOrder.transactionId = txId;
    existingUserPendingOrder.subtotal = effectivePrice;
    existingUserPendingOrder.total = effectivePrice;
    await existingUserPendingOrder.save();
    order = existingUserPendingOrder;
  } else {
    order = await Order.create({
      user: new Types.ObjectId(userId),
      items: [
        {
          book: book._id,
          title: book.title,
          price: effectivePrice,
          quantity: 1,
        },
      ],
      subtotal: effectivePrice,
      discount: 0,
      total: effectivePrice,
      currency: book.currency || "BDT",
      paymentMethod,
      senderNumber,
      transactionId: txId,
      status: "PENDING",
    });
  }

  try {
    revalidatePath(`/books/${book.slug}`);
    revalidatePath("/account");
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/orders");
  } catch {
    // Safe fallback in standalone scripts or test executions
  }

  const orderNumber = String(order._id).slice(-6).toUpperCase();

  return {
    success: true,
    orderId: String(order._id),
    orderNumber,
    bookSlug: book.slug,
    paymentMethod,
    amount: effectivePrice,
    transactionId: txId,
    message: "আপনার পেমেন্ট তথ্য জমা হয়েছে। আমরা Transaction ID যাচাই করছি। Admin অনুমোদন দিলে বইটি পড়তে পারবেন। অনুগ্রহ করে অপেক্ষা করুন—আবার টাকা পাঠানোর প্রয়োজন নেই, যদি না Support থেকে বলা হয়।",
  };
}

export interface ValidatedCartBook {
  bookId: string;
  title: string;
  slug: string;
  coverImage: string | null;
  authorName: string;
  price: number;
  originalPrice: number;
  currency: string;
  isOwned: boolean;
  isAvailable: boolean;
}

export interface ValidateCartResult {
  success: boolean;
  items: ValidatedCartBook[];
  ownedBookIds: string[];
  unavailableBookIds: string[];
  grandTotal: number;
  error?: string;
}

/**
 * Server action to validate cart books:
 * - Checks which books exist and are published
 * - Identifies any books already owned by the logged-in reader
 * - Calculates official server-side prices and grand total
 */
export async function validateCartAction(
  bookIds: string[]
): Promise<ValidateCartResult> {
  await dbConnect();

  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
    return {
      success: true,
      items: [],
      ownedBookIds: [],
      unavailableBookIds: [],
      grandTotal: 0,
    };
  }

  const validObjectIds = bookIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  // Find published books
  const books = await Book.find({
    _id: { $in: validObjectIds },
    status: "PUBLISHED",
  })
    .populate<{ author: { penName: string } }>("author", "penName")
    .lean();

  const foundIds = new Set(books.map((b) => String(b._id)));
  const unavailableBookIds = bookIds.filter((id) => !foundIds.has(id));

  // Check which books are already owned by this user
  let ownedBookIds: string[] = [];
  if (userId && Types.ObjectId.isValid(userId)) {
    const ownedPurchases = await Purchase.find({
      user: new Types.ObjectId(userId),
      book: { $in: books.map((b) => b._id) },
      status: "ACTIVE",
    })
      .select("book")
      .lean();

    ownedBookIds = ownedPurchases.map((p) => String(p.book));
  }

  const ownedSet = new Set(ownedBookIds);

  let grandTotal = 0;
  const items: ValidatedCartBook[] = books.map((book) => {
    const hasDiscount =
      book.discountPrice !== null &&
      book.discountPrice !== undefined &&
      book.discountPrice < book.price;
    const effectivePrice = hasDiscount ? book.discountPrice! : book.price;
    const isOwned = ownedSet.has(String(book._id));

    if (!isOwned) {
      grandTotal += effectivePrice;
    }

    return {
      bookId: String(book._id),
      title: book.title,
      slug: book.slug,
      coverImage: book.coverImage ?? null,
      authorName: book.author?.penName ?? "অজানা লেখক",
      price: effectivePrice,
      originalPrice: book.price,
      currency: book.currency || "BDT",
      isOwned,
      isAvailable: true,
    };
  });

  return {
    success: true,
    items,
    ownedBookIds,
    unavailableBookIds,
    grandTotal,
  };
}

export interface MultiBookPaymentActionResult {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  paymentMethod?: "BKASH" | "NAGAD";
  amount?: number;
  transactionId?: string;
  message?: string;
  itemCount?: number;
}

/**
 * Server action: readers submit a multi-book cart checkout with ONE bKash/Nagad payment.
 * Validates session, every book status, active purchases, duplicate TrxID across all orders,
 * calculates server-side prices and creates ONE PENDING order.
 */
export async function createMultiBookOrderAction(
  _prevState: MultiBookPaymentActionResult | null,
  formData: FormData
): Promise<MultiBookPaymentActionResult> {
  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return {
      success: false,
      error: "অর্ডার সম্পন্ন করতে প্রথমে সাইন ইন করুন।",
    };
  }

  // Parse bookIds from JSON or multiple form values
  let rawBookIds: string[] = [];
  const bookIdsJson = formData.get("bookIdsJson") as string;
  if (bookIdsJson) {
    try {
      const parsed = JSON.parse(bookIdsJson);
      if (Array.isArray(parsed)) rawBookIds = parsed;
    } catch {
      // ignore JSON parse error
    }
  }
  if (rawBookIds.length === 0) {
    const allIds = formData.getAll("bookIds") as string[];
    if (allIds && allIds.length > 0) {
      rawBookIds = allIds;
    } else {
      const single = formData.get("bookIds") as string;
      if (single) rawBookIds = [single];
    }
  }

  // Deduplicate and filter valid ObjectIds
  const uniqueBookIds = Array.from(
    new Set(rawBookIds.map((id) => String(id).trim()))
  ).filter((id) => Types.ObjectId.isValid(id));

  if (uniqueBookIds.length === 0) {
    return {
      success: false,
      error: "আপনার কার্টে কোনো বই পাওয়া যায়নি।",
    };
  }

  const paymentMethod = formData.get("paymentMethod") as "BKASH" | "NAGAD";
  const senderNumber = (formData.get("senderNumber") as string)?.trim();
  const rawTxId = (formData.get("transactionId") as string)?.trim();

  if (paymentMethod !== "BKASH" && paymentMethod !== "NAGAD") {
    return {
      success: false,
      error: "সঠিক পেমেন্ট মাধ্যম (bKash অথবা Nagad) নির্বাচন করুন।",
    };
  }

  const phoneRegex = /^01[3-9]\d{8}$/;
  if (!senderNumber || !phoneRegex.test(senderNumber)) {
    return {
      success: false,
      error: "সঠিক ১১ ডিজিটের বিকাশ/নগদ নম্বর দিন (যেমন: 01712345678)।",
    };
  }

  // Normalize TrxID: strip spaces and convert to uppercase
  const txId = rawTxId?.replace(/\s+/g, "").toUpperCase();
  if (!txId || txId.length < 4 || txId.length > 35 || !/^[A-Z0-9]+$/.test(txId)) {
    return {
      success: false,
      error: "সঠিক ট্রানজেকশন আইডি (TrxID) দিন। TrxID শুধুমাত্র ইংরেজি বর্ণ ও সংখ্যা হতে হবে (৪-৩৫ অক্ষর)।",
    };
  }

  await dbConnect();

  // 1. Verify manual payment method is enabled by admin
  const settings = await getPlatformSettings();
  if (paymentMethod === "BKASH" && !settings.bkashEnabled) {
    return {
      success: false,
      error: "বর্তমানে bKash পেমেন্ট সাময়িকভাবে বন্ধ আছে। অন্য মাধ্যম ব্যবহার করুন।",
    };
  }
  if (paymentMethod === "NAGAD" && !settings.nagadEnabled) {
    return {
      success: false,
      error: "বর্তমানে Nagad পেমেন্ট সাময়িকভাবে বন্ধ আছে। অন্য মাধ্যম ব্যবহার করুন।",
    };
  }

  // 2. Concurrency check: prevent reuse of transaction ID for PENDING or PAID orders across ANY order
  const existingTxOrder = await Order.findOne({
    transactionId: txId,
    status: { $in: ["PENDING", "PAID"] },
  }).lean();

  if (existingTxOrder) {
    return {
      success: false,
      error: "এই ট্রানজেকশন আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে আপনার লেনদেনের সঠিক ট্রানজেকশন আইডি প্রদান করুন।",
    };
  }

  // 3. Verify all books exist and are published
  const bookObjectIds = uniqueBookIds.map((id) => new Types.ObjectId(id));
  const books = await Book.find({
    _id: { $in: bookObjectIds },
    status: "PUBLISHED",
  }).lean();

  if (books.length !== uniqueBookIds.length) {
    return {
      success: false,
      error: "কার্টের কিছু বই খুঁজে পাওয়া যায়নি অথবা বিক্রয়ের জন্য উন্মুক্ত নয়। অনুগ্রহ করে কার্টটি পুনরায় যাচাই করুন।",
    };
  }

  // 4. Verify user does not already own any of these books
  const existingPurchases = await Purchase.find({
    user: new Types.ObjectId(userId),
    book: { $in: bookObjectIds },
    status: "ACTIVE",
  }).lean();

  if (existingPurchases.length > 0) {
    return {
      success: false,
      error: "আপনার নির্বাচিত কিছু বই ইতিমধ্যে আপনার লাইব্রেরিতে রয়েছে। অনুগ্রহ করে কার্ট থেকে সেগুলো অপসারণ করে আবার চেষ্টা করুন।",
    };
  }

  // 5. Server-side price calculation (never trust client amounts)
  let grandTotal = 0;
  const orderItems = books.map((b) => {
    const hasDiscount =
      b.discountPrice !== null &&
      b.discountPrice !== undefined &&
      b.discountPrice < b.price;
    const effectivePrice = hasDiscount ? b.discountPrice! : b.price;
    grandTotal += effectivePrice;

    return {
      book: b._id,
      title: b.title,
      price: effectivePrice,
      quantity: 1,
    };
  });

  // 6. Create ONE PENDING order for all books
  const order = await Order.create({
    user: new Types.ObjectId(userId),
    items: orderItems,
    subtotal: grandTotal,
    discount: 0,
    total: grandTotal,
    currency: "BDT",
    paymentMethod,
    senderNumber,
    transactionId: txId,
    status: "PENDING",
  });

  try {
    revalidatePath("/cart");
    revalidatePath("/checkout/cart");
    revalidatePath("/account");
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/orders");
  } catch {
    // Safe fallback in standalone scripts or test executions
  }

  const orderNumber = String(order._id).slice(-6).toUpperCase();

  return {
    success: true,
    orderId: String(order._id),
    orderNumber,
    paymentMethod,
    amount: grandTotal,
    transactionId: txId,
    itemCount: orderItems.length,
    message: "আপনার পেমেন্ট তথ্য জমা হয়েছে। আমরা Transaction ID যাচাই করছি। Admin অনুমোদন দিলে সকল বই পড়তে পারবেন। অনুগ্রহ করে অপেক্ষা করুন—আবার টাকা পাঠানোর প্রয়োজন নেই, যদি না Support থেকে বলা হয়।",
  };
}
