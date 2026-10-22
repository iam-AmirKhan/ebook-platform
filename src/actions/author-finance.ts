"use server";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
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

function safeRevalidatePath(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Safe fallback when invoked outside Next.js request context (e.g. unit/regression tests)
  }
}

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

function isValidImageBuffer(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

/**
 * Server action: update author display profile (pen name, bio, profile image).
 * Supports choosing an image file from the device gallery or supplying an image URL.
 * Uploaded files are validated on the server (size, MIME type, magic bytes) and saved locally.
 * Synchronizes both Author.profileImage and User.image so the updated photo appears everywhere.
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
  const rawProfileImage = (formData.get("profileImage") as string)?.trim() || null;
  const avatarFile = formData.get("avatarFile");
  const removeImage = formData.get("removeImage") === "true";

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

  let finalProfileImage: string | null = rawProfileImage;

  if (removeImage) {
    finalProfileImage = null;
  } else if (avatarFile instanceof File && avatarFile.size > 0) {
    // 1. Validate file size (max 3MB)
    const MAX_FILE_SIZE = 3 * 1024 * 1024;
    if (avatarFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "ছবির সাইজ সর্বোচ্চ ৩ মেগাবাইট (3MB) হতে পারে।",
      };
    }

    // 2. Validate MIME type
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_TYPES.includes(avatarFile.type)) {
      return {
        success: false,
        error: "শুধুমাত্র JPEG, PNG অথবা WebP ফরম্যাটের ছবি গ্রহণযোগ্য।",
      };
    }

    // 3. Validate binary magic bytes to prevent masquerading
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!isValidImageBuffer(buffer, avatarFile.type)) {
      return {
        success: false,
        error: "অবৈধ অথবা করাপ্টেড ইমেজ ফাইল নির্বাচন করা হয়েছে।",
      };
    }

    // 4. Save to public/uploads/avatars/
    const ext =
      avatarFile.type === "image/png"
        ? "png"
        : avatarFile.type === "image/webp"
        ? "webp"
        : "jpg";
    const safeFileName = `avatar-${user.id}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, safeFileName), buffer);

    finalProfileImage = `/uploads/avatars/${safeFileName}`;
  } else if (finalProfileImage) {
    // Validate that manual/existing URL is either a valid web URL or a local uploads path
    const isLocalPath = finalProfileImage.startsWith("/uploads/avatars/");
    const isHttpUrl = /^https?:\/\/.+/.test(finalProfileImage);

    if (!isLocalPath && !isHttpUrl) {
      return {
        success: false,
        error: "প্রোফাইল ছবির জন্য একটি সঠিক লিঙ্ক (URL) দিন।",
      };
    }
  }

  await dbConnect();

  await Author.updateOne(
    { _id: author._id },
    {
      penName,
      bio,
      profileImage: finalProfileImage,
    }
  );

  // Sync user display name and profile image
  await User.updateOne(
    { _id: user.id },
    {
      name: penName,
      image: finalProfileImage,
    }
  );

  safeRevalidatePath("/author");
  safeRevalidatePath("/account");
  safeRevalidatePath("/");

  return {
    success: true,
    message: "লেখক প্রোফাইল সফলভাবে আপডেট করা হয়েছে।",
  };
}
