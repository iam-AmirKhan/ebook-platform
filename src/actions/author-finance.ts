"use server";

import { revalidatePath } from "next/cache";
import { requireAuthor } from "@/lib/auth/authorization";
import { getAuthorByUserId } from "@/lib/data/author-dashboard";
import {
  requestAuthorWithdrawal,
  cancelAuthorWithdrawal,
} from "@/lib/services/finance";
import dbConnect from "@/lib/db/mongoose";
import Author from "@/models/Author";
import User from "@/models/User";
import type { ActionResult } from "@/types/author";

/**
 * Server action: author requests a payout.
 * Verifies author session, validates amount and payment account, calls finance service.
 */
export async function requestWithdrawalAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuthor();

  const author = await getAuthorByUserId(user.id);
  if (!author) {
    return {
      success: false,
      error: "আপনার অ্যাকাউন্টে কোনো সক্রিয় লেখক প্রোফাইল পাওয়া যায়নি।",
    };
  }

  const rawAmount = formData.get("amount");
  const payoutMethod = formData.get("payoutMethod") as "BKASH" | "NAGAD";
  const payoutAccountNumber = (formData.get("payoutAccountNumber") as string)?.trim();

  const amount = Number(rawAmount);

  if (isNaN(amount) || amount < 100) {
    return {
      success: false,
      error: "সর্বনিম্ন উত্তোলনের পরিমাণ ১০০ টাকা হতে হবে।",
    };
  }

  if (payoutMethod !== "BKASH" && payoutMethod !== "NAGAD") {
    return {
      success: false,
      error: "পেমেন্ট মাধ্যম হিসেবে bKash অথবা Nagad নির্বাচন করুন।",
    };
  }

  const phoneRegex = /^01[3-9]\d{8}$/;
  if (!payoutAccountNumber || !phoneRegex.test(payoutAccountNumber)) {
    return {
      success: false,
      error: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)।",
    };
  }

  try {
    const result = await requestAuthorWithdrawal(
      author._id,
      amount,
      payoutMethod,
      payoutAccountNumber
    );

    revalidatePath("/author");
    return {
      success: true,
      message: result.message,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "উত্তোলন অনুরোধ সম্পন্ন করা যায়নি।";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Server action: author cancels their own pending withdrawal.
 */
export async function cancelWithdrawalAction(
  withdrawalId: string
): Promise<ActionResult> {
  const user = await requireAuthor();

  const author = await getAuthorByUserId(user.id);
  if (!author) {
    return {
      success: false,
      error: "লেখক প্রোফাইল পাওয়া যায়নি।",
    };
  }

  try {
    const result = await cancelAuthorWithdrawal(withdrawalId, author._id);
    revalidatePath("/author");
    return {
      success: true,
      message: result.message,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "উত্তোলন প্রত্যাহার করা যায়নি।";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Server action: update author display profile (pen name, bio, profile image).
 */
export async function updateAuthorProfileAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuthor();

  const author = await getAuthorByUserId(user.id);
  if (!author) {
    return {
      success: false,
      error: "লেখক প্রোফাইল পাওয়া যায়নি।",
    };
  }

  const penName = (formData.get("penName") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim() || null;
  const profileImage = (formData.get("profileImage") as string)?.trim() || null;

  if (!penName || penName.length < 2 || penName.length > 80) {
    return {
      success: false,
      error: "লেখকের নাম অবশ্যই ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে।",
    };
  }

  if (bio && bio.length > 2000) {
    return {
      success: false,
      error: "বায়ো সর্বোচ্চ ২০০০ অক্ষরের মধ্যে হতে হবে।",
    };
  }

  if (profileImage && !/^https?:\/\/.+/.test(profileImage)) {
    return {
      success: false,
      error: "প্রোফাইল ছবির জন্য একটি সঠিক লিঙ্ক (URL) দিন।",
    };
  }

  await dbConnect();

  await Author.updateOne(
    { _id: author._id },
    {
      penName,
      bio,
      profileImage,
    }
  );

  // Sync user display name if matching
  await User.updateOne({ _id: user.id }, { name: penName });

  revalidatePath("/author");
  return {
    success: true,
    message: "লেখক প্রোফাইল সফলভাবে আপডেট করা হয়েছে।",
  };
}
