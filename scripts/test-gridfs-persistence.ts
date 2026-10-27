import assert from "assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { uploadCoverToGridFS, getCoverFromGridFS, COVERS_BUCKET_NAME } from "../src/lib/storage/gridfs";
import { BookCreateSchema, BookUpdateSchema } from "../src/validators/book";

async function run() {
  console.log("=== RUNNING DURABLE COVER STORAGE & PRICING VERIFICATION ===");

  // ───────────────────────────────────────────────────────────────────────────
  // Part 1: GridFS Cover Storage Persistence
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n[Test 1] Testing GridFS upload and retrieval...");
  const dummyBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]); // JPEG magic header
  const dummyFilename = `cover-test-${Date.now()}.jpg`;

  const uploaded = await uploadCoverToGridFS(dummyBuffer, dummyFilename, "image/jpeg", {
    test: true,
  });

  assert.ok(uploaded.id, "GridFS upload must return an id");
  assert.strictEqual(uploaded.filename, dummyFilename, "GridFS upload must preserve filename");
  console.log("✔ Uploaded to GridFS. ID:", uploaded.id);

  // Retrieve by ObjectId
  const fetchedById = await getCoverFromGridFS(uploaded.id);
  assert.ok(fetchedById, "Cover must be retrievable by ObjectId");
  assert.strictEqual(fetchedById.length, dummyBuffer.length, "Retrieved length must match uploaded buffer length");
  assert.strictEqual(fetchedById.contentType, "image/jpeg", "Retrieved contentType must match");
  assert.deepStrictEqual(fetchedById.buffer, dummyBuffer, "Buffer contents must match exactly");
  console.log("✔ Retrieved by ObjectId successfully");

  // Retrieve by filename
  const fetchedByName = await getCoverFromGridFS(dummyFilename);
  assert.ok(fetchedByName, "Cover must be retrievable by filename");
  assert.strictEqual(fetchedByName.length, dummyBuffer.length, "Retrieved length must match uploaded buffer length");
  assert.deepStrictEqual(fetchedByName.buffer, dummyBuffer, "Buffer contents must match exactly");
  console.log("✔ Retrieved by filename successfully");

  // Retrieve existing migrated cover
  const migratedCover = await getCoverFromGridFS("cover-6ad48fddf26132564559aa6f-1793124437171-0adcd245.jpg");
  assert.ok(migratedCover, "Existing cover must be retrieved from GridFS");
  assert.strictEqual(migratedCover.length, 134957, "Migrated cover length must match disk file");
  console.log("✔ Existing migrated cover retrieved successfully:", migratedCover.length, "bytes");

  // Clean up test file from GridFS
  const db = mongoose.connection.db;
  if (db) {
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: COVERS_BUCKET_NAME });
    await bucket.delete(new mongoose.Types.ObjectId(uploaded.id));
    console.log("✔ Cleaned up test GridFS cover");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Part 2: Pricing Validation Matching Admin Dashboard
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n[Test 2] Testing Pricing Validation Rules...");

  const baseBookInput = {
    title: "টেস্ট বইয়ের শিরোনাম",
    slug: "test-pricing-book-" + Date.now(),
    categoryId: "65f1a2b3c4d5e6f7a8b9c0d1",
    language: "বাংলা",
    summary: "সংক্ষিপ্ত সারসংক্ষেপ",
    description: "বিস্তারিত বইয়ের বর্ণনা এখানে থাকবে।",
    learningOutcomes: ["শিক্ষা ১"],
    chapters: [{ order: 1, title: "অধ্যায় ১", content: "অধ্যায় বিষয়বস্তু" }],
  };

  // Original Price Tests: 99, 100, 300, 500
  // 1. 99 is INVALID (< 100)
  const res99 = BookCreateSchema.safeParse({ ...baseBookInput, price: 99 });
  assert.strictEqual(res99.success, false, "Original price 99 must be invalid");
  assert.strictEqual(
    res99.error.flatten().fieldErrors.price?.[0],
    "বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)"
  );
  console.log("✔ Original price ৳99 correctly rejected: 'বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)'");

  // 2. 100 is VALID
  const res100 = BookCreateSchema.safeParse({ ...baseBookInput, price: 100 });
  assert.strictEqual(res100.success, true, "Original price 100 must be valid");
  console.log("✔ Original price ৳100 is valid");

  // 3. 300 is VALID
  const res300 = BookCreateSchema.safeParse({ ...baseBookInput, price: 300 });
  assert.strictEqual(res300.success, true, "Original price 300 must be valid");
  console.log("✔ Original price ৳300 is valid");

  // 4. 500 is VALID
  const res500 = BookCreateSchema.safeParse({ ...baseBookInput, price: 500 });
  assert.strictEqual(res500.success, true, "Original price 500 must be valid");
  console.log("✔ Original price ৳500 is valid");

  // Discounted Price Tests: empty, 99, 100, 250, 300, 301
  // 1. empty/null is VALID
  const resDiscNull = BookCreateSchema.safeParse({ ...baseBookInput, price: 500, discountPrice: null });
  assert.strictEqual(resDiscNull.success, true, "Empty discountPrice must be valid");
  console.log("✔ Empty/null discount price is valid");

  // 2. 99 is INVALID (< 100)
  const resDisc99 = BookCreateSchema.safeParse({ ...baseBookInput, price: 500, discountPrice: 99 });
  assert.strictEqual(resDisc99.success, false, "Discount price 99 must be invalid");
  assert.strictEqual(
    resDisc99.error.flatten().fieldErrors.discountPrice?.[0],
    "ছাড়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)"
  );
  console.log("✔ Discount price ৳99 correctly rejected: 'ছাড়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)'");

  // 3. 100 is VALID (when price >= 100)
  const resDisc100 = BookCreateSchema.safeParse({ ...baseBookInput, price: 500, discountPrice: 100 });
  assert.strictEqual(resDisc100.success, true, "Discount price 100 must be valid");
  console.log("✔ Discount price ৳100 is valid");

  // 4. 250 is VALID
  const resDisc250 = BookCreateSchema.safeParse({ ...baseBookInput, price: 500, discountPrice: 250 });
  assert.strictEqual(resDisc250.success, true, "Discount price 250 must be valid");
  console.log("✔ Discount price ৳250 is valid");

  // 5. 300 is VALID
  const resDisc300 = BookCreateSchema.safeParse({ ...baseBookInput, price: 500, discountPrice: 300 });
  assert.strictEqual(resDisc300.success, true, "Discount price 300 must be valid");
  console.log("✔ Discount price ৳300 is valid");

  // 6. 301 is INVALID (> 300)
  const resDisc301 = BookCreateSchema.safeParse({ ...baseBookInput, price: 500, discountPrice: 301 });
  assert.strictEqual(resDisc301.success, false, "Discount price 301 must be invalid");
  assert.strictEqual(
    resDisc301.error.flatten().fieldErrors.discountPrice?.[0],
    "ছাড়ের মূল্য সর্বোচ্চ ৩০০ টাকা হতে হবে (সর্বোচ্চ ৳৩০০)"
  );
  console.log("✔ Discount price ৳301 correctly rejected: 'ছাড়ের মূল্য সর্বোচ্চ ৩০০ টাকা হতে হবে (সর্বোচ্চ ৳৩০০)'");

  // 7. Discount price > Original price is INVALID
  const resDiscHigher = BookCreateSchema.safeParse({ ...baseBookInput, price: 150, discountPrice: 200 });
  assert.strictEqual(resDiscHigher.success, false, "Discount price > Original price must be invalid");
  assert.strictEqual(
    resDiscHigher.error.flatten().fieldErrors.discountPrice?.[0],
    "ছাড়ের মূল্য মূল বইয়ের মূল্যের চেয়ে বেশি হতে পারবে না"
  );
  console.log("✔ Discount price higher than original price correctly rejected");

  // Verify BookUpdateSchema has same behavior
  const updateRes99 = BookUpdateSchema.safeParse({ ...baseBookInput, price: 99 });
  assert.strictEqual(updateRes99.success, false, "BookUpdateSchema rejects price 99");

  const updateResDisc301 = BookUpdateSchema.safeParse({ ...baseBookInput, price: 500, discountPrice: 301 });
  assert.strictEqual(updateResDisc301.success, false, "BookUpdateSchema rejects discountPrice 301");

  await mongoose.disconnect();
  console.log("\n=======================================================");
  console.log("🎉 ALL GRIDFS PERSISTENCE & PRICING TESTS PASSED!");
  console.log("=======================================================\n");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
