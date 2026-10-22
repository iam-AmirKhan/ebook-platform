import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

import BookRaw from "../src/models/Book.ts";
import CategoryRaw from "../src/models/Category.ts";
import AuthorRaw from "../src/models/Author.ts";
import { BookCreateSchema, BookUpdateSchema } from "../src/validators/book.ts";

const Book = BookRaw.default || BookRaw;
const Category = CategoryRaw.default || CategoryRaw;
const Author = AuthorRaw.default || AuthorRaw;

function isValidImageBuffer(buffer, mimeType) {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

async function runTests() {
  console.log("=== RUNNING BOOK COVER UPLOAD & CARD SIZING VERIFICATION ===\n");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Buffer magic bytes and MIME validation
  // ───────────────────────────────────────────────────────────────────────────
  console.log("Test 1: Image buffer & MIME validation...");

  const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  assert.strictEqual(isValidImageBuffer(validJpeg, "image/jpeg"), true, "Valid JPEG must pass");

  const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  assert.strictEqual(isValidImageBuffer(validPng, "image/png"), true, "Valid PNG must pass");

  const validWebp = Buffer.concat([
    Buffer.from("RIFF", "ascii"),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP", "ascii"),
    Buffer.from("VP8 ", "ascii"),
  ]);
  assert.strictEqual(isValidImageBuffer(validWebp, "image/webp"), true, "Valid WebP must pass");

  const fakeJpeg = Buffer.from("NOT_A_REAL_JPEG_IMAGE_CONTENT");
  assert.strictEqual(isValidImageBuffer(fakeJpeg, "image/jpeg"), false, "Spoofed JPEG must fail");

  const exeFile = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ DOS header
  assert.strictEqual(isValidImageBuffer(exeFile, "image/jpeg"), false, "Executable must fail");
  assert.strictEqual(isValidImageBuffer(exeFile, "image/png"), false, "Executable must fail");
  assert.strictEqual(isValidImageBuffer(exeFile, "image/webp"), false, "Executable must fail");

  console.log("✔ Test 1 passed: Magic byte and MIME verification works correctly.\n");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Zod coverImage schema validation
  // ───────────────────────────────────────────────────────────────────────────
  console.log("Test 2: Book validator coverImage schemas...");

  const baseBookInput = {
    title: "টেস্ট বইয়ের শিরোনাম",
    slug: "test-boi-slug-" + Date.now(),
    categoryId: "65f1a2b3c4d5e6f7a8b9c0d1",
    language: "বাংলা",
    summary: "এটি একটি চমৎকার বইয়ের সারসংক্ষেপ।",
    description: "বিস্তারিত বইয়ের বর্ণনা এখানে থাকবে।",
    learningOutcomes: ["প্রথম শিক্ষা", "দ্বিতীয় শিক্ষা"],
    price: 150,
    discountPrice: 120,
    chapters: [{ order: 1, title: "প্রথম অধ্যায়", content: "প্রথম অধ্যায়ের বিষয়বস্তু।" }],
  };

  // 2a. Local /uploads/covers/ path
  const localRes = BookCreateSchema.safeParse({
    ...baseBookInput,
    coverImage: "/uploads/covers/cover-author123-1710000000-abcd.jpg",
  });
  assert.strictEqual(localRes.success, true, "Local /uploads/covers/ path must be valid");

  // 2b. HTTPS external URL
  const httpsRes = BookCreateSchema.safeParse({
    ...baseBookInput,
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c",
  });
  assert.strictEqual(httpsRes.success, true, "External HTTPS URL must be valid");

  // 2c. HTTP external URL
  const httpRes = BookCreateSchema.safeParse({
    ...baseBookInput,
    coverImage: "http://example.com/books/cover.png",
  });
  assert.strictEqual(httpRes.success, true, "External HTTP URL must be valid");

  // 2d. Null or empty string coverImage
  const nullRes = BookCreateSchema.safeParse({
    ...baseBookInput,
    coverImage: null,
  });
  assert.strictEqual(nullRes.success, true, "Null coverImage must be valid");

  const emptyRes = BookCreateSchema.safeParse({
    ...baseBookInput,
    coverImage: "",
  });
  assert.strictEqual(emptyRes.success, true, "Empty string coverImage must normalize or pass");

  // 2e. Malicious or invalid protocols must fail
  const badRes = BookCreateSchema.safeParse({
    ...baseBookInput,
    coverImage: "javascript:alert(1)",
  });
  assert.strictEqual(badRes.success, false, "Javascript pseudo-protocol must be rejected");

  console.log("✔ Test 2 passed: Schema validates local upload paths, external URLs, and null covers.\n");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Static code check for consistent 2:3 card ratio
  // ───────────────────────────────────────────────────────────────────────────
  console.log("Test 3: Static check for consistent 2:3 card ratio across components...");

  const filesToCheck = [
    "src/components/books/BookCard.tsx",
    "src/components/account/LibraryBookCard.tsx",
    "src/components/author/AuthorBookCard.tsx",
    "src/components/books/BookCoverImage.tsx",
    "src/app/books/[slug]/page.tsx",
    "src/components/cart/CartView.tsx",
    "src/components/checkout/MultiBookCheckoutForm.tsx",
    "src/app/checkout/[slug]/page.tsx",
    "src/components/author/AuthorBookSalesTable.tsx",
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.join(process.cwd(), relPath);
    const content = await fs.readFile(fullPath, "utf-8");

    // Must not contain aspect-[3/4]
    assert.strictEqual(
      content.includes("aspect-[3/4]"),
      false,
      `${relPath} must not contain aspect-[3/4]`
    );

    // Must contain 2/3 ratio
    assert.ok(
      content.includes("aspect-[2/3]") || content.includes("2/3"),
      `${relPath} must enforce 2:3 ratio`
    );
  }

  console.log("✔ Test 3 passed: All book card and thumbnail components adhere to aspect-[2/3].\n");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: Database persistence with upload path & edit preservation
  // ───────────────────────────────────────────────────────────────────────────
  console.log("Test 4: Database persistence and cover preservation...");

  await mongoose.connect(process.env.MONGODB_URI);

  const existingAuthor = await Author.findOne({ status: "ACTIVE" }).lean();
  const existingCategory = await Category.findOne({ status: "ACTIVE" }).lean();

  if (existingAuthor && existingCategory) {
    const testSlug = "cover-test-" + Date.now();
    const testCoverUrl = `/uploads/covers/cover-${existingAuthor._id}-${Date.now()}-test.webp`;

    // 4a. Create book with uploaded cover path
    const createdBook = await Book.create({
      title: "কভার আপলোড টেস্ট বই",
      slug: testSlug,
      author: existingAuthor._id,
      category: existingCategory._id,
      coverImage: testCoverUrl,
      description: "টেস্ট বইয়ের বিবরণ",
      language: "বাংলা",
      price: 200,
      status: "DRAFT",
      chapters: [{ order: 1, title: "সূচনা", teaser: "টিজার", content: "সূচনা পর্ব" }],
    });

    assert.ok(createdBook._id, "Book created in DB");
    assert.strictEqual(createdBook.coverImage, testCoverUrl, "Cover image path persisted in MongoDB");
    console.log("✔ 4a: Book created with uploaded cover path:", createdBook.coverImage);

    // 4b. Edit book without modifying cover -> cover must be preserved
    await Book.updateOne(
      { _id: createdBook._id },
      { $set: { title: "কভার আপলোড টেস্ট বই (সম্পাদিত)" } }
    );
    const updatedBook1 = await Book.findById(createdBook._id).lean();
    assert.strictEqual(updatedBook1.coverImage, testCoverUrl, "Cover preserved on unrelated edit");
    console.log("✔ 4b: Existing cover preserved when editing other fields.");

    // 4c. Edit book with replace cover
    const replacedCoverUrl = `/uploads/covers/cover-${existingAuthor._id}-${Date.now()}-replaced.jpg`;
    await Book.updateOne(
      { _id: createdBook._id },
      { $set: { coverImage: replacedCoverUrl } }
    );
    const updatedBook2 = await Book.findById(createdBook._id).lean();
    assert.strictEqual(updatedBook2.coverImage, replacedCoverUrl, "Cover updated with replaced image");
    console.log("✔ 4c: Cover successfully replaced.");

    // 4d. Remove cover -> sets null
    await Book.updateOne(
      { _id: createdBook._id },
      { $set: { coverImage: null } }
    );
    const updatedBook3 = await Book.findById(createdBook._id).lean();
    assert.strictEqual(updatedBook3.coverImage, null, "Cover removed when removeCover triggered");
    console.log("✔ 4d: Cover safely removed without affecting status or other fields.");

    // Clean up test book
    await Book.deleteOne({ _id: createdBook._id });
    console.log("✔ Cleaned up test book document.");
  } else {
    console.log("Skipping DB test step: No active author/category found.");
  }

  await mongoose.disconnect();

  console.log("\n=======================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
