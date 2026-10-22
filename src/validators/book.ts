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
// Substantive chapter validation helpers
// ---------------------------------------------------------------------------

const TITLE_PLACEHOLDER_PATTERNS = [
  /^coming soon$/i,
  /^placeholder(\s*text)?$/i,
  /^lorem ipsum/i,
  /^tbd$/i,
  /^to be determined$/i,
  /^test$/i,
  /^sample(\s*text)?$/i,
  /^শীঘ্রই আসছে$/i,
  /^খালি$/i,
  /^খসড়া$/i,
  /^অধ্যায়\s*\d*$/i,
  /^chapter\s*\d*$/i,
  /^untitled(\s*chapter)?$/i,
  /^শিরোনামহীন$/i,
];

const CONTENT_PLACEHOLDER_PATTERNS = [
  /coming soon/i,
  /placeholder/i,
  /lorem ipsum/i,
  /\btbd\b/i,
  /শীঘ্রই আসছে/i,
  /খসড়া মাত্র/i,
  /to be determined/i,
  /sample text/i,
];

/**
 * Checks whether a chapter is substantive:
 * 1. Has non-empty title (at least 2 chars).
 * 2. Has substantive body content (at least 50 chars of meaningful text).
 * 3. Does not match placeholder phrases or empty chapter markers.
 * 4. Is not just repeated identical words.
 */
export function isSubstantiveChapter(chapter?: {
  title?: string | null;
  content?: string | null;
} | null): boolean {
  if (!chapter) return false;
  const title = (chapter.title ?? "").trim();
  const content = (chapter.content ?? "").trim();

  if (title.length < 2) return false;
  if (content.length < 50) return false;

  for (const pattern of TITLE_PLACEHOLDER_PATTERNS) {
    if (pattern.test(title)) {
      return false;
    }
  }

  for (const pattern of CONTENT_PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) {
      return false;
    }
  }

  // Check for repeated spam words (e.g. "খসড়া খসড়া..." or "test test test...")
  const words = content.split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    if (uniqueWords.size < 3) {
      return false;
    }
  }

  return true;
}

/**
 * Counts the number of substantive chapters in a chapters array.
 */
export function countSubstantiveChapters(
  chapters?: Array<{ title?: string | null; content?: string | null }> | null
): number {
  if (!chapters || !Array.isArray(chapters)) return 0;
  return chapters.filter(isSubstantiveChapter).length;
}

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
    .max(1000)
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.startsWith("/uploads/") || /^https?:\/\/.+/.test(val);
      },
      { message: "কভার ছবির জন্য বৈধ লিঙ্ক বা আপলোড ফাইল দিন" }
    )
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

export const BookCreateSchema = BasBookSchema.extend({
  price: z
    .number()
    .finite("বৈধ মূল্য দিন")
    .min(100, "বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)")
    .max(300, "বইয়ের মূল্য সর্বোচ্চ ৩০০ টাকা হতে হবে (সর্বোচ্চ ৳৩০০)"),
}).refine(hasValidDiscount, discountValidation);

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
    .finite("বৈধ মূল্য দিন")
    .min(100, "বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)")
    .max(300, "বইয়ের মূল্য সর্বোচ্চ ৩০০ টাকা হতে হবে (সর্বোচ্চ ৳৩০০)"),
})
  .refine(hasValidDiscount, discountValidation)
  .refine((data) => countSubstantiveChapters(data.chapters) >= 5, {
    message: "বই প্রকাশের জন্য কমপক্ষে ৫টি পূর্ণাঙ্গ ও অর্থপূর্ণ অধ্যায় থাকা আবশ্যক (খালি বা প্লেসহোল্ডার অধ্যায় গ্রহণযোগ্য নয়)।",
    path: ["chapters"],
  });
