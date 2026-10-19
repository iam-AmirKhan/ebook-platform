"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import Book from "@/models/Book";
import Purchase from "@/models/Purchase";
import Order from "@/models/Order";
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
  formData: FormData,
  overrideUserId?: string
): Promise<PaymentActionResult> {
  let userId: string | null = null;
  if (overrideUserId) {
    userId = overrideUserId;
  } else {
    try {
      const user = await getCurrentUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }
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

  revalidatePath(`/books/${book.slug}`);
  revalidatePath("/account");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/orders");

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
