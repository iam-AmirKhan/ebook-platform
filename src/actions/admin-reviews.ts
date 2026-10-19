"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/auth/authorization";
import Review from "@/models/Review";
import Book from "@/models/Book";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export interface AdminReviewActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function approveReview(
  reviewId: string
): Promise<AdminReviewActionResult> {
  const admin = await requireAdmin();

  if (!reviewId || !OBJECT_ID_REGEX.test(reviewId)) {
    return { success: false, error: "অকার্যকর রিভিউ আইডি।" };
  }

  try {
    await dbConnect();

    const review = await Review.findById(reviewId).select("book status");
    if (!review) {
      return { success: false, error: "রিভিউ খুঁজে পাওয়া যায়নি।" };
    }

    review.status = "APPROVED";
    review.moderatedBy = new Types.ObjectId(admin.id);
    review.moderatedAt = new Date();
    await review.save();

    // Revalidate public book page and admin list
    const book = await Book.findById(review.book).select("slug").lean();
    if (book?.slug) {
      revalidatePath(`/books/${book.slug}`);
    }
    revalidatePath("/admin/reviews");
    revalidatePath("/admin");

    return { success: true, message: "রিভিউ সফলভাবে অনুমোদিত হয়েছে।" };
  } catch (error) {
    console.error("approveReview error:", error);
    return { success: false, error: "রিভিউ অনুমোদন করতে সমস্যা হয়েছে।" };
  }
}

export async function rejectReview(
  reviewId: string
): Promise<AdminReviewActionResult> {
  const admin = await requireAdmin();

  if (!reviewId || !OBJECT_ID_REGEX.test(reviewId)) {
    return { success: false, error: "অকার্যকর রিভিউ আইডি।" };
  }

  try {
    await dbConnect();

    const review = await Review.findById(reviewId).select("book status");
    if (!review) {
      return { success: false, error: "রিভিউ খুঁজে পাওয়া যায়নি।" };
    }

    review.status = "REJECTED";
    review.moderatedBy = new Types.ObjectId(admin.id);
    review.moderatedAt = new Date();
    await review.save();

    const book = await Book.findById(review.book).select("slug").lean();
    if (book?.slug) {
      revalidatePath(`/books/${book.slug}`);
    }
    revalidatePath("/admin/reviews");
    revalidatePath("/admin");

    return { success: true, message: "রিভিউ সফলভাবে প্রত্যাখ্যান করা হয়েছে।" };
  } catch (error) {
    console.error("rejectReview error:", error);
    return { success: false, error: "রিভিউ প্রত্যাখ্যান করতে সমস্যা হয়েছে।" };
  }
}

export async function updateReviewByAdmin(
  reviewId: string,
  data: {
    rating: number;
    comment: string;
    status?: "PENDING" | "APPROVED" | "REJECTED";
  }
): Promise<AdminReviewActionResult> {
  const admin = await requireAdmin();

  if (!reviewId || !OBJECT_ID_REGEX.test(reviewId)) {
    return { success: false, error: "অকার্যকর রিভিউ আইডি।" };
  }

  if (isNaN(data.rating) || data.rating < 1 || data.rating > 5) {
    return { success: false, error: "রেটিং ১ থেকে ৫ এর মধ্যে হতে হবে।" };
  }

  const comment = data.comment?.trim();
  if (!comment || comment.length < 3) {
    return { success: false, error: "রিভিউ মন্তব্য কমপক্ষে ৩ অক্ষরের হতে হবে।" };
  }

  try {
    await dbConnect();

    const review = await Review.findById(reviewId);
    if (!review) {
      return { success: false, error: "রিভিউ খুঁজে পাওয়া যায়নি।" };
    }

    review.rating = data.rating;
    review.comment = comment;
    if (data.status) {
      review.status = data.status;
    }
    review.moderatedBy = new Types.ObjectId(admin.id);
    review.moderatedAt = new Date();
    await review.save();

    const book = await Book.findById(review.book).select("slug").lean();
    if (book?.slug) {
      revalidatePath(`/books/${book.slug}`);
    }
    revalidatePath("/admin/reviews");
    revalidatePath("/admin");

    return { success: true, message: "রিভিউ সফলভাবে হালনাগাদ করা হয়েছে।" };
  } catch (error) {
    console.error("updateReviewByAdmin error:", error);
    return { success: false, error: "রিভিউ হালনাগাদ করতে ব্যর্থ হয়েছে।" };
  }
}

export async function deleteReviewByAdmin(
  reviewId: string
): Promise<AdminReviewActionResult> {
  await requireAdmin();

  if (!reviewId || !OBJECT_ID_REGEX.test(reviewId)) {
    return { success: false, error: "অকার্যকর রিভিউ আইডি।" };
  }

  try {
    await dbConnect();

    const review = await Review.findByIdAndDelete(reviewId);
    if (review?.book) {
      const book = await Book.findById(review.book).select("slug").lean();
      if (book?.slug) {
        revalidatePath(`/books/${book.slug}`);
      }
    }
    revalidatePath("/admin/reviews");
    revalidatePath("/admin");

    return { success: true, message: "রিভিউ সফলভাবে মুছে ফেলা হয়েছে।" };
  } catch (error) {
    console.error("deleteReviewByAdmin error:", error);
    return { success: false, error: "রিভিউ মুছতে ব্যর্থ হয়েছে।" };
  }
}
