import { z } from "zod";

function requiredTrimmedString(
  minLength: number,
  minMessage: string,
  maxLength: number,
  maxMessage: string
) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(minLength, { message: minMessage }).max(maxLength, {
      message: maxMessage,
    })
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const SocialLinkSchema = z.object({
  platform: requiredTrimmedString(
    1,
    "সামাজিক মাধ্যমের নাম লিখুন।",
    80,
    "সামাজিক মাধ্যমের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারবে।"
  ),
  url: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .string()
      .min(1, { message: "সামাজিক মাধ্যমের লিংক দিন।" })
      .url({ message: "বৈধ সামাজিক মাধ্যমের URL দিন।" })
      .max(500, {
        message: "সামাজিক মাধ্যমের URL সর্বোচ্চ ৫০০ অক্ষরের হতে পারবে।",
      })
      .refine(isHttpUrl, {
        message: "সামাজিক মাধ্যমের URL http বা https হতে হবে।",
      })
  ),
});

export const AuthorApplicationSchema = z.object({
  displayName: requiredTrimmedString(
    2,
    "লেখক হিসেবে নাম কমপক্ষে ২ অক্ষরের হতে হবে।",
    100,
    "লেখক হিসেবে নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারবে।"
  ),
  phone: requiredTrimmedString(
    6,
    "ফোন নম্বর দিন।",
    50,
    "ফোন নম্বর সর্বোচ্চ ৫০ অক্ষরের হতে পারবে।"
  ),
  address: requiredTrimmedString(
    10,
    "ঠিকানা অন্তত ১০ অক্ষরের হতে হবে।",
    500,
    "ঠিকানা সর্বোচ্চ ৫০০ অক্ষরের হতে পারবে।"
  ),
  occupation: requiredTrimmedString(
    2,
    "পেশা লিখুন।",
    120,
    "পেশা সর্বোচ্চ ১২০ অক্ষরের হতে পারবে।"
  ),
  socialLinks: z
    .array(SocialLinkSchema)
    .min(1, { message: "কমপক্ষে একটি সামাজিক মাধ্যমের লিংক দিন।" })
    .max(5, { message: "সর্বোচ্চ ৫টি সামাজিক মাধ্যমের লিংক দিতে পারবেন।" }),
  bio: requiredTrimmedString(
    20,
    "নিজের সম্পর্কে অন্তত ২০ অক্ষরের পরিচিতি লিখুন।",
    1000,
    "পরিচিতি সর্বোচ্চ ১০০০ অক্ষরের হতে পারবে।"
  ),
  reason: requiredTrimmedString(
    20,
    "কেন লিখতে চান তা অন্তত ২০ অক্ষরে লিখুন।",
    1000,
    "কারণ সর্বোচ্চ ১০০০ অক্ষরের হতে পারবে।"
  ),
});

export type AuthorApplicationInput = z.infer<typeof AuthorApplicationSchema>;
