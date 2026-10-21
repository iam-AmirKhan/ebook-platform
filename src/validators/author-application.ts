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

export const SUPPORTED_SOCIAL_DOMAINS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "threads.net",
  "github.com",
  "medium.com",
  "tiktok.com",
  "pinterest.com",
  "reddit.com",
] as const;

export function isSupportedSocialDomain(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return SUPPORTED_SOCIAL_DOMAINS.some(
    (domain) => host === domain || host.endsWith("." + domain)
  );
}

export function detectSocialPlatform(urlStr: string): string {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    if (host.includes("facebook.com") || host.includes("fb.com")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("x.com") || host.includes("twitter.com")) return "X";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("threads.net")) return "Threads";
    if (host.includes("github.com")) return "GitHub";
    if (host.includes("medium.com")) return "Medium";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("pinterest.com")) return "Pinterest";
    if (host.includes("reddit.com")) return "Reddit";
    return "Social Profile";
  } catch {
    return "Social Profile";
  }
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidSocialUrl(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") {
      return false;
    }
    return isSupportedSocialDomain(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeSocialUrl(val: unknown): string {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  if (!trimmed) return "";
  // If user entered e.g. facebook.com/profile without scheme, prepend https://
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export const SocialLinkSchema = z.object({
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
      .refine(isSafeHttpUrl, {
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
  socialUrl: z
    .preprocess(
      normalizeSocialUrl,
      z
        .string()
        .min(1, { message: "সোশ্যাল মিডিয়া প্রোফাইল লিংক দেওয়া বাধ্যতামূলক।" })
        .max(500, {
          message: "সামাজিক মাধ্যমের URL সর্বোচ্চ ৫০০ অক্ষরের হতে পারবে।",
        })
    )
    .refine(
      (val) => isValidSocialUrl(val),
      {
        message:
          "একটি বৈধ পাবলিক সোশ্যাল মিডিয়া প্রোফাইল লিংক দিন (যেমন: Facebook, Instagram, LinkedIn, X, YouTube, Threads, বা GitHub)। লিংকটি অবশ্যই https:// হতে হবে।",
      }
    ),
  socialLinks: z.array(SocialLinkSchema).optional(),
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
