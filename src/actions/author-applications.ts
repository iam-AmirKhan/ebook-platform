"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import AuthorApplication from "@/models/AuthorApplication";
import { AuthorApplicationSchema } from "@/validators/author-application";

export interface AuthorApplicationActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function isDuplicatePendingApplicationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  );
}

function pendingApplicationResult(): AuthorApplicationActionResult {
  return {
    success: false,
    error: "আপনার একটি আবেদন ইতিমধ্যে পর্যালোচনাধীন আছে।",
  };
}

function formValueToString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function getSocialLinksFromFormData(formData: FormData) {
  const platforms = formData.getAll("socialPlatform");
  const urls = formData.getAll("socialUrl");
  const linkCount = Math.max(platforms.length, urls.length);
  const socialLinks: Array<{ platform: string; url: string }> = [];

  for (let index = 0; index < linkCount; index += 1) {
    const platform = formValueToString(platforms[index] ?? null).trim();
    const url = formValueToString(urls[index] ?? null).trim();

    if (platform || url) {
      socialLinks.push({ platform, url });
    }
  }

  return socialLinks;
}

export async function submitAuthorApplication(
  _prevState: AuthorApplicationActionResult,
  formData: FormData
): Promise<AuthorApplicationActionResult> {
  const user = await requireRole("USER");
  const email = user.email?.toLowerCase().trim();

  if (!email) {
    return {
      success: false,
      error: "আপনার অ্যাকাউন্টে ইমেইল পাওয়া যায়নি।",
    };
  }

  const parsed = AuthorApplicationSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    occupation: formData.get("occupation"),
    socialLinks: getSocialLinksFromFormData(formData),
    bio: formData.get("bio"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<
      string,
      string[]
    >;
    return {
      success: false,
      error: Object.values(fieldErrors)[0]?.[0] ?? "ইনপুট ত্রুটি।",
      fieldErrors,
    };
  }

  try {
    await dbConnect();

    const existingPending = await AuthorApplication.exists({
      user: user.id,
      status: "PENDING",
    });

    if (existingPending) {
      return pendingApplicationResult();
    }

    await AuthorApplication.create({
      user: user.id,
      displayName: parsed.data.displayName,
      email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      occupation: parsed.data.occupation,
      socialLinks: parsed.data.socialLinks,
      bio: parsed.data.bio,
      reason: parsed.data.reason,
      status: "PENDING",
    });

    revalidatePath("/become-author");

    return {
      success: true,
      message: "আপনার লেখক আবেদন জমা হয়েছে।",
    };
  } catch (error) {
    console.error("submitAuthorApplication error:", error);

    if (isDuplicatePendingApplicationError(error)) {
      return pendingApplicationResult();
    }

    return {
      success: false,
      error: "আবেদন জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    };
  }
}
