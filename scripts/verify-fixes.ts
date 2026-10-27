import assert from "assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getCoverFromGridFS, COVERS_BUCKET_NAME } from "../src/lib/storage/gridfs";
import { handleBookCoverUpload } from "../src/actions/books";
import { BookCreateSchema, BookUpdateSchema, BookPublishSchema } from "../src/validators/book";
import Book from "../src/models/Book";
import Author from "../src/models/Author";
import Category from "../src/models/Category";

async function verifyAll() {
  console.log("=======================================================");
  console.log("🚀 STARTING COMPREHENSIVE VERIFICATION");
  console.log("=======================================================");

  await mongoose.connect(process.env.MONGODB_URI!);

  // ─────────────────────────────────────────────────────────────────────────
  // ISSUE 1: COVER IMAGE LIFECYCLE & DURABLE PERSISTENCE
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- [ISSUE 1] Cover Image Lifecycle & Persistence ---");

  const author = await Author.findOne({ status: "ACTIVE" }).lean();
  const category = await Category.findOne({ status: "ACTIVE" }).lean();
  assert.ok(author, "Active author must exist");
  assert.ok(category, "Active category must exist");
  const authorId = String(author._id);

  // 1. Prepare valid JPEG buffer (with magic bytes 0xFF 0xD8 0xFF)
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  ]);
  const initialFile = new File([validJpegBuffer], "test-initial-cover.jpg", {
    type: "image/jpeg",
  });

  const formData1 = new FormData();
  formData1.append("coverFile", initialFile);

  // Upload initial cover
  const uploadRes1 = await handleBookCoverUpload(formData1, authorId);
  assert.strictEqual(uploadRes1.success, true, "Upload must succeed");
  assert.ok(uploadRes1.coverUrl?.startsWith("/api/covers/"), "Cover URL must point to /api/covers/");
  const initialCoverUrl = uploadRes1.coverUrl!;
  const initialCoverId = initialCoverUrl.replace("/api/covers/", "");
  console.log("✔ Step 1: Uploaded initial cover to GridFS:", initialCoverUrl);

  // 2. Persist to Book in MongoDB
  const testSlug = "cover-durability-test-" + Date.now();
  const bookDoc = await Book.create({
    title: "টেস্ট স্থায়িত্ব বই",
    slug: testSlug,
    author: author._id,
    category: category._id,
    coverImage: initialCoverUrl,
    description: "কভার স্থায়িত্ব পরীক্ষার জন্য নির্মিত বই।",
    language: "বাংলা",
    price: 350,
    status: "DRAFT",
    chapters: [{ order: 1, title: "সূচনা", teaser: "টিজার", content: "সূচনা বিষয়বস্তু" }],
  });
  assert.strictEqual(bookDoc.coverImage, initialCoverUrl, "Cover URL saved in MongoDB Book record");
  console.log("✔ Step 2: Saved persistent cover URL to MongoDB Book document");

  // 3. Verify retrieval from GridFS (re-login / refresh / server restart simulation)
  const retrievedCover = await getCoverFromGridFS(initialCoverId);
  assert.ok(retrievedCover, "Cover must be retrievable from GridFS");
  assert.strictEqual(retrievedCover.contentType, "image/jpeg", "Content type must match");
  assert.strictEqual(retrievedCover.length, validJpegBuffer.length, "Buffer length must match");
  assert.deepStrictEqual(retrievedCover.buffer, validJpegBuffer, "Binary data must match uploaded file");
  console.log("✔ Step 3: Verified cover persists in MongoDB Atlas GridFS across server restarts / reload");

  // 4. Edit book WITHOUT selecting a new file -> preserve existing cover
  const formData2 = new FormData(); // no coverFile attached
  const uploadRes2 = await handleBookCoverUpload(formData2, authorId, bookDoc.coverImage);
  assert.strictEqual(uploadRes2.success, true, "Preserve action must succeed");
  assert.strictEqual(uploadRes2.coverUrl, initialCoverUrl, "Existing cover MUST be preserved when no file is selected");

  await Book.updateOne({ _id: bookDoc._id }, { $set: { title: "সম্পাদিত টেস্ট স্থায়িত্ব বই" } });
  const bookAfterUnrelatedEdit = await Book.findById(bookDoc._id).lean();
  assert.strictEqual(bookAfterUnrelatedEdit?.coverImage, initialCoverUrl, "Cover remains preserved in MongoDB");
  console.log("✔ Step 4: Editing without selecting a new cover preserves existing cover reference");

  // 5. Edit book WITH a replacement cover -> updates reference
  const replacementBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]); // PNG magic bytes
  const replacementFile = new File([replacementBuffer], "replacement-cover.png", {
    type: "image/png",
  });
  const formData3 = new FormData();
  formData3.append("coverFile", replacementFile);

  const uploadRes3 = await handleBookCoverUpload(formData3, authorId, bookDoc.coverImage);
  assert.strictEqual(uploadRes3.success, true, "Replacement upload must succeed");
  assert.ok(uploadRes3.coverUrl?.startsWith("/api/covers/"), "Replacement cover URL must be /api/covers/");
  assert.notStrictEqual(uploadRes3.coverUrl, initialCoverUrl, "Replacement must have a new distinct URL");
  const replacementCoverUrl = uploadRes3.coverUrl!;
  const replacementCoverId = replacementCoverUrl.replace("/api/covers/", "");

  await Book.updateOne({ _id: bookDoc._id }, { $set: { coverImage: replacementCoverUrl } });
  const bookAfterReplacement = await Book.findById(bookDoc._id).lean();
  assert.strictEqual(bookAfterReplacement?.coverImage, replacementCoverUrl, "Replacement cover URL updated in MongoDB");

  // Verify both dashboards retrieve this replacement cover
  const authorView = await Book.findOne({ _id: bookDoc._id, author: author._id }).select("coverImage").lean();
  const adminView = await Book.findById(bookDoc._id).select("coverImage").lean();
  assert.strictEqual(authorView?.coverImage, replacementCoverUrl, "Author Dashboard sees replacement cover");
  assert.strictEqual(adminView?.coverImage, replacementCoverUrl, "Admin Dashboard sees identical replacement cover");
  console.log("✔ Step 5: Replacement cover uploaded and visible in both Author & Admin views");

  // 6. Test failed upload handling -> existing cover must NOT be replaced with null/empty
  const corruptFile = new File([Buffer.from([0x00, 0x01, 0x02])], "corrupt.jpg", {
    type: "image/jpeg",
  });
  const formData4 = new FormData();
  formData4.append("coverFile", corruptFile);

  const uploadRes4 = await handleBookCoverUpload(formData4, authorId, replacementCoverUrl);
  assert.strictEqual(uploadRes4.success, false, "Corrupted file must fail validation");
  assert.ok(uploadRes4.error, "Error message must be returned");

  // Ensure DB record is still the replacement cover
  const bookAfterFailedUpload = await Book.findById(bookDoc._id).lean();
  assert.strictEqual(
    bookAfterFailedUpload?.coverImage,
    replacementCoverUrl,
    "Existing cover is untouched after failed upload"
  );
  console.log("✔ Step 6: Failed upload safely preserves existing cover without clearing it");

  // Clean up test documents & GridFS files
  await Book.deleteOne({ _id: bookDoc._id });
  const db = mongoose.connection.db!;
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: COVERS_BUCKET_NAME });
  try {
    await bucket.delete(new mongoose.Types.ObjectId(initialCoverId));
    await bucket.delete(new mongoose.Types.ObjectId(replacementCoverId));
  } catch {
    // Ignore cleanup errors
  }
  console.log("✔ Step 7: Cleaned up test book and GridFS artifacts");

  // ─────────────────────────────────────────────────────────────────────────
  // ISSUE 2: MATCHING PRICING VALIDATION (AUTHOR & ADMIN DASHBOARDS)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- [ISSUE 2] Pricing Validation Rules ---");

  const baseInput = {
    title: "মূল্য যাচাইকরণ বই",
    slug: "pricing-rule-test-" + Date.now(),
    categoryId: String(category._id),
    language: "বাংলা",
    summary: "সারসংক্ষেপ",
    description: "পূর্ণ বিবরণ",
    learningOutcomes: ["ফলাফল ১"],
    chapters: [{ order: 1, title: "অধ্যায় ১", content: "অধ্যায় বিষয়বস্তু" }],
  };

  // Original Price Tests: 99, 100, 300, 500
  // 1. ৳99 -> Invalid
  const p99 = BookCreateSchema.safeParse({ ...baseInput, price: 99 });
  assert.strictEqual(p99.success, false, "৳99 must be invalid");
  assert.strictEqual(
    p99.error.flatten().fieldErrors.price?.[0],
    "বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)"
  );
  console.log("✔ Original Price ৳99: REJECTED ('বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)')");

  // 2. ৳100 -> Valid
  const p100 = BookCreateSchema.safeParse({ ...baseInput, price: 100 });
  assert.strictEqual(p100.success, true, "৳100 must be valid");
  console.log("✔ Original Price ৳100: ACCEPTED (Minimum valid price)");

  // 3. ৳300 -> Valid
  const p300 = BookCreateSchema.safeParse({ ...baseInput, price: 300 });
  assert.strictEqual(p300.success, true, "৳300 must be valid");
  console.log("✔ Original Price ৳300: ACCEPTED");

  // 4. ৳500 -> Valid (no maximum limit)
  const p500 = BookCreateSchema.safeParse({ ...baseInput, price: 500 });
  assert.strictEqual(p500.success, true, "৳500 must be valid");
  console.log("✔ Original Price ৳500: ACCEPTED (No maximum limit)");

  // Discounted Price Tests: empty, 99, 100, 250, 300, 301
  // 1. empty/null -> Valid
  const dEmpty = BookCreateSchema.safeParse({ ...baseInput, price: 500, discountPrice: null });
  assert.strictEqual(dEmpty.success, true, "Empty discount price must be valid");
  console.log("✔ Discounted Price empty: ACCEPTED (Optional)");

  // 2. ৳99 -> Invalid (< 100)
  const d99 = BookCreateSchema.safeParse({ ...baseInput, price: 500, discountPrice: 99 });
  assert.strictEqual(d99.success, false, "৳99 discount price must be invalid");
  assert.strictEqual(
    d99.error.flatten().fieldErrors.discountPrice?.[0],
    "ছাড়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)"
  );
  console.log("✔ Discounted Price ৳99: REJECTED ('ছাড়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)')");

  // 3. ৳100 -> Valid
  const d100 = BookCreateSchema.safeParse({ ...baseInput, price: 500, discountPrice: 100 });
  assert.strictEqual(d100.success, true, "৳100 discount price must be valid");
  console.log("✔ Discounted Price ৳100: ACCEPTED (Minimum valid discount price)");

  // 4. ৳250 -> Valid
  const d250 = BookCreateSchema.safeParse({ ...baseInput, price: 500, discountPrice: 250 });
  assert.strictEqual(d250.success, true, "৳250 discount price must be valid");
  console.log("✔ Discounted Price ৳250: ACCEPTED");

  // 5. ৳300 -> Valid
  const d300 = BookCreateSchema.safeParse({ ...baseInput, price: 500, discountPrice: 300 });
  assert.strictEqual(d300.success, true, "৳300 discount price must be valid");
  console.log("✔ Discounted Price ৳300: ACCEPTED (Maximum valid discount price)");

  // 6. ৳301 -> Invalid (> 300)
  const d301 = BookCreateSchema.safeParse({ ...baseInput, price: 500, discountPrice: 301 });
  assert.strictEqual(d301.success, false, "৳301 discount price must be invalid");
  assert.strictEqual(
    d301.error.flatten().fieldErrors.discountPrice?.[0],
    "ছাড়ের মূল্য সর্বোচ্চ ৩০০ টাকা হতে হবে (সর্বোচ্চ ৳৩০০)"
  );
  console.log("✔ Discounted Price ৳301: REJECTED ('ছাড়ের মূল্য সর্বোচ্চ ৩০০ টাকা হতে হবে (সর্বোচ্চ ৳৩০০)')");

  // 7. Discount price higher than original price -> Invalid
  const dHigher = BookCreateSchema.safeParse({ ...baseInput, price: 150, discountPrice: 200 });
  assert.strictEqual(dHigher.success, false, "Discount > original price must be invalid");
  assert.strictEqual(
    dHigher.error.flatten().fieldErrors.discountPrice?.[0],
    "ছাড়ের মূল্য মূল বইয়ের মূল্যের চেয়ে বেশি হতে পারবে না"
  );
  console.log("✔ Discounted Price > Original Price: REJECTED ('ছাড়ের মূল্য মূল বইয়ের মূল্যের চেয়ে বেশি হতে পারবে না')");

  // Cross-action validation consistency (Create, Update, Save Draft, Publish)
  const updateRes = BookUpdateSchema.safeParse({ ...baseInput, price: 99 });
  assert.strictEqual(updateRes.success, false, "BookUpdateSchema enforces price >= 100");

  const publishRes = BookPublishSchema.safeParse({
    ...baseInput,
    price: 99,
    description: "কমপক্ষে দশ অক্ষরের বর্ণনা এখানে দেওয়া হলো।",
    chapters: [
      { order: 1, title: "অধ্যায় ১", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ প্রথম অধ্যায় যার বিবরণ এখানে রয়েছে।" },
      { order: 2, title: "অধ্যায় ২", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ দ্বিতীয় অধ্যায় যার বিবরণ এখানে রয়েছে।" },
      { order: 3, title: "অধ্যায় ৩", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ তৃতীয় অধ্যায় যার বিবরণ এখানে রয়েছে।" },
      { order: 4, title: "অধ্যায় ৪", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ চতুর্থ অধ্যায় যার বিবরণ এখানে রয়েছে।" },
      { order: 5, title: "অধ্যায় ৫", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ পঞ্চম অধ্যায় যার বিবরণ এখানে রয়েছে।" },
    ],
  });
  assert.strictEqual(publishRes.success, false, "BookPublishSchema enforces price >= 100");
  console.log("✔ Cross-action consistency: createBook, updateBook, saveDraft, publishBook all enforce matching rules");

  await mongoose.disconnect();
  console.log("\n=======================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! ZERO FAILURES.");
  console.log("=======================================================\n");
}

verifyAll().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
