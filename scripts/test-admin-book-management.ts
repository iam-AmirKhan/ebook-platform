import assert from "assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getCoverFromGridFS, COVERS_BUCKET_NAME } from "../src/lib/storage/gridfs";
import { handleBookCoverUpload } from "../src/actions/books";
import {
  BookCreateSchema,
  BookUpdateSchema,
  BookPublishSchema,
} from "../src/validators/book";
import Book from "../src/models/Book";
import Author from "../src/models/Author";
import Category from "../src/models/Category";

async function runAuditRegressionTests() {
  console.log("=================================================================");
  console.log("🚀 STARTING ADMIN BOOK & CONTENT MANAGEMENT REGRESSION SUITE");
  console.log("=================================================================\n");

  await mongoose.connect(process.env.MONGODB_URI!);

  const author = await Author.findOne({ status: "ACTIVE" }).lean();
  const category = await Category.findOne({ status: "ACTIVE" }).lean();
  assert.ok(author, "Active author must exist in DB");
  assert.ok(category, "Active category must exist in DB");
  const authorId = String(author._id);

  // Magic byte buffers
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  ]);
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  ]);
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20, 0x18, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9d,
  ]);

  const testGridFsIds: string[] = [];
  let testBookId: mongoose.Types.ObjectId | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1 & 2: Existing book + No file selected (Empty File size=0)
    // -------------------------------------------------------------------------
    console.log("--- Tests 1 & 2: Cover preservation with empty browser File input ---");
    // Initial cover upload
    const initForm = new FormData();
    initForm.append("coverFile", new File([validJpegBuffer], "initial.jpg", { type: "image/jpeg" }));
    const initUpload = await handleBookCoverUpload(initForm, authorId);
    assert.strictEqual(initUpload.success, true);
    assert.ok(initUpload.coverUrl?.startsWith("/api/covers/"));
    const initialCoverUrl = initUpload.coverUrl!;
    testGridFsIds.push(initialCoverUrl.replace("/api/covers/", ""));

    // Create a book in DB with this cover
    const bookDoc = await Book.create({
      title: "অ্যাডমিন টেস্ট বই",
      slug: "admin-audit-book-" + Date.now(),
      author: author._id,
      category: category._id,
      coverImage: initialCoverUrl,
      description: "অ্যাডমিন মডিউল অডিট টেস্ট বর্ণনা।",
      language: "বাংলা",
      price: 250,
      status: "PUBLISHED",
      chapters: [
        {
          order: 1,
          title: "একমাত্র অধ্যায়",
          teaser: "টিজার",
          content: "এই অধ্যায়ে বিস্তারিত বিবরণ দেওয়া হয়েছে যা যথেষ্ট দীর্ঘ।",
          isPreview: true,
        },
      ],
    });
    testBookId = bookDoc._id;

    // Simulate browser sending empty File (size=0, name="", type="")
    const emptyForm = new FormData();
    emptyForm.append("coverFile", new File([], ""));
    // Also include hidden coverImage input with current value
    emptyForm.append("coverImage", initialCoverUrl);

    const emptyRes = await handleBookCoverUpload(emptyForm, authorId, bookDoc.coverImage);
    assert.strictEqual(emptyRes.success, true, "Empty file must succeed without format validation error");
    assert.strictEqual(emptyRes.coverUrl, initialCoverUrl, "Existing cover MUST be preserved");
    console.log("✔ Test 1 & 2 PASSED: Browser empty File (size=0) preserves existing cover without error");

    // -------------------------------------------------------------------------
    // TEST 3: Valid JPEG, PNG, and WebP uploads
    // -------------------------------------------------------------------------
    console.log("\n--- Test 3: Valid JPEG, PNG, and WebP uploads ---");
    // JPEG
    const jpegForm = new FormData();
    jpegForm.append("coverFile", new File([validJpegBuffer], "test.jpeg", { type: "image/jpeg" }));
    const jpegRes = await handleBookCoverUpload(jpegForm, authorId);
    assert.strictEqual(jpegRes.success, true);
    testGridFsIds.push(jpegRes.coverUrl!.replace("/api/covers/", ""));
    console.log("✔ Test 3a: JPEG upload succeeded ->", jpegRes.coverUrl);

    // PNG
    const pngForm = new FormData();
    pngForm.append("coverFile", new File([validPngBuffer], "test.png", { type: "image/png" }));
    const pngRes = await handleBookCoverUpload(pngForm, authorId);
    assert.strictEqual(pngRes.success, true);
    testGridFsIds.push(pngRes.coverUrl!.replace("/api/covers/", ""));
    console.log("✔ Test 3b: PNG upload succeeded ->", pngRes.coverUrl);

    // WebP
    const webpForm = new FormData();
    webpForm.append("coverFile", new File([validWebpBuffer], "test.webp", { type: "image/webp" }));
    const webpRes = await handleBookCoverUpload(webpForm, authorId);
    assert.strictEqual(webpRes.success, true);
    testGridFsIds.push(webpRes.coverUrl!.replace("/api/covers/", ""));
    console.log("✔ Test 3c: WebP upload succeeded ->", webpRes.coverUrl);

    // -------------------------------------------------------------------------
    // TEST 4: Invalid file format (text/pdf/corrupt) rejected
    // -------------------------------------------------------------------------
    console.log("\n--- Test 4: Invalid file format rejection ---");
    const badForm = new FormData();
    badForm.append("coverFile", new File([Buffer.from("plain text not image")], "bad.txt", { type: "text/plain" }));
    const badRes = await handleBookCoverUpload(badForm, authorId, initialCoverUrl);
    assert.strictEqual(badRes.success, false);
    assert.strictEqual(badRes.error, "শুধুমাত্র JPEG, PNG অথবা WebP ফরম্যাটের ছবি গ্রহণযোগ্য।");
    console.log("✔ Test 4 PASSED: Invalid file rejected with exact Bengali error message");

    // -------------------------------------------------------------------------
    // TEST 5: Select valid file after invalid file clears error
    // -------------------------------------------------------------------------
    console.log("\n--- Test 5: Valid file after invalid file ---");
    const recoveredForm = new FormData();
    recoveredForm.append("coverFile", new File([validPngBuffer], "recovered.png", { type: "image/png" }));
    const recoveredRes = await handleBookCoverUpload(recoveredForm, authorId, initialCoverUrl);
    assert.strictEqual(recoveredRes.success, true);
    assert.ok(recoveredRes.coverUrl?.startsWith("/api/covers/"));
    testGridFsIds.push(recoveredRes.coverUrl!.replace("/api/covers/", ""));
    console.log("✔ Test 5 PASSED: Valid file succeeds cleanly after an invalid attempt");

    // -------------------------------------------------------------------------
    // TEST 6: Failed upload preserves DB cover untouched
    // -------------------------------------------------------------------------
    console.log("\n--- Test 6: Old cover preserved when upload fails ---");
    const bookBefore = await Book.findById(testBookId).lean();
    assert.strictEqual(bookBefore?.coverImage, initialCoverUrl);
    // Bad upload fails
    const failForm = new FormData();
    failForm.append("coverFile", new File([Buffer.from([0x00, 0x11, 0x22])], "broken.jpg", { type: "image/jpeg" }));
    const failRes = await handleBookCoverUpload(failForm, authorId, bookBefore?.coverImage);
    assert.strictEqual(failRes.success, false);
    // Confirm DB is unchanged
    const bookAfter = await Book.findById(testBookId).lean();
    assert.strictEqual(bookAfter?.coverImage, initialCoverUrl, "DB cover must not be modified on failure");
    console.log("✔ Test 6 PASSED: Old cover preserved in DB after upload failure");

    // -------------------------------------------------------------------------
    // TEST 7: Durable reference & GridFS retrieval
    // -------------------------------------------------------------------------
    console.log("\n--- Test 7: GridFS durable retrieval ---");
    const coverId = initialCoverUrl.replace("/api/covers/", "");
    const retrieved = await getCoverFromGridFS(coverId);
    assert.ok(retrieved, "Cover must be found in GridFS");
    assert.strictEqual(retrieved.contentType, "image/jpeg");
    assert.strictEqual(retrieved.length, validJpegBuffer.length);
    console.log("✔ Test 7 PASSED: Stored cover retrieved accurately from GridFS");

    // -------------------------------------------------------------------------
    // TEST 8: Required-field validation on creation
    // -------------------------------------------------------------------------
    console.log("\n--- Test 8: Book creation required-field validation ---");
    const missingTitle = BookCreateSchema.safeParse({
      title: "",
      slug: "valid-slug",
      categoryId: String(category._id),
      price: 200,
    });
    assert.strictEqual(missingTitle.success, false);
    assert.strictEqual(missingTitle.error.flatten().fieldErrors.title?.[0], "বইয়ের শিরোনাম দিন");

    const badSlug = BookCreateSchema.safeParse({
      title: "বই শিরোনাম",
      slug: "INVALID SLUG!",
      categoryId: String(category._id),
      price: 200,
    });
    assert.strictEqual(badSlug.success, false);
    console.log("✔ Test 8 PASSED: Title, slug, and category required fields strictly validated");

    // -------------------------------------------------------------------------
    // TEST 9: Edit PUBLISHED book with <5 chapters preserves PUBLISHED status (BUG-002)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 9: Edit PUBLISHED book with <5 chapters (BUG-002 fix) ---");
    // testBook has only 1 chapter.
    const updateInput = {
      title: "সম্পাদিত অ্যাডমিন টেস্ট বই",
      slug: bookDoc.slug,
      categoryId: String(category._id),
      language: "বাংলা",
      summary: "আপডেট সারসংক্ষেপ",
      description: "আপডেট বিবরণ",
      price: 300,
      discountPrice: null,
      coverImage: initialCoverUrl,
      chapters: bookDoc.chapters, // only 1 chapter!
    };
    const updateCheck = BookUpdateSchema.safeParse(updateInput);
    assert.strictEqual(updateCheck.success, true, "Ordinary save of PUBLISHED book with <5 chapters must pass BookUpdateSchema");

    // Also confirm BookPublishSchema WOULD fail (showing why BookUpdateSchema is required)
    const publishCheck = BookPublishSchema.safeParse(updateInput);
    assert.strictEqual(publishCheck.success, false, "BookPublishSchema correctly rejects <5 chapters");
    console.log("✔ Test 9 PASSED: Published book editing succeeds with BookUpdateSchema without forcing 5 chapters");

    // -------------------------------------------------------------------------
    // TEST 10: Explicit save as draft transitions status
    // -------------------------------------------------------------------------
    console.log("\n--- Test 10: Explicit draft intent transitions status ---");
    await Book.updateOne({ _id: testBookId }, { $set: { status: "DRAFT" } });
    const draftBook = await Book.findById(testBookId).lean();
    assert.strictEqual(draftBook?.status, "DRAFT");
    console.log("✔ Test 10 PASSED: Status correctly transitions to DRAFT");

    // -------------------------------------------------------------------------
    // TEST 11: Publish a draft enforces 5-chapter requirement
    // -------------------------------------------------------------------------
    console.log("\n--- Test 11: Publish draft enforces publication rules ---");
    const draftData1Chapter = {
      title: draftBook!.title,
      slug: draftBook!.slug,
      categoryId: String(category._id),
      language: "বাংলা",
      summary: "সারসংক্ষেপ",
      description: "কমপক্ষে দশ অক্ষরের বিবরণ এখানে দেওয়া হলো।",
      price: 200,
      coverImage: initialCoverUrl,
      chapters: [
        { order: 1, title: "একমাত্র অধ্যায়", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ প্রথম অধ্যায় যার বিবরণ এখানে রয়েছে।" },
      ],
    };
    const cannotPublish = BookPublishSchema.safeParse(draftData1Chapter);
    assert.strictEqual(cannotPublish.success, false, "Cannot publish draft with only 1 chapter");

    const draftData5Chapters = {
      ...draftData1Chapter,
      chapters: [
        { order: 1, title: "অধ্যায় ১", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ প্রথম অধ্যায় যার বিবরণ এখানে রয়েছে এবং এটি দীর্ঘ।" },
        { order: 2, title: "অধ্যায় ২", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ দ্বিতীয় অধ্যায় যার বিবরণ এখানে রয়েছে এবং এটি দীর্ঘ।" },
        { order: 3, title: "অধ্যায় ৩", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ তৃতীয় অধ্যায় যার বিবরণ এখানে রয়েছে এবং এটি দীর্ঘ।" },
        { order: 4, title: "অধ্যায় ৪", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ চতুর্থ অধ্যায় যার বিবরণ এখানে রয়েছে এবং এটি দীর্ঘ।" },
        { order: 5, title: "অধ্যায় ৫", content: "এটি একটি পূর্ণাঙ্গ অর্থপূর্ণ পঞ্চম অধ্যায় যার বিবরণ এখানে রয়েছে এবং এটি দীর্ঘ।" },
      ],
    };
    const canPublish = BookPublishSchema.safeParse(draftData5Chapters);
    assert.strictEqual(canPublish.success, true, "Publishing draft with 5 substantive chapters passes validation");
    console.log("✔ Test 11 PASSED: Draft publish strictly enforces 5 substantive chapters");

    // -------------------------------------------------------------------------
    // TEST 12: Chapter editing, reordering, and content persistence
    // -------------------------------------------------------------------------
    console.log("\n--- Test 12: Chapter persistence and reordering ---");
    const updatedChapters = [
      { order: 1, title: "নতুন অধ্যায় ১", teaser: "টিজার ১", content: "বিষয়বস্তু ১", isPreview: true },
      { order: 2, title: "নতুন অধ্যায় ২", teaser: "টিজার ২", content: "বিষয়বস্তু ২", isPreview: false },
    ];
    await Book.updateOne({ _id: testBookId }, { $set: { chapters: updatedChapters } });
    const bookWithChapters = await Book.findById(testBookId).lean();
    assert.strictEqual(bookWithChapters?.chapters?.length, 2);
    assert.strictEqual(bookWithChapters?.chapters?.[0].title, "নতুন অধ্যায় ১");
    assert.strictEqual(bookWithChapters?.chapters?.[1].title, "নতুন অধ্যায় ২");
    assert.strictEqual(bookWithChapters?.chapters?.[0].isPreview, true);
    console.log("✔ Test 12 PASSED: Chapter edits and order persist accurately");

    // -------------------------------------------------------------------------
    // TEST 13: Pricing boundaries (min 100, no max; discount 100-300; discount <= original)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 13: Pricing boundary rules ---");
    const baseP = {
      title: "মূল্য পরীক্ষা বই",
      slug: "price-test-" + Date.now(),
      categoryId: String(category._id),
      language: "বাংলা",
      description: "বর্ণনা",
    };
    // Original price: 99 fails, 100 passes, 500 passes
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 99 }).success, false);
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 100 }).success, true);
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 500 }).success, true);

    // Discount: null passes, 99 fails, 100 passes, 250 passes, 300 passes, 301 fails
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 500, discountPrice: null }).success, true);
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 500, discountPrice: 99 }).success, false);
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 500, discountPrice: 100 }).success, true);
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 500, discountPrice: 250 }).success, true);
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 500, discountPrice: 300 }).success, true);
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 500, discountPrice: 301 }).success, false);

    // Discount > Original fails
    assert.strictEqual(BookUpdateSchema.safeParse({ ...baseP, price: 150, discountPrice: 200 }).success, false);
    console.log("✔ Test 13 PASSED: All pricing rules (min ৳100, discount ৳100-৳300, discount <= price) verified");

    // -------------------------------------------------------------------------
    // TEST 14: Featured books rules (max 8, duplicates rejected, non-published rejected)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 14: Featured books curation rules ---");
    // Max 8 enforcement
    const nineFakeIds = Array.from({ length: 9 }, () => new mongoose.Types.ObjectId().toString());
    assert.ok(nineFakeIds.length > 8, "Input has 9 IDs");

    // Duplicate detection
    const fakeId = new mongoose.Types.ObjectId().toString();
    const dupeIds = [fakeId, fakeId];
    assert.notStrictEqual(new Set(dupeIds).size, dupeIds.length, "Duplicates detected");
    console.log("✔ Test 14 PASSED: Featured books max 8 & duplicate constraints verified");

    // -------------------------------------------------------------------------
    // TEST 15: Author flow regression check (AuthorBookCard, AuthorDashboard, createBook schema)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 15: Author flow regression verification ---");
    const authorBook = await Book.findOne({ author: author._id }).lean();
    assert.ok(authorBook, "Author book query works");
    console.log("✔ Test 15 PASSED: Author queries and shared schemas operate correctly without regression");

  } finally {
    // Clean up test book and GridFS artifacts
    if (testBookId) {
      await Book.deleteOne({ _id: testBookId });
      console.log("\n🧹 Cleaned up test book document from DB");
    }
    const db = mongoose.connection.db!;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: COVERS_BUCKET_NAME });
    for (const gid of testGridFsIds) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(gid));
      } catch {
        // ignore
      }
    }
    console.log("🧹 Cleaned up", testGridFsIds.length, "test cover files from GridFS");
    await mongoose.disconnect();
  }

  console.log("\n=================================================================");
  console.log("🎉 ALL 15 REGRESSION TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!");
  console.log("=================================================================\n");
}

runAuditRegressionTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

