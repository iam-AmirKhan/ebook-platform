"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireRole } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import AuthorApplication, {
  type IAuthorApplicationDocument,
} from "@/models/AuthorApplication";
import Author, { type IAuthorDocument } from "@/models/Author";
import User from "@/models/User";
import {
  AuthorApplicationSchema,
  AdminAuthorUpdateSchema,
  detectSocialPlatform,
} from "@/validators/author-application";
import { generateSlug } from "@/validators/book";

export interface AuthorApplicationActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function safeRevalidatePath(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Safe fallback when invoked outside Next.js request context (e.g. unit/regression tests)
  }
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

  // Support single socialUrl field from the simplified form,
  // and fallback to legacy multi-field if present
  let rawSocialUrl = formValueToString(formData.get("socialUrl")).trim();
  const legacyLinks = getSocialLinksFromFormData(formData);
  if (!rawSocialUrl && legacyLinks.length > 0) {
    rawSocialUrl = legacyLinks[0].url;
  }

  const parsed = AuthorApplicationSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    occupation: formData.get("occupation"),
    socialUrl: rawSocialUrl || undefined,
    socialLinks: legacyLinks.length > 0 ? legacyLinks : undefined,
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

    const existingAuthor = await Author.findOne({ user: user.id });
    if (existingAuthor && existingAuthor.status === "INACTIVE") {
      return {
        success: false,
        error: "আপনার লেখক অ্যাকাউন্টটি স্থগিত করা আছে। পুনরায় সক্রিয় করতে অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।",
      };
    }

    const existingPending = await AuthorApplication.exists({
      user: user.id,
      status: "PENDING",
    });

    if (existingPending) {
      return pendingApplicationResult();
    }

    const finalSocialUrl = parsed.data.socialUrl ? parsed.data.socialUrl.trim() : null;
    const finalLegacyLinks: Array<{ platform: string; url: string }> = finalSocialUrl
      ? [{ platform: detectSocialPlatform(finalSocialUrl), url: finalSocialUrl }]
      : legacyLinks.length > 0
      ? legacyLinks
      : [];

    await AuthorApplication.create({
      user: user.id,
      displayName: parsed.data.displayName,
      email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      occupation: parsed.data.occupation,
      socialUrl: finalSocialUrl,
      socialLinks: finalLegacyLinks,
      bio: parsed.data.bio,
      reason: parsed.data.reason,
      status: "PENDING",
    });

    safeRevalidatePath("/become-author");

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

    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/author-applications");
    safeRevalidatePath("/become-author");
    safeRevalidatePath("/author");

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

export async function adminRejectAuthorAction(
  targetId: string,
  rejectionReason?: string
): Promise<AdminReviewActionResult> {
  const admin = await requireAdmin();

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return {
      success: false,
      error: "অবৈধ আইডি।",
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

    // 1. Resolve Author document cleanly without confusing ID types
    let author: IAuthorDocument | null = await Author.findById(targetId).catch(() => null);
    let app: IAuthorApplicationDocument | null = null;

    if (!author) {
      app = await AuthorApplication.findById(targetId).catch(() => null);
      if (app) {
        if (app.user) {
          author = await Author.findOne({ user: app.user });
        }
        if (!author && app.displayName) {
          author = await Author.findOne({ penName: app.displayName });
        }
      }
    } else {
      if (author.user) {
        app = await AuthorApplication.findOne({ user: author.user }).sort({ createdAt: -1 });
      }
      if (!app && author.penName) {
        app = await AuthorApplication.findOne({ displayName: author.penName }).sort({ createdAt: -1 });
      }
    }

    if (!author) {
      author = await Author.findOne({ user: targetId }).catch(() => null);
      if (author && !app) {
        app = await AuthorApplication.findOne({ user: targetId }).sort({ createdAt: -1 }).catch(() => null);
      }
    }

    if (!author) {
      return {
        success: false,
        error: "লেখক প্রোফাইল খুঁজে পাওয়া যায়নি।",
      };
    }

    if (author.status === "REJECTED") {
      return {
        success: false,
        error: "লেখক ইতিমধ্যে প্রত্যাখ্যাত অবস্থায় আছেন।",
      };
    }

    if (author.user && String(author.user) === admin.id) {
      return {
        success: false,
        error: "আপনি নিজেকে প্রত্যাখ্যান করতে পারবেন না।",
      };
    }

    // Check if the linked user exists
    let user = null;
    if (author.user) {
      try {
        user = await User.findById(author.user);
      } catch (userErr) {
        console.warn("Could not query user during author rejection:", userErr);
      }
    }
    const isOrphaned = !user;

    // Transition Author status to REJECTED and persist rejection audit fields
    author.status = "REJECTED";
    author.rejectedAt = new Date();
    author.rejectedBy = new mongoose.Types.ObjectId(admin.id);
    author.rejectionReason = trimmedReason || null;
    await author.save();

    // For non-orphaned author records, update related AuthorApplication and demote User role
    if (!isOrphaned) {
      if (app) {
        app.status = "REJECTED";
        app.reviewedBy = new mongoose.Types.ObjectId(admin.id);
        app.reviewedAt = new Date();
        app.rejectionReason = trimmedReason || null;
        await app.save();
      }

      if (user && user.role === "AUTHOR") {
        user.role = "USER";
        await user.save();
      }
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/author-applications");
    safeRevalidatePath("/admin/books");
    safeRevalidatePath("/authors");
    safeRevalidatePath("/books");
    safeRevalidatePath("/author");

    const message = user
      ? `"${author.penName}"-কে সফলভাবে লেখক তালিকা থেকে প্রত্যাখ্যান করা হয়েছে এবং রোল USER-এ পরিবর্তন করা হয়েছে।`
      : `"${author.penName}"-কে সফলভাবে লেখক তালিকা থেকে প্রত্যাখ্যান করা হয়েছে।`;

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error("adminRejectAuthorAction error:", error);
    return {
      success: false,
      error: "লেখক প্রত্যাখ্যান করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
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
      const existingAuthor = await Author.findById(applicationId);
      if (existingAuthor) {
        return adminRejectAuthorAction(applicationId, rejectionReason);
      }

      return {
        success: false,
        error: "আবেদন বা লেখক প্রোফাইল খুঁজে পাওয়া যায়নি।",
      };
    }

    if (application.status !== "PENDING") {
      // If already approved author with application, resolve actual author ID and reject author
      let linkedAuthor = null;
      if (application.user) {
        linkedAuthor = await Author.findOne({ user: application.user });
      }
      if (!linkedAuthor && application.displayName) {
        linkedAuthor = await Author.findOne({ penName: application.displayName });
      }

      const targetAuthorId = linkedAuthor ? linkedAuthor._id.toString() : applicationId;
      return adminRejectAuthorAction(targetAuthorId, rejectionReason);
    }

    if (application.user && application.user.toString() === admin.id) {
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

    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/author-applications");
    safeRevalidatePath("/become-author");

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

export interface AdminUpdateAuthorInput {
  targetId: string; // applicationId or authorId
  authorId?: string | null;
  applicationId?: string | null;
  displayName: string;
  phone?: string;
  occupation?: string;
  address?: string;
  socialUrl?: string;
  bio?: string;
}

export async function adminUpdateAuthorDetailsAction(
  input: AdminUpdateAuthorInput
): Promise<AdminReviewActionResult> {
  await requireAdmin();

  if (
    (!input.targetId || typeof input.targetId !== "string" || !input.targetId.trim()) &&
    !input.authorId &&
    !input.applicationId
  ) {
    return {
      success: false,
      error: "অবৈধ আইডি।",
    };
  }

  const parsed = AdminAuthorUpdateSchema.safeParse({
    displayName: input.displayName,
    phone: input.phone,
    occupation: input.occupation,
    address: input.address,
    socialUrl: input.socialUrl,
    bio: input.bio,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<
      string,
      string[]
    >;
    return {
      success: false,
      error: Object.values(fieldErrors)[0]?.[0] ?? "ইনপুট তথ্য সঠিক নয়।",
    };
  }

  try {
    const mongooseInstance = await dbConnect();

    const safeFindAuthor = async (id: string): Promise<IAuthorDocument | null> => {
      try {
        const found = await Author.findById(id);
        if (found) return found;
      } catch {
        // ignore
      }
      try {
        const found = await Author.findOne({ _id: id });
        if (found) return found;
      } catch {
        // ignore
      }
      return null;
    };

    const safeFindApp = async (id: string): Promise<IAuthorApplicationDocument | null> => {
      try {
        const found = await AuthorApplication.findById(id);
        if (found) return found;
      } catch {
        // ignore
      }
      try {
        const found = await AuthorApplication.findOne({ _id: id });
        if (found) return found;
      } catch {
        // ignore
      }
      return null;
    };

    let author: IAuthorDocument | null = null;
    let application: IAuthorApplicationDocument | null = null;

    // 1. Direct explicit resolution if IDs are provided
    if (input.authorId) {
      author = await safeFindAuthor(input.authorId);
    }
    if (input.applicationId) {
      application = await safeFindApp(input.applicationId);
    }

    // 2. TargetId resolution without conflating ID types
    if (input.targetId) {
      // Check if targetId is an Author ID
      if (!author) {
        author = await safeFindAuthor(input.targetId);
      }

      // Check if targetId is an AuthorApplication ID (only if not matched as author)
      if (!application && (!author || String(author._id) !== input.targetId)) {
        application = await safeFindApp(input.targetId);
      }

      // If author was matched, resolve related application via author.user or penName (never treating targetId as user ID)
      if (author && !application) {
        if (author.user) {
          application = await AuthorApplication.findOne({ user: author.user }).sort({
            createdAt: -1,
          });
        }
        if (!application && author.penName) {
          application = await AuthorApplication.findOne({
            displayName: author.penName,
          }).sort({ createdAt: -1 });
        }
      }

      // If application was matched, resolve related author via application.user or displayName (never treating targetId as author ID or user ID)
      if (application && !author) {
        if (application.user) {
          author = await Author.findOne({ user: application.user });
        }
        if (!author && application.displayName) {
          author = await Author.findOne({ penName: application.displayName });
        }
      }

      // 3. Fallback: only if neither was matched by _id, check if targetId is a User ID
      if (!author && !application) {
        try {
          author = await Author.findOne({ user: input.targetId });
        } catch {
          author = null;
        }
        try {
          application = await AuthorApplication.findOne({ user: input.targetId }).sort({
            createdAt: -1,
          });
        } catch {
          application = null;
        }
      }
    }

    if (!application && !author) {
      return {
        success: false,
        error: "লেখক বা আবেদনের রেকর্ড খুঁজে পাওয়া যায়নি।",
      };
    }

    const updatedDisplayName = parsed.data.displayName.trim();
    const updatedBio =
      parsed.data.bio !== undefined ? parsed.data.bio.trim() : undefined;
    const updatedPhone =
      parsed.data.phone !== undefined ? parsed.data.phone.trim() : undefined;
    const updatedOccupation =
      parsed.data.occupation !== undefined
        ? parsed.data.occupation.trim()
        : undefined;
    const updatedAddress =
      parsed.data.address !== undefined ? parsed.data.address.trim() : undefined;
    const updatedSocialUrl =
      parsed.data.socialUrl !== undefined
        ? parsed.data.socialUrl.trim()
        : undefined;

    // Snapshot original fields for compensating rollback
    const originalAuthorState = author
      ? {
          penName: author.penName,
          bio: author.bio,
        }
      : null;

    // Try MongoDB transaction if both records exist and deployment supports replica sets
    let session: mongoose.ClientSession | null = null;
    let isTxSupported = false;

    if (author && application) {
      try {
        session = await mongooseInstance.startSession();
        session.startTransaction();
        isTxSupported = true;
      } catch {
        session = null;
        isTxSupported = false;
      }
    }

    if (isTxSupported && session) {
      try {
        if (author) {
          author.penName = updatedDisplayName;
          if (updatedBio !== undefined) {
            author.bio = updatedBio || null;
          }
          await author.save({ session });
        }

        if (application) {
          application.displayName = updatedDisplayName;
          if (updatedBio !== undefined) {
            application.bio =
              updatedBio || author?.bio || application.bio || "লেখক পরিচিতি";
          }
          if (updatedPhone !== undefined) {
            application.phone = updatedPhone || null;
          }
          if (updatedOccupation !== undefined) {
            application.occupation = updatedOccupation || null;
          }
          if (updatedAddress !== undefined) {
            application.address = updatedAddress || null;
          }
          if (updatedSocialUrl !== undefined) {
            application.socialUrl = updatedSocialUrl || null;
            application.socialLinks = updatedSocialUrl
              ? [
                  {
                    platform: detectSocialPlatform(updatedSocialUrl),
                    url: updatedSocialUrl,
                  },
                ]
              : [];
          }
          await application.save({ session });
        }

        await session.commitTransaction();
      } catch (txErr) {
        await session.abortTransaction();
        throw txErr;
      } finally {
        session.endSession();
      }
    } else {
      // Standalone author or non-replica-set deployment: Safe sequential write with compensating rollback
      let authorSaved = false;

      if (author) {
        author.penName = updatedDisplayName;
        if (updatedBio !== undefined) {
          author.bio = updatedBio || null;
        }
        await author.save();
        authorSaved = true;
      }

      if (application) {
        try {
          application.displayName = updatedDisplayName;
          if (updatedBio !== undefined) {
            application.bio =
              updatedBio || author?.bio || application.bio || "লেখক পরিচিতি";
          }
          if (updatedPhone !== undefined) {
            application.phone = updatedPhone || null;
          }
          if (updatedOccupation !== undefined) {
            application.occupation = updatedOccupation || null;
          }
          if (updatedAddress !== undefined) {
            application.address = updatedAddress || null;
          }
          if (updatedSocialUrl !== undefined) {
            application.socialUrl = updatedSocialUrl || null;
            application.socialLinks = updatedSocialUrl
              ? [
                  {
                    platform: detectSocialPlatform(updatedSocialUrl),
                    url: updatedSocialUrl,
                  },
                ]
              : [];
          }
          await application.save();
        } catch (appErr) {
          // Compensating rollback for Author record if it was already saved
          if (authorSaved && author && originalAuthorState) {
            try {
              author.penName = originalAuthorState.penName;
              author.bio = originalAuthorState.bio;
              await author.save();
            } catch (rollbackErr) {
              console.error(
                "CRITICAL: Failed to rollback Author record after Application save failure:",
                rollbackErr
              );
            }
          }
          throw appErr;
        }
      }
    }

    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/author-applications");
    safeRevalidatePath("/authors");
    safeRevalidatePath("/author");

    return {
      success: true,
      message: `"${updatedDisplayName}"-এর তথ্য সফলভাবে আপডেট করা হয়েছে।`,
    };
  } catch (error) {
    console.error("adminUpdateAuthorDetailsAction error:", error);
    const rawMessage = error instanceof Error ? error.message : "";
    let safeMessage =
      "লেখকের তথ্য আপডেট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
    if (
      rawMessage &&
      !rawMessage.includes("MONGODB_URI") &&
      !rawMessage.includes("mongodb://") &&
      !rawMessage.includes("mongodb+srv://") &&
      !rawMessage.includes("secret") &&
      !rawMessage.includes("password")
    ) {
      if (rawMessage.includes("E11000") || rawMessage.includes("duplicate key")) {
        safeMessage = "এই তথ্য দিয়ে ইতিমধ্যে একজন লেখক নিবন্ধিত আছেন।";
      } else if (
        rawMessage.startsWith("Validation error") ||
        rawMessage.includes("validation failed") ||
        rawMessage.includes("Cast to ObjectId failed")
      ) {
        safeMessage = rawMessage;
      } else {
        safeMessage = `আপডেট ব্যর্থ হয়েছে: ${rawMessage}`;
      }
    }
    return {
      success: false,
      error: safeMessage,
    };
  }
}

export async function adminHideAuthorAction(
  targetId: string
): Promise<AdminReviewActionResult> {
  const admin = await requireAdmin();

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return {
      success: false,
      error: "অবৈধ আইডি।",
    };
  }

  try {
    await dbConnect();

    // Resolve Author document cleanly without confusing ID types
    let author: IAuthorDocument | null = await Author.findById(targetId).catch(() => null);
    if (!author) {
      const app = await AuthorApplication.findById(targetId).catch(() => null);
      if (app) {
        if (app.user) {
          author = await Author.findOne({ user: app.user });
        }
        if (!author && app.displayName) {
          author = await Author.findOne({ penName: app.displayName });
        }
      }
    }
    if (!author) {
      author = await Author.findOne({ user: targetId }).catch(() => null);
    }

    if (!author) {
      return {
        success: false,
        error: "লেখক প্রোফাইল খুঁজে পাওয়া যায়নি।",
      };
    }

    if (author.status === "INACTIVE") {
      return {
        success: false,
        error: "লেখক ইতিমধ্যে লুকানো অবস্থায় আছেন।",
      };
    }

    let user = null;
    if (author.user) {
      try {
        user = await User.findById(author.user);
      } catch (err) {
        console.warn("Could not query user for hiding author:", err);
      }
    }

    if (user && user._id.toString() === admin.id) {
      return {
        success: false,
        error: "আপনি নিজেকে লুকাতে পারবেন না।",
      };
    }

    if (author.user && String(author.user) === admin.id) {
      return {
        success: false,
        error: "আপনি নিজেকে লুকাতে পারবেন না।",
      };
    }

    // Update Author status to INACTIVE and record hide audit metadata
    author.status = "INACTIVE";
    author.hiddenAt = new Date();
    author.hiddenBy = new mongoose.Types.ObjectId(admin.id);
    await author.save();

    // Demote User role from AUTHOR to USER if user exists
    if (user && user.role === "AUTHOR") {
      user.role = "USER";
      await user.save();
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/author-applications");
    safeRevalidatePath("/admin/books");
    safeRevalidatePath("/authors");
    safeRevalidatePath("/books");
    safeRevalidatePath("/author");

    const message = user
      ? `"${author.penName}"-কে সফলভাবে লেখক তালিকা থেকে লুকানো হয়েছে এবং রোল USER-এ পরিবর্তন করা হয়েছে।`
      : `"${author.penName}"-কে সফলভাবে লেখক তালিকা থেকে লুকানো হয়েছে।`;

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error("adminHideAuthorAction error:", error);
    return {
      success: false,
      error: "লেখক লুকাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

export async function adminRestoreAuthorAction(
  targetId: string
): Promise<AdminReviewActionResult> {
  await requireAdmin();

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return {
      success: false,
      error: "অবৈধ আইডি।",
    };
  }

  try {
    await dbConnect();

    // Resolve Author document cleanly without confusing ID types
    let author: IAuthorDocument | null = await Author.findById(targetId).catch(() => null);
    let app: IAuthorApplicationDocument | null = null;
    if (!author) {
      app = await AuthorApplication.findById(targetId).catch(() => null);
      if (app) {
        if (app.user) {
          author = await Author.findOne({ user: app.user });
        }
        if (!author && app.displayName) {
          author = await Author.findOne({ penName: app.displayName });
        }
      }
    } else {
      if (author.user) {
        app = await AuthorApplication.findOne({ user: author.user }).sort({ createdAt: -1 });
      }
      if (!app && author.penName) {
        app = await AuthorApplication.findOne({ displayName: author.penName }).sort({ createdAt: -1 });
      }
    }
    if (!author) {
      author = await Author.findOne({ user: targetId }).catch(() => null);
      if (author && !app) {
        app = await AuthorApplication.findOne({ user: targetId }).sort({ createdAt: -1 }).catch(() => null);
      }
    }

    if (!author) {
      return {
        success: false,
        error: "লেখক প্রোফাইল খুঁজে পাওয়া যায়নি।",
      };
    }

    if (author.status !== "INACTIVE" && author.status !== "REJECTED") {
      return {
        success: false,
        error: "শুধুমাত্র লুকানো বা প্রত্যাখ্যাত লেখককে পুনরুদ্ধার করা সম্ভব।",
      };
    }

    let user = null;
    if (author.user) {
      try {
        user = await User.findById(author.user);
        if (user && user.status === "DELETED") {
          return {
            success: false,
            error: "স্থায়ীভাবে মুছে ফেলা ব্যবহারকারীকে পুনরুদ্ধার করা সম্ভব নয়।",
          };
        }
      } catch (err) {
        console.warn("Could not query user for restoring author:", err);
      }
    }

    // Restore Author status to ACTIVE and clear hidden/rejected audit metadata
    author.status = "ACTIVE";
    author.hiddenAt = null;
    author.hiddenBy = null;
    author.rejectedAt = null;
    author.rejectedBy = null;
    author.rejectionReason = null;
    await author.save();

    // If user exists and related AuthorApplication exists with REJECTED status, restore to APPROVED
    if (user && app && app.status === "REJECTED") {
      app.status = "APPROVED";
      await app.save();
    }

    // Restore User role to AUTHOR
    if (user && user.role !== "ADMIN") {
      user.role = "AUTHOR";
      await user.save();
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/author-applications");
    safeRevalidatePath("/admin/books");
    safeRevalidatePath("/authors");
    safeRevalidatePath("/books");
    safeRevalidatePath("/author");

    const message = user
      ? `"${author.penName}"-এর লেখক স্ট্যাটাস এবং AUTHOR রোল সফলভাবে পুনরুদ্ধার করা হয়েছে।`
      : `"${author.penName}"-এর লেখক স্ট্যাটাস সফলভাবে পুনরুদ্ধার করা হয়েছে।`;

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error("adminRestoreAuthorAction error:", error);
    return {
      success: false,
      error: "লেখক পুনরুদ্ধার করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

