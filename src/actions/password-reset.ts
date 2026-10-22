"use server";

import crypto from "crypto";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/VerificationToken";
import { hashPassword } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/notifications/password-reset";
import { z } from "zod";

const ForgotPasswordSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "সঠিক ইমেইল ঠিকানা প্রদান করুন।" });

export interface PasswordResetActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server action: handle request for password reset link.
 * Generates single-use cryptographically secure reset token, stores its SHA-256 hash in DB,
 * and sends reset link via Resend.
 * Returns a generic success message to prevent user enumeration.
 */
export async function requestPasswordResetAction(
  _prevState: PasswordResetActionResult | null,
  formData: FormData
): Promise<PasswordResetActionResult> {
  const rawEmail = formData.get("email");
  if (!rawEmail || typeof rawEmail !== "string") {
    return {
      success: false,
      error: "ইমেইল ঠিকানা প্রদান করুন।",
    };
  }

  const parsed = ForgotPasswordSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "সঠিক ইমেইল ঠিকানা দিন।",
    };
  }

  const normalizedEmail = parsed.data;

  await dbConnect();

  // Rate limiting / abuse prevention:
  // Check how many reset tokens were requested for this email in the last 15 minutes
  const recentRequestsCount = await VerificationToken.countDocuments({
    email: normalizedEmail,
    type: "PASSWORD_RESET",
    createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) },
  });

  // If rate limit exceeded, return the same generic message to avoid enumeration
  if (recentRequestsCount >= 3) {
    return {
      success: true,
      message:
        "যদি এই ইমেইলটি আমাদের প্ল্যাটফর্মে নিবন্ধিত থাকে, তবে পাসওয়ার্ড রিসেট করার একটি লিঙ্ক পাঠানো হয়েছে। দয়া করে আপনার ইনবক্স চেক করুন।",
    };
  }

  // Find user by email
  const user = await User.findOne({
    email: normalizedEmail,
    status: "ACTIVE",
  });

  if (user) {
    // Invalidate any older unused reset tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: "PASSWORD_RESET",
    });

    // Generate secure random token (256 bits of entropy)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    await VerificationToken.create({
      userId: user._id,
      email: normalizedEmail,
      tokenHash,
      type: "PASSWORD_RESET",
      expiresAt,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail({
      recipientEmail: normalizedEmail,
      userName: user.name,
      resetUrl,
    });
  }

  // Generic message returned regardless of whether the email exists
  return {
    success: true,
    message:
      "যদি এই ইমেইলটি আমাদের প্ল্যাটফর্মে নিবন্ধিত থাকে, তবে পাসওয়ার্ড রিসেট করার একটি লিঙ্ক পাঠানো হয়েছে। দয়া করে আপনার ইনবক্স চেক করুন।",
  };
}

/**
 * Server action: complete password reset with token verification.
 * Enforces single-use token consumption, minimum password length, and bcrypt hashing.
 */
export async function resetPasswordAction(
  _prevState: PasswordResetActionResult | null,
  formData: FormData
): Promise<PasswordResetActionResult> {
  const token = (formData.get("token") as string)?.trim();
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) {
    return {
      success: false,
      error: "রিসেট টোকেন অনুপস্থিত বা অবৈধ।",
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      error: "পাসওয়ার্ড অবশ্যই কমপক্ষে ৮ অক্ষরের হতে হবে।",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: "নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড একই হতে হবে।",
    };
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  await dbConnect();

  // Atomically claim the token to prevent concurrent reuse
  const tokenDoc = await VerificationToken.findOneAndUpdate(
    {
      tokenHash,
      type: "PASSWORD_RESET",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } }
  );

  if (!tokenDoc) {
    const existing = await VerificationToken.findOne({
      tokenHash,
      type: "PASSWORD_RESET",
    });

    if (existing?.usedAt) {
      return {
        success: false,
        error:
          "এই পাসওয়ার্ড রিসেট লিঙ্কটি ইতোমধ্যে ব্যবহার করা হয়েছে। অনুগ্রহ করে নতুন লিঙ্কের জন্য আবেদন করুন।",
      };
    }

    if (existing && existing.expiresAt <= new Date()) {
      return {
        success: false,
        error:
          "পাসওয়ার্ড রিসেট লিঙ্কের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে পুনরায় রিসেটের আবেদন করুন।",
      };
    }

    return {
      success: false,
      error: "অবৈধ অথবা অকার্যকর পাসওয়ার্ড রিসেট লিঙ্ক।",
    };
  }

  // Hash new password using project's existing bcryptjs hashing
  const passwordHash = await hashPassword(newPassword);

  // Update password in database without touching user's role or status
  await User.updateOne(
    { _id: tokenDoc.userId },
    { passwordHash }
  );

  // Clean up any other remaining reset tokens for this user
  await VerificationToken.deleteMany({
    userId: tokenDoc.userId,
    type: "PASSWORD_RESET",
  });

  return {
    success: true,
    message: "আপনার পাসওয়ার্ড সফলভাবে রিসেট হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে সাইন ইন করতে পারবেন।",
  };
}
