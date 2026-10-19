"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import Review from "@/models/Review";
import Purchase from "@/models/Purchase";
import Book from "@/models/Book";
import type { ActionResult } from "@/types/author";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export async function submitBookReview(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return {
      success: false,
      error: "পর্যালোচনা জমা দিতে অনুগ্রহ করে লগইন করুন।",
    };
  }

  const rawBookId = formData.get("bookId");
  const rawRating = formData.get("rating");
  const rawComment = formData.get("comment");

  const bookId = typeof rawBookId === "string" ? rawBookId.trim() : "";
  const rating = typeof rawRating === "string" ? parseInt(rawRating, 10) : Number(rawRating);
  const comment = typeof rawComment === "string" ? rawComment.trim() : "";

  // 1. Validation
  if (!bookId || !OBJECT_ID_REGEX.test(bookId)) {
    return {
      success: false,
      error: "অকার্যকর বই তথ্য।",
    };
  }

  if (isNaN(rating) || rating < 1 || rating > 5) {
    return {
      success: false,
      error: "অনুগ্রহ করে ১ থেকে ৫ এর মধ্যে রেটিং নির্বাচন করুন।",
      fieldErrors: { rating: ["১ থেকে ৫ এর মধ্যে রেটিং আবশ্যক"] },
    };
  }

  if (!comment || comment.length < 3) {
    return {
      success: false,
      error: "পর্যালোচনা অন্তত ৩ অক্ষরের হতে হবে।",
      fieldErrors: { comment: ["কমপক্ষে ৩ অক্ষর লিখুন"] },
    };
  }

  if (comment.length > 1000) {
    return {
      success: false,
      error: "পর্যালোচনা সর্বোচ্চ ১,০০০ অক্ষরের হতে পারে।",
      fieldErrors: { comment: ["১,০০০ অক্ষরের বেশি গ্রহণযোগ্য নয়"] },
    };
  }

  try {
    await dbConnect();

    // 2. Access control: verify verified active purchase
    const hasPurchased = await Purchase.exists({
      user: new Types.ObjectId(user.id),
      book: new Types.ObjectId(bookId),
      status: "ACTIVE",
    });

    if (!hasPurchased) {
      return {
        success: false,
        error: "শুধুমাত্র বইটি ক্রয়কারী পাঠকরাই পর্যালোচনা ও রেটিং দিতে পারবেন।",
      };
    }

    // 3. Verify book exists and is published
    const book = await Book.findById(bookId).select("slug status").lean();
    if (!book || book.status !== "PUBLISHED") {
      return {
        success: false,
        error: "বইটি খুঁজে পাওয়া যায়নি অথবা এটি বর্তমানে উপলব্ধ নেই।",
      };
    }

    // 4. One review per user per book: upsert with status = PENDING
    await Review.findOneAndUpdate(
      {
        user: new Types.ObjectId(user.id),
        book: new Types.ObjectId(bookId),
      },
      {
        $set: {
          rating,
          comment,
          status: "PENDING",
          moderatedBy: null,
          moderatedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 5. Revalidate relevant paths
    revalidatePath(`/books/${book.slug}`);
    revalidatePath("/admin/reviews");

    return {
      success: true,
      message: "আপনার পর্যালোচনা সফলভাবে জমা হয়েছে এবং পর্যালোচনার জন্য অপেক্ষমাণ রয়েছে।",
    };
  } catch (error) {
    console.error("submitBookReview error:", error);
    return {
      success: false,
      error: "পর্যালোচনা সংরক্ষণ করতে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    };
  }
}
