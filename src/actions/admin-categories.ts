"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth/authorization";
import dbConnect from "@/lib/db/mongoose";
import Category from "@/models/Category";
import { generateSlug } from "@/validators/book";

export interface CategoryActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && OBJECT_ID_REGEX.test(id);
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function normalizeSlug(rawSlug: string): string {
  return rawSlug
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u0980-\u09FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCategoryAction(
  _prevState: CategoryActionResult,
  formData: FormData
): Promise<CategoryActionResult> {
  try {
    await requireAdmin();
    await dbConnect();

    const rawName = String(formData.get("name") || "").trim();
    let rawSlug = String(formData.get("slug") || "").trim();
    const rawDescription = String(formData.get("description") || "").trim();
    const rawStatus = String(formData.get("status") || "ACTIVE").toUpperCase();

    const fieldErrors: Record<string, string[]> = {};

    if (!rawName || rawName.length < 2) {
      fieldErrors.name = ["বিভাগের নাম কমপক্ষে ২ অক্ষরের হতে হবে।"];
    } else if (rawName.length > 100) {
      fieldErrors.name = ["বিভাগের নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারবে।"];
    }

    if (!rawSlug) {
      rawSlug = generateSlug(rawName);
    } else {
      rawSlug = normalizeSlug(rawSlug);
    }

    if (!rawSlug || rawSlug.length < 2) {
      fieldErrors.slug = ["স্লাগ কমপক্ষে ২ অক্ষরের হতে হবে।"];
    } else if (rawSlug.length > 100) {
      fieldErrors.slug = ["স্লাগ সর্বোচ্চ ১০০ অক্ষরের হতে পারবে।"];
    }

    if (rawDescription && rawDescription.length > 500) {
      fieldErrors.description = ["বিবরণ সর্বোচ্চ ৫০০ অক্ষরের হতে পারবে।"];
    }

    const status = rawStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    if (Object.keys(fieldErrors).length > 0) {
      return {
        success: false,
        error: Object.values(fieldErrors)[0][0],
        fieldErrors,
      };
    }

    // Check unique name (case-insensitive)
    const existingName = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(rawName)}$`, "i") },
    });
    if (existingName) {
      return {
        success: false,
        error: `"${rawName}" নামের একটি বিভাগ ইতিমধ্যে বিদ্যমান রয়েছে।`,
        fieldErrors: { name: ["এই নামের বিভাগ ইতিমধ্যে বিদ্যমান।"] },
      };
    }

    // Check unique slug
    const existingSlug = await Category.findOne({ slug: rawSlug });
    if (existingSlug) {
      return {
        success: false,
        error: `"${rawSlug}" স্লাগটি ইতিমধ্যে অন্য বিভাগ দ্বারা ব্যবহৃত।`,
        fieldErrors: { slug: ["এই স্লাগটি ইতিমধ্যে ব্যবহৃত হয়েছে।"] },
      };
    }

    await Category.create({
      name: rawName,
      slug: rawSlug,
      description: rawDescription || null,
      status,
      image: null,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/admin");
    revalidatePath("/books");
    revalidatePath("/");
    revalidatePath("/author/books/new");

    return {
      success: true,
      message: `"${rawName}" বিভাগটি সফলভাবে তৈরি করা হয়েছে।`,
    };
  } catch (err) {
    console.error("createCategoryAction error:", err);
    return {
      success: false,
      error: "বিভাগ তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

export async function updateCategoryAction(
  categoryId: string,
  _prevState: CategoryActionResult,
  formData: FormData
): Promise<CategoryActionResult> {
  try {
    await requireAdmin();

    if (!isValidObjectId(categoryId)) {
      return {
        success: false,
        error: "অবৈধ বিভাগ আইডি।",
      };
    }

    await dbConnect();

    const category = await Category.findById(categoryId);
    if (!category) {
      return {
        success: false,
        error: "বিভাগটি খুঁজে পাওয়া যায়নি।",
      };
    }

    const rawName = String(formData.get("name") || "").trim();
    let rawSlug = String(formData.get("slug") || "").trim();
    const rawDescription = String(formData.get("description") || "").trim();
    const rawStatus = String(formData.get("status") || category.status).toUpperCase();

    const fieldErrors: Record<string, string[]> = {};

    if (!rawName || rawName.length < 2) {
      fieldErrors.name = ["বিভাগের নাম কমপক্ষে ২ অক্ষরের হতে হবে।"];
    } else if (rawName.length > 100) {
      fieldErrors.name = ["বিভাগের নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারবে।"];
    }

    if (!rawSlug) {
      rawSlug = generateSlug(rawName);
    } else {
      rawSlug = normalizeSlug(rawSlug);
    }

    if (!rawSlug || rawSlug.length < 2) {
      fieldErrors.slug = ["স্লাগ কমপক্ষে ২ অক্ষরের হতে হবে।"];
    } else if (rawSlug.length > 100) {
      fieldErrors.slug = ["স্লাগ সর্বোচ্চ ১০০ অক্ষরের হতে পারবে।"];
    }

    if (rawDescription && rawDescription.length > 500) {
      fieldErrors.description = ["বিবরণ সর্বোচ্চ ৫০০ অক্ষরের হতে পারবে।"];
    }

    const status = rawStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    if (Object.keys(fieldErrors).length > 0) {
      return {
        success: false,
        error: Object.values(fieldErrors)[0][0],
        fieldErrors,
      };
    }

    // Name conflict check with other categories
    const existingName = await Category.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(categoryId) },
      name: { $regex: new RegExp(`^${escapeRegex(rawName)}$`, "i") },
    });
    if (existingName) {
      return {
        success: false,
        error: `"${rawName}" নামের একটি বিভাগ ইতিমধ্যে বিদ্যমান রয়েছে।`,
        fieldErrors: { name: ["এই নামের বিভাগ ইতিমধ্যে বিদ্যমান।"] },
      };
    }

    // Slug conflict check with other categories
    const existingSlug = await Category.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(categoryId) },
      slug: rawSlug,
    });
    if (existingSlug) {
      return {
        success: false,
        error: `"${rawSlug}" স্লাগটি ইতিমধ্যে অন্য বিভাগ দ্বারা ব্যবহৃত।`,
        fieldErrors: { slug: ["এই স্লাগটি ইতিমধ্যে ব্যবহৃত হয়েছে।"] },
      };
    }

    category.name = rawName;
    category.slug = rawSlug;
    category.description = rawDescription || null;
    category.status = status;
    await category.save();

    revalidatePath("/admin/categories");
    revalidatePath("/admin");
    revalidatePath("/books");
    revalidatePath("/");
    revalidatePath("/author/books/new");

    return {
      success: true,
      message: `"${rawName}" বিভাগের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।`,
    };
  } catch (err) {
    console.error("updateCategoryAction error:", err);
    return {
      success: false,
      error: "বিভাগ হালনাগাদ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

export async function toggleCategoryStatusAction(
  categoryId: string
): Promise<CategoryActionResult> {
  try {
    await requireAdmin();

    if (!isValidObjectId(categoryId)) {
      return {
        success: false,
        error: "অবৈধ বিভাগ আইডি।",
      };
    }

    await dbConnect();

    const category = await Category.findById(categoryId);
    if (!category) {
      return {
        success: false,
        error: "বিভাগটি খুঁজে পাওয়া যায়নি।",
      };
    }

    const newStatus = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    category.status = newStatus;
    await category.save();

    revalidatePath("/admin/categories");
    revalidatePath("/admin");
    revalidatePath("/books");
    revalidatePath("/");
    revalidatePath("/author/books/new");

    const statusBengali = newStatus === "ACTIVE" ? "সক্রিয়" : "নিষ্ক্রিয়";
    return {
      success: true,
      message: `"${category.name}" বিভাগটি সফলভাবে ${statusBengali} করা হয়েছে।`,
    };
  } catch (err) {
    console.error("toggleCategoryStatusAction error:", err);
    return {
      success: false,
      error: "বিভাগের স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।",
    };
  }
}
