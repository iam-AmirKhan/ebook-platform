import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Generate a URL-safe slug from a title string.
 * - Lowercase
 * - Spaces and underscores → hyphens
 * - Strip non-alphanumeric except hyphens
 * - Collapse multiple hyphens
 * - Trim leading/trailing hyphens
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u0980-\u09FF-]/g, "") // preserve Bengali Unicode range
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Chapter sub-schema
// ---------------------------------------------------------------------------

export const ChapterSchema = z.object({
  order: z.number().int().min(1, "অধ্যায়ের ক্রম ১ বা তার বেশি হতে হবে"),
  title: z.string().trim().min(1, "অধ্যায়ের শিরোনাম দিন").max(200, "শিরোনাম সর্বোচ্চ ২০০ অক্ষর"),
  teaser: z.string().trim().max(500, "টিজার সর্বোচ্চ ৫০০ অক্ষর").default(""),
  content: z.string().trim().min(1, "অধ্যায়ের বিষয়বস্তু দিন"),
  isPreview: z.boolean().default(false),
});

export type ChapterInput = z.infer<typeof ChapterSchema>;

// ---------------------------------------------------------------------------
// Book create/update schema
// ---------------------------------------------------------------------------

const BasBookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "বইয়ের শিরোনাম দিন")
    .max(300, "শিরোনাম সর্বোচ্চ ৩০০ অক্ষর"),

  slug: z
    .string()
    .trim()
    .min(1, "স্লাগ দিন")
    .max(200, "স্লাগ সর্বোচ্চ ২০০ অক্ষর")
    .regex(
      /^[a-z0-9\u0980-\u09FF][a-z0-9\u0980-\u09FF-]*[a-z0-9\u0980-\u09FF]$|^[a-z0-9\u0980-\u09FF]$/,
      "স্লাগ শুধুমাত্র ছোট হাতের অক্ষর, সংখ্যা এবং হাইফেন দিয়ে তৈরি হতে হবে"
    ),

  coverImage: z
    .string()
    .trim()
    .url("বৈধ URL দিন")
    .startsWith("https://", "URL অবশ্যই https:// দিয়ে শুরু হতে হবে")
    .max(1000)
    .nullable()
    .optional()
    .or(z.literal("")),

  categoryId: z
    .string()
    .trim()
    .regex(OBJECT_ID_REGEX, "বৈধ ক্যাটাগরি নির্বাচন করুন"),

  language: z
    .string()
    .trim()
    .max(50, "ভাষা সর্বোচ্চ ৫০ অক্ষর")
    .default("বাংলা"),

  summary: z
    .string()
    .trim()
    .max(500, "সারসংক্ষেপ সর্বোচ্চ ৫০০ অক্ষর")
    .default(""),

  description: z
    .string()
    .trim()
    .max(5000, "বিবরণ সর্বোচ্চ ৫০০০ অক্ষর")
    .default(""),

  learningOutcomes: z
    .array(z.string().trim().min(1).max(300))
    .max(20, "সর্বোচ্চ ২০টি শিক্ষার ফলাফল")
    .default([]),

  price: z
    .number()
    .finite("Invalid price")
    .min(0, "মূল্য ০ বা তার বেশি হতে হবে")
    .max(100000, "মূল্য ১,০০,০০০ টাকার বেশি হতে পারবে না"),

  discountPrice: z
    .number()
    .finite("Invalid discount price")
    .min(0, "ছাড়ের মূল্য ০ বা তার বেশি হতে হবে")
    .max(100000)
    .nullable()
    .optional(),

  chapters: z
    .array(ChapterSchema)
    .max(100, "সর্বোচ্চ ১০০টি অধ্যায়")
    .default([]),
});

function hasValidDiscount(data: { price: number; discountPrice?: number | null }) {
  return data.discountPrice === null || data.discountPrice === undefined || data.discountPrice <= data.price;
}

const discountValidation = {
  message: "Discount price cannot be greater than the regular price",
  path: ["discountPrice"],
};

export const BookCreateSchema = BasBookSchema.refine(hasValidDiscount, discountValidation);

export const BookUpdateSchema = BasBookSchema.refine(hasValidDiscount, discountValidation);

export type BookCreateInput = z.infer<typeof BookCreateSchema>;
export type BookUpdateInput = z.infer<typeof BookUpdateSchema>;

// ---------------------------------------------------------------------------
// Publish validation — additional constraints required before PUBLISHED
// ---------------------------------------------------------------------------

export const BookPublishSchema = BasBookSchema.extend({
  title: z.string().trim().min(1, "প্রকাশের আগে শিরোনাম দিন").max(300),
  description: z
    .string()
    .trim()
    .min(10, "প্রকাশের আগে কমপক্ষে ১০ অক্ষরের বিবরণ দিন"),
  price: z
    .number()
    .finite("Invalid price")
    .min(0, "মূল্য দিন"),
})
  .refine(hasValidDiscount, discountValidation)
  .refine((data) => data.chapters.length > 0, {
    message: "প্রকাশের আগে কমপক্ষে একটি অধ্যায় যোগ করুন",
    path: ["chapters"],
  });
