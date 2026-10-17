"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireRole } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import AuthorApplication from "@/models/AuthorApplication";
import Author from "@/models/Author";
import User from "@/models/User";
import { AuthorApplicationSchema } from "@/validators/author-application";
import { generateSlug } from "@/validators/book";

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

export interface AdminReviewActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function approveAuthorApplicationAction(
  applicationId: string
): Promise<AdminReviewActionResult> {
  const admin = await requireAdmin();

  if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
    return {
      success: false,
      error: "অবৈধ আবেদন আইডি।",
    };
  }

  try {
    const mongooseInstance = await dbConnect();

    const application = await AuthorApplication.findById(applicationId);
    if (!application) {
      return {
        success: false,
        error: "আবেদনটি খুঁজে পাওয়া যায়নি।",
      };
    }

    if (application.status !== "PENDING") {
      return {
        success: false,
        error: "শুধুমাত্র পর্যালোচনাধীন আবেদন অনুমোদন করা যাবে।",
      };
    }

    if (application.user.toString() === admin.id) {
      return {
        success: false,
        error: "আপনি নিজের আবেদন নিজে পর্যালোচনা বা অনুমোদন করতে পারবেন না।",
      };
    }

    const applicant = await User.findById(application.user);
    if (!applicant) {
      return {
        success: false,
        error: "আবেদনকারী অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।",
      };
    }

    // Generate unique slug for the author profile
    const rawDisplayName = application.displayName?.trim() || applicant.name || "author";
    let baseSlug = generateSlug(rawDisplayName);
    if (!baseSlug) {
      baseSlug = `author-${applicant._id.toString().slice(-6)}`;
    }
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (
      await Author.exists({
        slug: uniqueSlug,
        user: { $ne: applicant._id },
      })
    ) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    // Try MongoDB transaction if supported by deployment
    let session: mongoose.ClientSession | null = null;
    let isTxSupported = false;

    try {
      session = await mongooseInstance.startSession();
      session.startTransaction();
      isTxSupported = true;
    } catch {
      session = null;
      isTxSupported = false;
    }

    if (isTxSupported && session) {
      try {
        const updatedApp = await AuthorApplication.findOneAndUpdate(
          {
            _id: applicationId,
            status: "PENDING",
          },
          {
            $set: {
              status: "APPROVED",
              reviewedBy: new mongoose.Types.ObjectId(admin.id),
              reviewedAt: new Date(),
              rejectionReason: null,
            },
          },
          { session, new: true }
        );

        if (!updatedApp) {
          await session.abortTransaction();
          return {
            success: false,
            error: "আবেদনটি ইতিমধ্যে অন্য কোনো অ্যাডমিন দ্বারা পর্যালোচনা করা হয়েছে।",
          };
        }

        const author = await Author.findOne({ user: applicant._id }).session(session);
        if (!author) {
          await Author.create(
            [
              {
                user: applicant._id,
                penName: rawDisplayName,
                slug: uniqueSlug,
                bio: application.bio?.trim() || null,
                profileImage: applicant.image || null,
                status: "ACTIVE",
              },
            ],
            { session }
          );
        } else if (author.status !== "ACTIVE") {
          author.status = "ACTIVE";
          await author.save({ session });
        }

        if (applicant.role !== "ADMIN") {
          applicant.role = "AUTHOR";
          await applicant.save({ session });
        }

        await session.commitTransaction();
      } catch (txErr) {
        await session.abortTransaction();
        throw txErr;
      } finally {
        session.endSession();
      }
    } else {
      // Safe sequencing with atomic precondition and compensating rollback
      let createdAuthorId: mongoose.Types.ObjectId | null = null;
      let wasAuthorReactivated = false;
      let existingAuthorId: mongoose.Types.ObjectId | null = null;

      // Step 1: Claim the application status atomically before any secondary writes
      const updatedApp = await AuthorApplication.findOneAndUpdate(
        {
          _id: applicationId,
          status: "PENDING",
        },
        {
          $set: {
            status: "APPROVED",
            reviewedBy: new mongoose.Types.ObjectId(admin.id),
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        },
        { new: true }
      );

      if (!updatedApp) {
        return {
          success: false,
          error: "আবেদনটি ইতিমধ্যে অন্য কোনো অ্যাডমিন দ্বারা পর্যালোচনা করা হয়েছে।",
        };
      }

      // Step 2: Ensure Author profile exists or reactivate
      try {
        const author = await Author.findOne({ user: applicant._id });
        if (!author) {
          const newAuthor = new Author({
            user: applicant._id,
            penName: rawDisplayName,
            slug: uniqueSlug,
            bio: application.bio?.trim() || null,
            profileImage: applicant.image || null,
            status: "ACTIVE",
          });
          await newAuthor.save();
          createdAuthorId = newAuthor._id;
        } else if (author.status !== "ACTIVE") {
          author.status = "ACTIVE";
          await author.save();
          wasAuthorReactivated = true;
          existingAuthorId = author._id;
        }
      } catch (authorErr) {
        // Compensating rollback: revert application back to PENDING
        await AuthorApplication.findByIdAndUpdate(applicationId, {
          $set: {
            status: "PENDING",
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
          },
        });
        throw authorErr;
      }

      // Step 3: Update User role
      try {
        if (applicant.role !== "ADMIN") {
          applicant.role = "AUTHOR";
          await applicant.save();
        }
      } catch (roleErr) {
        // Compensating rollback for Step 2 and Step 1
        if (createdAuthorId) {
          await Author.findByIdAndDelete(createdAuthorId);
        } else if (wasAuthorReactivated && existingAuthorId) {
          await Author.findByIdAndUpdate(existingAuthorId, {
            $set: { status: "INACTIVE" },
          });
        }
        await AuthorApplication.findByIdAndUpdate(applicationId, {
          $set: {
            status: "PENDING",
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
          },
        });
        throw roleErr;
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/author-applications");
    revalidatePath("/become-author");
    revalidatePath("/author");

    return {
      success: true,
      message: `"${rawDisplayName}"-এর আবেদন অনুমোদিত হয়েছে এবং লেখক প্রোফাইল তৈরি হয়েছে।`,
    };
  } catch (error) {
    console.error("approveAuthorApplicationAction error:", error);
    try {
      const checkApp = await AuthorApplication.findById(applicationId).select("status").lean();
      if (checkApp && checkApp.status !== "PENDING") {
        return {
          success: false,
          error: "আবেদনটি ইতিমধ্যে অন্য কোনো অ্যাডমিন দ্বারা পর্যালোচনা করা হয়েছে।",
        };
      }
    } catch {
      // ignore
    }
    return {
      success: false,
      error: "আবেদন অনুমোদন করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

export async function rejectAuthorApplicationAction(
  applicationId: string,
  rejectionReason?: string
): Promise<AdminReviewActionResult> {
  const admin = await requireAdmin();

  if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
    return {
      success: false,
      error: "অবৈধ আবেদন আইডি।",
    };
  }

  const trimmedReason = rejectionReason?.trim();
  if (trimmedReason && trimmedReason.length > 1000) {
    return {
      success: false,
      error: "প্রত্যাখ্যানের কারণ সর্বোচ্চ ১০০০ অক্ষরের মধ্যে হতে হবে।",
    };
  }

  try {
    await dbConnect();

    const application = await AuthorApplication.findById(applicationId);
    if (!application) {
      return {
        success: false,
        error: "আবেদনটি খুঁজে পাওয়া যায়নি।",
      };
    }

    if (application.status !== "PENDING") {
      return {
        success: false,
        error: "শুধুমাত্র পর্যালোচনাধীন আবেদন প্রত্যাখ্যান করা যাবে।",
      };
    }

    if (application.user.toString() === admin.id) {
      return {
        success: false,
        error: "আপনি নিজের আবেদন নিজে পর্যালোচনা বা প্রত্যাখ্যান করতে পারবেন না।",
      };
    }

    // Atomic update with status precondition
    const updatedApplication = await AuthorApplication.findOneAndUpdate(
      {
        _id: applicationId,
        status: "PENDING",
      },
      {
        $set: {
          status: "REJECTED",
          reviewedBy: new mongoose.Types.ObjectId(admin.id),
          reviewedAt: new Date(),
          rejectionReason: trimmedReason || null,
        },
      },
      { new: true }
    );

    if (!updatedApplication) {
      return {
        success: false,
        error: "আবেদনটি ইতিমধ্যে অন্য কোনো অ্যাডমিন দ্বারা পর্যালোচনা করা হয়েছে।",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/author-applications");
    revalidatePath("/become-author");

    return {
      success: true,
      message: "আবেদনটি সফলভাবে প্রত্যাখ্যান করা হয়েছে।",
    };
  } catch (error) {
    console.error("rejectAuthorApplicationAction error:", error);
    try {
      const checkApp = await AuthorApplication.findById(applicationId).select("status").lean();
      if (checkApp && checkApp.status !== "PENDING") {
        return {
          success: false,
          error: "আবেদনটি ইতিমধ্যে অন্য কোনো অ্যাডমিন দ্বারা পর্যালোচনা করা হয়েছে।",
        };
      }
    } catch {
      // ignore
    }
    return {
      success: false,
      error: "আবেদন প্রত্যাখ্যান করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

