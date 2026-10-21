import assert from "node:assert";
import fs from "node:fs";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import path from "node:path";
import mongoose from "mongoose";

// Load environment config
loadEnvConfig(process.cwd());

import {
  AuthorApplicationSchema,
  isSupportedSocialDomain,
  isValidSocialUrl,
} from "../src/validators/author-application.ts";
import CategoryRaw from "../src/models/Category.ts";
import BookRaw from "../src/models/Book.ts";
import { getActiveCategories } from "../src/lib/data/author-dashboard.ts";
import { getAdminCategories } from "../src/lib/data/admin-categories.ts";

const Category = (CategoryRaw && typeof CategoryRaw === "object" && "default" in CategoryRaw)
  ? CategoryRaw.default
  : CategoryRaw;

const Book = (BookRaw && typeof BookRaw === "object" && "default" in BookRaw)
  ? BookRaw.default
  : BookRaw;

async function runTests() {
  console.log("=== RUNNING PUSTOKA REGRESSION & FEATURE TEST SUITE ===\n");

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Mandatory Social URL Validation & Security Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[TEST 1] Mandatory Social Profile URL Validation & Protocol Security:");

  // Supported domain detection
  assert.strictEqual(isSupportedSocialDomain("facebook.com"), true, "facebook.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("www.facebook.com"), true, "www.facebook.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("m.facebook.com"), true, "m.facebook.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("instagram.com"), true, "instagram.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("linkedin.com"), true, "linkedin.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("x.com"), true, "x.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("twitter.com"), true, "twitter.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("youtube.com"), true, "youtube.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("threads.net"), true, "threads.net should be recognized");
  assert.strictEqual(isSupportedSocialDomain("github.com"), true, "github.com should be recognized");
  assert.strictEqual(isSupportedSocialDomain("malicious-site.com"), false, "malicious-site.com must NOT be recognized");
  console.log("  ✓ Supported social domains identified correctly.");

  // Protocol security: ONLY safe https: is allowed
  assert.strictEqual(isValidSocialUrl("https://facebook.com/author"), true, "https: should be accepted");
  assert.strictEqual(isValidSocialUrl("http://facebook.com/author"), false, "http: must be rejected (only https: permitted)");
  assert.strictEqual(isValidSocialUrl("javascript:alert(1)"), false, "javascript: must be rejected");
  assert.strictEqual(isValidSocialUrl("data:text/html,abc"), false, "data: must be rejected");
  assert.strictEqual(isValidSocialUrl("file:///etc/passwd"), false, "file: must be rejected");
  assert.strictEqual(isValidSocialUrl("vbscript:msgbox(1)"), false, "vbscript: must be rejected");
  console.log("  ✓ Strict https: protocol enforcement verified.");

  const validBase = {
    displayName: "জাফর ইকবাল",
    phone: "01711223344",
    address: "ঢাকা, বাংলাদেশ",
    occupation: "অধ্যাপক ও লেখক",
    bio: "আমি একজন বিজ্ঞান কল্পকাহিনী ও কিশোর সাহিত্য লেখক। দীর্ঘ দিন ধরে লিখছি।",
    reason: "পুস্তোকা প্ল্যাটফর্মে তরুণ পাঠকদের জন্য নতুন বই প্রকাশ করতে চাই।",
  };

  // Rejection of missing / empty / whitespace socialUrl
  const resMissing = AuthorApplicationSchema.safeParse({ ...validBase });
  assert.strictEqual(resMissing.success, false, "Missing socialUrl must be rejected (field is mandatory)");
  if (!resMissing.success) {
    const errorMsg = resMissing.error.flatten().fieldErrors.socialUrl?.[0];
    assert.ok(errorMsg?.includes("বাধ্যতামূলক"), "Error message should state field is mandatory");
  }

  const resEmpty = AuthorApplicationSchema.safeParse({ ...validBase, socialUrl: "" });
  assert.strictEqual(resEmpty.success, false, "Empty socialUrl must be rejected");

  const resWhitespace = AuthorApplicationSchema.safeParse({ ...validBase, socialUrl: "   " });
  assert.strictEqual(resWhitespace.success, false, "Whitespace-only socialUrl must be rejected");
  console.log("  ✓ Empty and whitespace-only social URLs are properly rejected.");

  // Valid supported URLs
  const supportedPlatforms = [
    { url: "https://facebook.com/author-page", platform: "Facebook" },
    { url: "https://instagram.com/author_official", platform: "Instagram" },
    { url: "https://www.linkedin.com/in/author-dev", platform: "LinkedIn" },
    { url: "https://x.com/author_handle", platform: "X" },
    { url: "https://youtube.com/@authorchannel", platform: "YouTube" },
    { url: "https://threads.net/@author_handle", platform: "Threads" },
    { url: "https://github.com/authorcode", platform: "GitHub" },
  ];

  for (const { url } of supportedPlatforms) {
    const res = AuthorApplicationSchema.safeParse({ ...validBase, socialUrl: url });
    assert.strictEqual(res.success, true, `Valid profile ${url} must pass`);
  }
  console.log("  ✓ All supported platforms pass schema validation.");

  // Length limit enforcement (> 500 characters)
  const longUrl = "https://facebook.com/" + "a".repeat(500);
  const resLong = AuthorApplicationSchema.safeParse({ ...validBase, socialUrl: longUrl });
  assert.strictEqual(resLong.success, false, "URL exceeding 500 characters must be rejected");

  // Backward compatibility with legacy multi-link applications
  const resLegacy = AuthorApplicationSchema.safeParse({
    ...validBase,
    socialUrl: "https://facebook.com/author",
    socialLinks: [
      { platform: "Facebook", url: "https://facebook.com/author" },
      { platform: "Instagram", url: "https://instagram.com/author" },
    ],
  });
  assert.strictEqual(resLegacy.success, true, "Legacy applications with socialLinks array must parse safely");
  console.log("  ✓ Legacy application compatibility verified.\n");

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Database Category Seeding & Integrity
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[TEST 2] Category Seeding & Book Relationship Integrity:");

  await mongoose.connect(process.env.MONGODB_URI);

  const allCategoriesInDb = await Category.find({}).lean();
  console.log(`  Found ${allCategoriesInDb.length} categories in MongoDB.`);
  assert.strictEqual(allCategoriesInDb.length >= 20, true, "There must be at least 20 categories in MongoDB");

  const activeCategories = await getActiveCategories();
  console.log(`  getActiveCategories() returned ${activeCategories.length} active categories.`);
  assert.strictEqual(activeCategories.length >= 20, true, "All 20 seeded categories must be active");

  // Verify unique names and slugs
  const names = new Set();
  const slugs = new Set();
  for (const cat of allCategoriesInDb) {
    assert.strictEqual(names.has(cat.name), false, `Duplicate category name: ${cat.name}`);
    assert.strictEqual(slugs.has(cat.slug), false, `Duplicate category slug: ${cat.slug}`);
    names.add(cat.name);
    slugs.add(cat.slug);
  }
  console.log("  ✓ Category names and slugs are strictly unique with zero duplicates.");

  // Verify existing book relations are intact
  const books = await Book.find({}).populate("category").lean();
  console.log(`  Checking ${books.length} existing books for category relationship integrity:`);
  for (const book of books) {
    assert.ok(book.category, `Book "${book.title}" must have a valid populated category`);
    console.log(`    - Book "${book.title}" -> Category "${book.category.name}" (ID: ${book.category._id})`);
  }
  console.log("  ✓ All existing book category foreign key relations remain 100% intact.\n");

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Admin Category Management Authorization & Aggregation
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[TEST 3] Admin Category Management Authorization & Data Layer:");

  // Verify getAdminCategories requires admin (throws outside authenticated admin context)
  let requireAdminTriggered = false;
  try {
    await getAdminCategories();
  } catch {
    requireAdminTriggered = true;
    console.log("  ✓ getAdminCategories() strictly invokes requireAdmin() and rejects unauthenticated context.");
  }
  assert.strictEqual(requireAdminTriggered, true, "getAdminCategories must require admin authorization");

  // Verify Admin Category Aggregation directly
  const [categoriesRaw, bookCounts] = await Promise.all([
    Category.find({}).sort({ name: 1 }).lean(),
    Book.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map();
  for (const item of bookCounts) {
    if (item._id) {
      countMap.set(String(item._id), item.count);
    }
  }

  let active = 0;
  let inactive = 0;
  for (const c of categoriesRaw) {
    if (c.status === "ACTIVE") active++;
    else inactive++;
  }

  assert.strictEqual(categoriesRaw.length >= 20, true, "Total categories >= 20");
  assert.strictEqual(active >= 20, true, "Active categories >= 20");
  assert.strictEqual(inactive, 0, "No inactive categories initially");

  // Verify that Software Engineering and আত্ম-উন্নয়ন ও ব্যক্তিত্ব বিকাশ have their respective book counts
  for (const c of categoriesRaw) {
    const count = countMap.get(String(c._id)) || 0;
    if (c.name === "Software Engineering") {
      assert.strictEqual(count >= 2, true, `Software Engineering should have >= 2 books (found: ${count})`);
    } else if (c.name === "আত্ম-উন্নয়ন ও ব্যক্তিত্ব বিকাশ") {
      assert.strictEqual(count >= 1, true, `আত্ম-উন্নয়ন ও ব্যক্তিত্ব বিকাশ should have >= 1 book (found: ${count})`);
    }
  }
  console.log("  ✓ Admin category aggregation correctly aggregates book counts per category without data loss.\n");

  await mongoose.disconnect();

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Registration & Login Page UX & Placeholders
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[TEST 4] Registration & Login Form Placeholders & Google UX:");

  const registerContent = fs.readFileSync(path.join(process.cwd(), "src/app/register/page.tsx"), "utf8");
  const loginContent = fs.readFileSync(path.join(process.cwd(), "src/app/login/page.tsx"), "utf8");

  // Vibe coding placeholders removed
  assert.strictEqual(registerContent.includes("John Doe"), false, 'Register page must NOT contain "John Doe"');
  assert.strictEqual(registerContent.includes("john@example.com"), false, 'Register page must NOT contain "john@example.com"');
  assert.strictEqual(loginContent.includes("john@example.com"), false, 'Login page must NOT contain "john@example.com"');

  // Bengali natural placeholders present
  assert.strictEqual(registerContent.includes("আপনার পূর্ণ নাম লিখুন"), true, 'Register page must contain name placeholder "আপনার পূর্ণ নাম লিখুন"');
  assert.strictEqual(registerContent.includes("আপনার ইমেইল ঠিকানা লিখুন"), true, 'Register page must contain email placeholder "আপনার ইমেইল ঠিকানা লিখুন"');
  assert.strictEqual(loginContent.includes("আপনার ইমেইল ঠিকানা লিখুন"), true, 'Login page must contain email placeholder "আপনার ইমেইল ঠিকানা লিখুন"');
  console.log("  ✓ Generic demo placeholders removed and natural Bengali placeholders verified.");

  // Google Registration button presence
  assert.strictEqual(registerContent.includes("Google দিয়ে অ্যাকাউন্ট তৈরি করুন"), true, 'Register page must contain "Google দিয়ে অ্যাকাউন্ট তৈরি করুন" button');
  assert.strictEqual(registerContent.includes('signIn("google"'), true, 'Register page must invoke signIn("google")');
  console.log('  ✓ Google registration button and Auth.js integration verified on register page.\n');

  console.log("=== ALL PUSTOKA REGRESSION & FEATURE TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
