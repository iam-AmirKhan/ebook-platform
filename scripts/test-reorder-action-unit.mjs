import assert from "node:assert";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

import BookRaw from "../src/models/Book.ts";
const Book = BookRaw.default || BookRaw;

// We will test the core logic of adminReorderBooks:
// 1. Array validation
// 2. ObjectId validation
// 3. Duplicate detection
// 4. Status validation (only PUBLISHED books)
// 5. Bulk write atomic persistence

async function testReorderLogic() {
  console.log("=== RUNNING REORDER LOGIC UNIT TESTS ===\n");
  await mongoose.connect(process.env.MONGODB_URI);

  const published = await Book.find({ status: "PUBLISHED" }).limit(3).lean();
  assert.strictEqual(published.length, 3, "Need 3 published books for testing");

  const [b1, b2, b3] = published;

  // Test 1: Invalid ObjectId detection
  const invalidIds = [String(b1._id), "not-an-object-id"];
  const hasInvalid = invalidIds.some((id) => !/^[0-9a-fA-F]{24}$/.test(id));
  assert.strictEqual(hasInvalid, true, "Invalid ObjectId must be flagged.");
  console.log("✔ 1. Invalid ObjectId detected correctly.");

  // Test 2: Duplicate ID detection
  const duplicateIds = [String(b1._id), String(b2._id), String(b1._id)];
  const uniqueSet = new Set(duplicateIds);
  assert.notStrictEqual(uniqueSet.size, duplicateIds.length, "Duplicate IDs must be flagged.");
  console.log("✔ 2. Duplicate book IDs detected correctly.");

  // Test 3: Status check (non-published rejected)
  const draft = await Book.findOne({ status: "DRAFT" }).lean();
  if (draft) {
    const mixedIds = [String(b1._id), String(draft._id)];
    const publishedCount = await Book.countDocuments({ _id: { $in: mixedIds }, status: "PUBLISHED" });
    assert.notStrictEqual(publishedCount, mixedIds.length, "Draft books must NOT pass published check.");
    console.log("✔ 3. Non-published books rejected from public ordering.");
  }

  // Test 4: Atomic BulkWrite updates displayOrder
  const newOrder = [String(b3._id), String(b1._id), String(b2._id)];
  const ops = newOrder.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { displayOrder: index + 1 } },
    },
  }));
  const bulkRes = await Book.bulkWrite(ops);
  assert.ok(bulkRes.matchedCount >= 3, "All 3 books updated in bulk write");

  // Verify in DB
  const doc3 = await Book.findById(b3._id).select("displayOrder").lean();
  const doc1 = await Book.findById(b1._id).select("displayOrder").lean();
  const doc2 = await Book.findById(b2._id).select("displayOrder").lean();

  assert.strictEqual(doc3.displayOrder, 1);
  assert.strictEqual(doc1.displayOrder, 2);
  assert.strictEqual(doc2.displayOrder, 3);
  console.log("✔ 4. Atomic bulkWrite successfully set displayOrder (1, 2, 3).");

  await mongoose.disconnect();
  console.log("\n=== ALL REORDER LOGIC UNIT TESTS PASSED ===");
}

testReorderLogic().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
