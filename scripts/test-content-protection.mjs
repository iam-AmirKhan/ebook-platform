import assert from "node:assert";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

import UserRaw from "../src/models/User.ts";
import BookRaw from "../src/models/Book.ts";
import PurchaseRaw from "../src/models/Purchase.ts";
import "../src/models/Author.ts";
import "../src/models/Category.ts";
import {
  getBookBySlug,
  getProtectedChapter,
} from "../src/lib/data/book-details.ts";

const User = UserRaw.default || UserRaw;
const Book = BookRaw.default || BookRaw;
const Purchase = PurchaseRaw.default || PurchaseRaw;

async function runContentProtectionTests() {
  console.log("==================================================================");
  console.log("=== RUNNING SUITE: BOOK-READING CONTENT PROTECTION TESTS ===");
  console.log("==================================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Locate a published book with at least one preview chapter and one locked chapter
  const book = await Book.findOne({
    status: "PUBLISHED",
    price: { $gt: 0 },
    "chapters.1": { $exists: true },
  }).lean();

  assert.ok(book, "Published paid book with multiple chapters must exist.");
  console.log(`Using published book: "${book.title}" (slug: ${book.slug})`);

  // Ensure chapter 1 is preview, chapter 2 is locked
  const previewChapter = book.chapters.find((ch) => ch.isPreview) || book.chapters[0];
  const lockedChapter = book.chapters.find((ch) => !ch.isPreview) || book.chapters[1];

  assert.ok(previewChapter, "Must have a preview chapter.");
  assert.ok(lockedChapter, "Must have a locked chapter.");
  console.log(`Preview chapter: #${previewChapter.order} "${previewChapter.title}"`);
  console.log(`Locked chapter: #${lockedChapter.order} "${lockedChapter.title}"`);

  // 2. Setup test users: 1 verified purchaser, 1 unpurchased user
  const purchasedUser = await User.create({
    name: "Authorized Reader",
    email: `auth_reader_${Date.now()}@pustoka.test`,
    passwordHash: "dummyhash",
    role: "USER",
    status: "ACTIVE",
  });

  const unpurchasedUser = await User.create({
    name: "Unauthorized Reader",
    email: `unauth_reader_${Date.now()}@pustoka.test`,
    passwordHash: "dummyhash",
    role: "USER",
    status: "ACTIVE",
  });

  // Create active purchase for purchasedUser
  const dummyOrder = new mongoose.Types.ObjectId();
  await Purchase.create({
    user: purchasedUser._id,
    book: book._id,
    order: dummyOrder,
    price: book.price,
    currency: "BDT",
    status: "ACTIVE",
  });

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: Initial Page Payload Never Leaks Full Book or Locked Chapters
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 1] Initial Page Payload Content Isolation ---");

    // 1a: Unauthenticated visitor
    const visitorDetails = await getBookBySlug(book.slug, null);
    assert.ok(visitorDetails, "Book details must be returned.");
    assert.strictEqual(visitorDetails.isOwned, false, "Visitor must not own book.");
    for (const ch of visitorDetails.chapters) {
      if (ch.isPreview) {
        assert.ok(ch.content !== null, "Preview chapter content may be present.");
      } else {
        assert.strictEqual(
          ch.content,
          null,
          `Locked chapter #${ch.order} MUST be null in initial payload for visitor.`
        );
      }
    }
    console.log("✔ 1.1 Verified: Unauthenticated visitor receives NULL for all locked chapter contents.");

    // 1b: Unpurchased authenticated user
    const unpurchasedDetails = await getBookBySlug(book.slug, String(unpurchasedUser._id));
    assert.strictEqual(unpurchasedDetails.isOwned, false, "Unpurchased reader must not own book.");
    for (const ch of unpurchasedDetails.chapters) {
      if (!ch.isPreview) {
        assert.strictEqual(
          ch.content,
          null,
          `Locked chapter #${ch.order} MUST be null in initial payload for unpurchased reader.`
        );
      }
    }
    console.log("✔ 1.2 Verified: Unpurchased reader receives NULL for all locked chapter contents.");

    // 1c: Authorized purchaser
    // CRITICAL: Even for authorized purchaser, initial page payload does NOT contain
    // the entire book's content, preventing memory/DOM bloat and HTML leakage!
    const purchasedDetails = await getBookBySlug(book.slug, String(purchasedUser._id));
    assert.strictEqual(purchasedDetails.isOwned, true, "Purchased reader must be identified as owner.");
    for (const ch of purchasedDetails.chapters) {
      if (!ch.isPreview) {
        assert.strictEqual(
          ch.content,
          null,
          `Locked chapter #${ch.order} MUST be null on initial render; loaded on-demand only.`
        );
      }
    }
    console.log("✔ 1.3 Verified: Authorized reader initial page payload does NOT embed locked chapters (no complete book in DOM/RSC).");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: On-Demand Chapter Access Control (Server-side Enforcement)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 2] On-Demand Chapter Access Control ---");

    // 2a: Unauthenticated visitor requesting locked chapter
    const unauthLocked = await getProtectedChapter(book.slug, lockedChapter.order, null);
    assert.strictEqual(unauthLocked.allowed, false, "Unauthenticated access to locked chapter must fail.");
    assert.strictEqual(unauthLocked.statusCode, 401, "Must return 401 Unauthorized.");
    assert.strictEqual(unauthLocked.chapter, undefined, "Chapter content must NOT be provided.");
    console.log("✔ 2.1 Verified: Unauthenticated request to locked chapter is rejected (401).");

    // 2b: Unpurchased reader requesting locked chapter
    const unpurchasedLocked = await getProtectedChapter(
      book.slug,
      lockedChapter.order,
      String(unpurchasedUser._id),
      unpurchasedUser.name
    );
    assert.strictEqual(unpurchasedLocked.allowed, false, "Unpurchased user access to locked chapter must fail.");
    assert.strictEqual(unpurchasedLocked.statusCode, 403, "Must return 403 Forbidden.");
    assert.strictEqual(unpurchasedLocked.chapter, undefined, "Chapter content must NOT be provided.");
    console.log("✔ 2.2 Verified: Non-purchaser request to locked chapter is forbidden (403).");

    // 2c: Authorized purchaser requesting locked chapter
    const authorizedLocked = await getProtectedChapter(
      book.slug,
      lockedChapter.order,
      String(purchasedUser._id),
      purchasedUser.name
    );
    assert.strictEqual(authorizedLocked.allowed, true, "Authorized purchaser must be granted access.");
    assert.strictEqual(authorizedLocked.statusCode, 200, "Must return 200 OK.");
    assert.ok(authorizedLocked.chapter?.content, "Chapter content must be delivered to purchaser.");
    assert.strictEqual(authorizedLocked.reader?.identifier, purchasedUser.name);
    console.log("✔ 2.3 Verified: Authorized purchaser receives locked chapter content with reader watermark info.");

    // 2d: Preview chapter access by anyone
    const visitorPreview = await getProtectedChapter(book.slug, previewChapter.order, null);
    assert.strictEqual(visitorPreview.allowed, true, "Preview chapter must be accessible to visitor.");
    assert.strictEqual(visitorPreview.statusCode, 200);
    assert.ok(visitorPreview.chapter?.content, "Preview chapter content must be returned.");
    console.log("✔ 2.4 Verified: Preview chapter is accessible without login or purchase.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: Direct API Route Security & Cache-Control Headers
    // ──────────────────────────────────────────────────────────────────────────
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 3] Direct API Route & Caching Headers Verification ---");

    // 3a: Direct endpoint request without auth over HTTP
    const res1 = await fetch(
      `http://localhost:3000/api/books/${book.slug}/chapters/${lockedChapter.order}`,
      { cache: "no-store" }
    );

    assert.strictEqual(res1.status, 401, "API route must return 401 for unauthenticated locked request.");
    const cacheHeader1 = res1.headers.get("Cache-Control");
    assert.ok(
      cacheHeader1 && cacheHeader1.includes("no-store") && cacheHeader1.includes("private"),
      "Response must have private, no-store Cache-Control header."
    );
    assert.strictEqual(res1.headers.get("Pragma"), "no-cache");
    const json1 = await res1.json();
    assert.strictEqual(json1.content, undefined, "Content must not be in response.");
    console.log("✔ 3.1 Verified: Direct API endpoint returns 401 with strict no-store/private cache headers.");

    // 3b: Direct endpoint request for preview chapter over HTTP
    const res2 = await fetch(
      `http://localhost:3000/api/books/${book.slug}/chapters/${previewChapter.order}`,
      { cache: "no-store" }
    );

    assert.strictEqual(res2.status, 200, "API route must return 200 for preview chapter.");
    const cacheHeader2 = res2.headers.get("Cache-Control");
    assert.ok(
      cacheHeader2 && cacheHeader2.includes("no-store") && cacheHeader2.includes("private"),
      "Preview chapter response must also prevent proxy caching with private, no-store."
    );
    const json2 = await res2.json();
    assert.ok(json2.content, "Preview chapter content is present.");
    console.log("✔ 3.2 Verified: Direct API endpoint returns 200 for preview chapter with safe caching headers.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: Reader Watermark & Security Identifiers
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 4] Reader Watermark & Security Identifiers ---");

    assert.ok(authorizedLocked.reader, "Reader info must be present for authorized reader.");
    assert.strictEqual(authorizedLocked.reader.identifier, "Authorized Reader");
    assert.strictEqual(
      authorizedLocked.reader.pustokaId,
      String(purchasedUser._id).slice(-6).toUpperCase()
    );
    // Unpurchased user ID or order ID must not be leaked
    assert.strictEqual(
      authorizedLocked.reader.identifier.includes(unpurchasedUser.name),
      false
    );
    console.log(`✔ 4.1 Verified: Watermark identifier "${authorizedLocked.reader.identifier}" (#${authorizedLocked.reader.pustokaId}) accurately generated without cross-user leakage.`);

  } finally {
    // Clean up test records
    await Purchase.deleteMany({ user: purchasedUser._id });
    await User.deleteMany({
      email: { $regex: /@pustoka\.test$/ },
    });
    await mongoose.disconnect();
  }

  console.log("\n==================================================================");
  console.log(">>> ALL BOOK-READING CONTENT PROTECTION TESTS PASSED! <<<");
  console.log("==================================================================");
}

runContentProtectionTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
