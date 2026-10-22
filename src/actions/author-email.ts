"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/VerificationToken";
import { requireAuthor } from "@/lib/auth/authorization";
import { sendEmailChangeVerificationEmail } from "@/lib/notifications/email-verification";
import { z } from "zod";

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "সঠিক ইমেইল ঠিকানা প্রদান করুন।" });

export interface AuthorEmailActionResult {
  success: boolean;
  message?: string;
  error?: string;
  newEmail?: string;
}

function safeRevalidatePath(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Safe fallback when invoked outside Next.js request context (e.g. unit/regression tests)
  }
}

/**
 * Server action: author requests an email change.
 * Generates a single-use cryptographically secure verification token,
 * stores its SHA-256 hash in DB, and emails the verification link to the new address.
 * The current login email is completely preserved until the new address is verified.
 */
export async function requestAuthorEmailChangeAction(
  _prevState: AuthorEmailActionResult | null,
  formData: FormData
): Promise<AuthorEmailActionResult> {
  const user = await requireAuthor();

  const rawEmail = formData.get("newEmail");
  if (!rawEmail || typeof rawEmail !== "string") {
    return {
      success: false,
      error: "নতুন ইমেইল ঠিকানা প্রদান করুন।",
    };
  }

  const parsed = EmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "সঠিক ইমেইল ঠিকানা দিন।",
    };
  }

  const newEmail = parsed.data;

  await dbConnect();

  const dbUser = await User.findById(user.id);
  if (!dbUser) {
    return {
      success: false,
      error: "ব্যবহারকারী অ্যাকাউন্ট পাওয়া যায়নি।",
    };
  }

  // Google OAuth account safety:
  // If user has no passwordHash, their account is exclusively authenticated via Google OAuth.
  // Changing email would silently disconnect their Google identity and lock them out.
  if (!dbUser.passwordHash) {
    return {
      success: false,
      error:
        "আপনার অ্যাকাউন্টটি গুগল সাইন-ইন (Google OAuth)-এর মাধ্যমে পরিচালিত। গুগল অ্যাকাউন্টের পরিচয় সুরক্ষিত রাখতে সরাসরি ইমেইল পরিবর্তন সমর্থিত নয়।",
    };
  }

  // Check if new email is identical to current active email
  if (dbUser.email.toLowerCase().trim() === newEmail) {
    return {
      success: false,
      error: "নতুন ইমেইল আপনার বর্তমান ইমেইল ঠিকানার মতোই একই।",
    };
  }

  // Check for duplicate emails across existing accounts
  const existingUser = await User.findOne({ email: newEmail }).lean();
  if (existingUser) {
    return {
      success: false,
      error: "এই ইমেইল ঠিকানাটি ইতোমধ্যে অন্য একটি অ্যাকাউন্টে ব্যবহৃত হচ্ছে।",
    };
  }

  // Clean up any previous pending email verification requests for this user
  await VerificationToken.deleteMany({
    userId: dbUser._id,
    type: "EMAIL_VERIFICATION",
  });

  // Generate secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

  await VerificationToken.create({
    userId: dbUser._id,
    email: newEmail,
    tokenHash,
    type: "EMAIL_VERIFICATION",
    expiresAt,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/verify-email?token=${rawToken}`;

  // Send verification email via existing Resend configuration
  await sendEmailChangeVerificationEmail({
    recipientEmail: newEmail,
    authorName: dbUser.name,
    verificationUrl,
  });

  safeRevalidatePath("/author");

  return {
    success: true,
    message: `একটি ভেরিফিকেশন লিঙ্ক '${newEmail}' ঠিকানায় পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করে ইমেইলটি নিশ্চিত করুন।`,
  };
}

/**
 * Server action: author cancels their pending email verification request.
 */
export async function cancelAuthorEmailChangeAction(): Promise<AuthorEmailActionResult> {
  const user = await requireAuthor();

  await dbConnect();
  await VerificationToken.deleteMany({
    userId: user.id,
    type: "EMAIL_VERIFICATION",
  });

  safeRevalidatePath("/author");

  return {
    success: true,
    message: "অপেক্ষমান ইমেইল পরিবর্তনের অনুরোধটি সফলভাবে বাতিল করা হয়েছে।",
  };
}

/**
 * Server action: verify the token and apply the new email address.
 * Safely validates token existence, expiration, single-use, and duplicate checks.
 */
export async function verifyEmailAction(
  rawToken: string
): Promise<AuthorEmailActionResult> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim() === "") {
    return {
      success: false,
      error: "ভেরিফিকেশন টোকেন অনুপস্থিত বা অবৈধ।",
    };
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken.trim())
    .digest("hex");

  await dbConnect();

  const tokenDoc = await VerificationToken.findOne({
    tokenHash,
    type: "EMAIL_VERIFICATION",
  });

  if (!tokenDoc) {
    return {
      success: false,
      error: "ভেরিফিকেশন লিঙ্কটি অবৈধ অথবা ইতোমধ্যে ব্যবহৃত হয়েছে।",
    };
  }

  if (tokenDoc.usedAt) {
    return {
      success: false,
      error: "এই ভেরিফিকেশন লিঙ্কটি ইতোমধ্যে ব্যবহার করা হয়েছে।",
    };
  }

  if (tokenDoc.expiresAt < new Date()) {
    return {
      success: false,
      error: "ভেরিফিকেশন লিঙ্কের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে ড্যাশবোর্ড থেকে পুনরায় চেষ্টা করুন।",
    };
  }

  // Check if target email was registered by someone else in the interim
  const conflict = await User.findOne({
    email: tokenDoc.email,
    _id: { $ne: tokenDoc.userId },
  });

  if (conflict) {
    return {
      success: false,
      error: "এই ইমেইল ঠিকানাটি ইতোমধ্যে অন্য একটি অ্যাকাউন্টে নিবন্ধিত হয়ে গেছে।",
    };
  }

  // Atomically claim the token to prevent concurrent reuse
  const claimed = await VerificationToken.findOneAndUpdate(
    { _id: tokenDoc._id, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  if (!claimed) {
    return {
      success: false,
      error: "এই ভেরিফিকেশন লিঙ্কটি ইতোমধ্যে ব্যবহার করা হয়েছে।",
    };
  }

  // Apply new email to User account
  await User.updateOne(
    { _id: tokenDoc.userId },
    { email: tokenDoc.email }
  );

  // Clean up remaining verification tokens for this user
  await VerificationToken.deleteMany({
    userId: tokenDoc.userId,
    type: "EMAIL_VERIFICATION",
  });

  safeRevalidatePath("/author");
  safeRevalidatePath("/account");

  return {
    success: true,
    newEmail: tokenDoc.email,
    message: "আপনার অ্যাকাউন্টের ইমেইল ঠিকানা সফলভাবে আপডেট করা হয়েছে!",
  };
}
