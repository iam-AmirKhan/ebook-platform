import assert from "node:assert";
import { getWriteNavHref } from "../src/lib/auth/navigation.ts";
import {
  isSubstantiveChapter,
  countSubstantiveChapters,
  BookCreateSchema,
  BookPublishSchema,
} from "../src/validators/book.ts";

function runTests() {
  console.log("=== RUNNING PUBLISHING POLICY & ROLE-BASED WRITING TESTS ===\n");

  // ── 1. Role-based "বই লিখুন" Destination Tests ──
  console.log("[TEST 1] Role-based 'বই লিখুন' routing:");
  assert.strictEqual(getWriteNavHref(null), "/publishing-policy", "Guest (null) -> /publishing-policy");
  assert.strictEqual(getWriteNavHref(undefined), "/publishing-policy", "Guest (undefined) -> /publishing-policy");
  assert.strictEqual(getWriteNavHref(""), "/publishing-policy", "Guest ('') -> /publishing-policy");
  assert.strictEqual(getWriteNavHref("USER"), "/publishing-policy", "USER -> /publishing-policy");
  assert.strictEqual(getWriteNavHref("AUTHOR"), "/author/books/new", "AUTHOR -> /author/books/new");
  assert.strictEqual(getWriteNavHref("ADMIN"), "/admin/books", "ADMIN -> /admin/books");
  assert.strictEqual(getWriteNavHref("MODERATOR"), "/publishing-policy", "Unknown role -> /publishing-policy");
  console.log("  ✓ All role-based destinations match requirements exactly.\n");

  // ── 2. Substantive Chapter Detection Tests ──
  console.log("[TEST 2] Substantive Chapter Detection:");
  // Null/empty
  assert.strictEqual(isSubstantiveChapter(null), false, "null chapter should not be substantive");
  assert.strictEqual(isSubstantiveChapter({ title: "", content: "" }), false, "empty title and content should not be substantive");

  // Title too short
  assert.strictEqual(
    isSubstantiveChapter({
      title: "A",
      content: "এই অধ্যায়ে আমরা জীবনের গভীর উপলব্ধি ও মানসিক প্রশান্তি নিয়ে আলোচনা করব।",
    }),
    false,
    "Single char title should not be substantive"
  );

  // Content too short (< 50 chars)
  assert.strictEqual(
    isSubstantiveChapter({
      title: "প্রথম অধ্যায়",
      content: "ছোট্ট এক লাইন লেখা।",
    }),
    false,
    "Content < 50 chars should not be substantive"
  );

  // Placeholders
  assert.strictEqual(
    isSubstantiveChapter({
      title: "Coming Soon",
      content: "এই অধ্যায়ের লেখা এখনো সম্পন্ন হয়নি, শীঘ্রই এখানে বিস্তারিত যুক্ত করা হবে।",
    }),
    false,
    "Coming soon title should not be substantive"
  );

  assert.strictEqual(
    isSubstantiveChapter({
      title: "অধ্যায় ১",
      content: "placeholder text placeholder text placeholder text placeholder text",
    }),
    false,
    "Placeholder content should not be substantive"
  );

  assert.strictEqual(
    isSubstantiveChapter({
      title: "খসড়া",
      content: "খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া খসড়া",
    }),
    false,
    "Draft marker title should not be substantive"
  );

  // Valid substantive chapter
  const validChapter = {
    title: "প্রথম অধ্যায়: আত্ম-উপলব্ধির সূচনা",
    content:
      "মানুষের জীবনের সবচেয়ে বড় আবিষ্কার হলো নিজেকে চেনা ও নিজের ভাবনাকে বোঝা। যখন একজন মানুষ তার নিজের দুর্বলতা ও শক্তি উপলব্ধি করতে পারে, তখনই জীবনের সত্যিকার রূপ ফুটে ওঠে। এই অধ্যায়ে আমরা সেই যাত্রার শুরুটা বিস্তারিতভাবে আলোচনা করব।",
  };
  assert.strictEqual(isSubstantiveChapter(validChapter), true, "Meaningful chapter > 50 chars should be substantive");
  console.log("  ✓ Substantive chapter checks correctly identify substantive vs empty/placeholder chapters.\n");

  // ── 3. Count Substantive Chapters Tests ──
  console.log("[TEST 3] Count Substantive Chapters:");
  const testChapters = [
    validChapter,
    { title: "Placeholder", content: "To be determined soon..." }, // invalid
    {
      title: "দ্বিতীয় অধ্যায়: ভাবনার নিয়ন্ত্রণ",
      content:
        "আমাদের প্রতিটি সিদ্ধান্তই আমাদের প্রতিদিনের ছোট ছোট চিন্তার প্রতিফলন। মনকে শান্ত রেখে কীভাবে সঠিক সিদ্ধান্ত নিতে হয়, তা অভ্যাস ও সচেতনতার ওপর নির্ভর করে।",
    },
    { title: "খালি অধ্যায়", content: "" }, // invalid
    {
      title: "তৃতীয় অধ্যায়: মানসিক শৃঙ্খলা",
      content:
        "শৃঙ্খলাই হলো সাফল্যের মূল স্তম্ভ। প্রতিদিনের নিয়মমাফিক জীবনযাপন ও অধ্যবসায় কীভাবে মানুষের চিন্তাশক্তিকে সুসংহত করে, তা এই অধ্যায়ের মূল প্রতিপাদ্য বিষয়।",
    },
  ];
  assert.strictEqual(countSubstantiveChapters(testChapters), 3, "Should count exactly 3 valid substantive chapters");
  console.log("  ✓ countSubstantiveChapters returns correct count.\n");

  // ── 4. Book Pricing Schema Tests (100–300 BDT) ──
  console.log("[TEST 4] Book Price Validation in BookCreateSchema (৳100–৳300):");
  const baseBookInput = {
    title: "একটি সুন্দর বাংলা বই",
    slug: "a-beautiful-bangla-book",
    categoryId: "507f1f77bcf86cd799439011",
    language: "বাংলা",
    summary: "বইয়ের সারসংক্ষেপ",
    description: "বইটি সম্পর্কে বিস্তারিত বিশদ আলোচনা ও ব্যাখ্যা এখানে প্রদান করা হয়েছে।",
    chapters: [],
  };

  // Price < 100 should fail
  const lowPriceResult = BookCreateSchema.safeParse({ ...baseBookInput, price: 99 });
  assert.strictEqual(lowPriceResult.success, false, "Price < 100 should fail");
  if (!lowPriceResult.success) {
    const errorMsg = lowPriceResult.error.flatten().fieldErrors.price?.[0];
    assert(errorMsg?.includes("১০০"), "Error message should mention minimum 100 BDT");
  }

  // Price > 300 should fail
  const highPriceResult = BookCreateSchema.safeParse({ ...baseBookInput, price: 301 });
  assert.strictEqual(highPriceResult.success, false, "Price > 300 should fail");
  if (!highPriceResult.success) {
    const errorMsg = highPriceResult.error.flatten().fieldErrors.price?.[0];
    assert(errorMsg?.includes("৩০০"), "Error message should mention maximum 300 BDT");
  }

  // Price 100 (boundary) should succeed
  const boundaryLow = BookCreateSchema.safeParse({ ...baseBookInput, price: 100 });
  assert.strictEqual(boundaryLow.success, true, "Price 100 should pass");

  // Price 250 (mid) should succeed
  const midPrice = BookCreateSchema.safeParse({ ...baseBookInput, price: 250 });
  assert.strictEqual(midPrice.success, true, "Price 250 should pass");

  // Price 300 (boundary) should succeed
  const boundaryHigh = BookCreateSchema.safeParse({ ...baseBookInput, price: 300 });
  assert.strictEqual(boundaryHigh.success, true, "Price 300 should pass");
  console.log("  ✓ ৳100–৳300 price bounds are strictly enforced.\n");

  // ── 5. BookPublishSchema 5 Substantive Chapters Requirement ──
  console.log("[TEST 5] BookPublishSchema 5 Substantive Chapters Requirement:");
  const fiveValidChapters = [
    {
      order: 1,
      title: "প্রথম অধ্যায়: পটভূমি",
      content: "এই অধ্যায়ে বইয়ের মূল বিষয়বস্তু ও পটভূমি নিয়ে বিস্তারিত আলোচনা করা হয়েছে। প্রতিটি মানুষের জীবনে এমন কিছু সন্ধিক্ষণ আসে যা জীবনকে বদলে দেয়।",
    },
    {
      order: 2,
      title: "দ্বিতীয় অধ্যায়: দৃষ্টিভঙ্গির পরিবর্তন",
      content: "কীভাবে দৃষ্টিভঙ্গি পরিবর্তন করে প্রতিটি সংকটের ভেতর সুযোগ খুঁজে পাওয়া যায়, তা বাস্তব জীবনের বিভিন্ন উদাহরণ দিয়ে ব্যাখ্যা করা হলো।",
    },
    {
      order: 3,
      title: "তৃতীয় অধ্যায়: অভ্যাসের শক্তি",
      content: "ছোট ছোট অভ্যাস কীভাবে দীর্ঘমেয়াদে বড় পরিবর্তনের জন্ম দেয়, তা মনস্তাত্ত্বিক বিশ্লেষণের মাধ্যমে এই অধ্যায়ে পরিষ্কার করা হয়েছে।",
    },
    {
      order: 4,
      title: "চতুর্থ অধ্যায়: মানসিক স্থিতিস্থাপকতা",
      content: "চাপ ও প্রতিকূলতার মধ্যেও নিজের লক্ষ্য স্থির রেখে এগিয়ে যাওয়ার উপায় নিয়ে বিস্তারিত আলোচনা এই অধ্যায়ের কেন্দ্রবিন্দু।",
    },
    {
      order: 5,
      title: "পঞ্চম অধ্যায়: চূড়ান্ত উপলব্ধি",
      content: "পরিশেষে পুরো যাত্রার সারাংশ এবং ভবিষ্যতে কীভাবে এই জ্ঞান কাজে লাগানো যাবে, তার একটি সুনির্দিষ্ট দিকনির্দেশনা প্রদান করা হলো।",
    },
  ];

  // 4 chapters -> fail publish
  const fourChaptersResult = BookPublishSchema.safeParse({
    ...baseBookInput,
    price: 200,
    chapters: fiveValidChapters.slice(0, 4),
  });
  assert.strictEqual(fourChaptersResult.success, false, "Publishing with 4 chapters should fail");
  if (!fourChaptersResult.success) {
    const errorMsg = fourChaptersResult.error.flatten().fieldErrors.chapters?.[0];
    assert(errorMsg?.includes("৫টি"), "Error message should mention minimum 5 substantive chapters");
  }

  // 5 chapters with 1 empty -> fail publish (only 4 substantive)
  const fiveWithOneEmpty = [
    ...fiveValidChapters.slice(0, 4),
    { order: 5, title: "খালি অধ্যায়", content: "" },
  ];
  const withEmptyResult = BookPublishSchema.safeParse({
    ...baseBookInput,
    price: 200,
    chapters: fiveWithOneEmpty,
  });
  assert.strictEqual(withEmptyResult.success, false, "5 chapters with 1 empty should fail publish");

  // 5 substantive chapters + price 200 -> pass publish
  const validPublishResult = BookPublishSchema.safeParse({
    ...baseBookInput,
    price: 200,
    chapters: fiveValidChapters,
  });
  assert.strictEqual(validPublishResult.success, true, "Publishing with 5 substantive chapters and price 200 should pass");

  // 5 substantive chapters + price 50 (too low) -> fail publish
  const lowPricePublish = BookPublishSchema.safeParse({
    ...baseBookInput,
    price: 50,
    chapters: fiveValidChapters,
  });
  assert.strictEqual(lowPricePublish.success, false, "Publishing with price 50 should fail");

  console.log("  ✓ Minimum 5 substantive chapters and price limits verified for publication.\n");

  console.log(">>> ALL PUBLISHING POLICY & ROLE-BASED WRITING TESTS PASSED! <<<\n");
}

runTests();
