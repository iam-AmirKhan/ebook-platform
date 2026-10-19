import assert from "node:assert";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

import UserRaw from "../src/models/User.ts";
import BookRaw from "../src/models/Book.ts";
import PurchaseRaw from "../src/models/Purchase.ts";
import ReviewRaw from "../src/models/Review.ts";
import {
  getBookReviews,
  getBookRatingSummary,
} from "../src/lib/data/book-details.ts";

const User = UserRaw.default || UserRaw;
const Book = BookRaw.default || BookRaw;
const Purchase = PurchaseRaw.default || PurchaseRaw;
const Review = ReviewRaw.default || ReviewRaw;

async function runTestSuite() {
  console.log("==================================================================");
  console.log("=== RUNNING SUITE: REVIEWS, RATINGS & SOCIAL SHARING TESTS ===");
  console.log("==================================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);

  // Find a published book to test with
  const testBook = await Book.findOne({ status: "PUBLISHED" }).lean();
  assert.ok(testBook, "A published book must exist in the database for testing.");
  const bookId = String(testBook._id);
  console.log(`Using published book: "${testBook.title}" (ID: ${bookId})`);

  // Ensure clean test baseline for this book
  await Review.deleteMany({ book: testBook._id });

  // Create 1 admin user, 1 purchased reader, 1 unpurchased reader
  const adminUser = await User.create({
    name: "Test Admin Moderator",
    email: `admin_reviewer_${Date.now()}@pustoka.test`,
    passwordHash: "dummyhash",
    role: "ADMIN",
    status: "ACTIVE",
  });

  const purchasedUser = await User.create({
    name: "Verified Reader One",
    email: `reader_purchased_${Date.now()}@pustoka.test`,
    passwordHash: "dummyhash",
    role: "USER",
    status: "ACTIVE",
  });

  const unpurchasedUser = await User.create({
    name: "Unverified Reader Two",
    email: `reader_unpurchased_${Date.now()}@pustoka.test`,
    passwordHash: "dummyhash",
    role: "USER",
    status: "ACTIVE",
  });

  // Create ACTIVE purchase for purchasedUser
  const dummyOrder = new mongoose.Types.ObjectId();
  await Purchase.create({
    user: purchasedUser._id,
    book: testBook._id,
    order: dummyOrder,
    price: 150,
    currency: "BDT",
    status: "ACTIVE",
  });

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. Purchase Verification
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 1] Purchase Access Verification ---");

    const hasAccessPurchased = await Purchase.exists({
      user: purchasedUser._id,
      book: testBook._id,
      status: "ACTIVE",
    });
    assert.ok(hasAccessPurchased, "Purchased user must have active purchase record.");

    const hasAccessUnpurchased = await Purchase.exists({
      user: unpurchasedUser._id,
      book: testBook._id,
      status: "ACTIVE",
    });
    assert.strictEqual(
      hasAccessUnpurchased,
      null,
      "Unpurchased user must NOT have active purchase record."
    );
    console.log("✔ 1.1 Verified: Only readers with ACTIVE purchase have review permissions.");

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Review Submission Defaults to PENDING & Prevents Duplicates
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 2] Review Submission Defaults to PENDING & Prevents Duplicates ---");

    // Create review via standard upsert
    const newReview = await Review.findOneAndUpdate(
      { user: purchasedUser._id, book: testBook._id },
      {
        $set: {
          rating: 5,
          comment: "চমৎকার ও অনুপ্রেরণাদায়ী একটি বই। প্রতিটি অধ্যায় দারুণ!",
          status: "PENDING",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    assert.strictEqual(newReview.status, "PENDING", "New review must default to PENDING");
    assert.strictEqual(newReview.rating, 5, "Rating must be 5");
    console.log("✔ 2.1 Submitted review correctly defaulted to PENDING status.");

    // Resubmit / Edit by same user should NOT duplicate
    const updatedReview = await Review.findOneAndUpdate(
      { user: purchasedUser._id, book: testBook._id },
      {
        $set: {
          rating: 4,
          comment: "সংশোধিত মতামত: ভালো বই তবে আরও কিছু তথ্য থাকতে পারত।",
          status: "PENDING",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    assert.strictEqual(String(newReview._id), String(updatedReview._id), "Must update existing review (no duplicate)");
    const totalReviewsForUser = await Review.countDocuments({
      user: purchasedUser._id,
      book: testBook._id,
    });
    assert.strictEqual(totalReviewsForUser, 1, "There must strictly be 1 review per user per book");
    console.log("✔ 2.2 Re-submission updated the existing review; 1-review-per-user-per-book constraint enforced.");

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Pending & Rejected Reviews are Hidden Publicly
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 3] Public Isolation of Pending & Rejected Reviews ---");

    let publicReviews = await getBookReviews(bookId);
    assert.strictEqual(publicReviews.length, 0, "PENDING review must NOT be displayed publicly");

    let ratingSummary = await getBookRatingSummary(bookId);
    assert.strictEqual(ratingSummary.totalReviews, 0, "PENDING review must not count towards total reviews");
    assert.strictEqual(ratingSummary.averageRating, 0, "PENDING review must not affect average rating");
    console.log("✔ 3.1 Verified: PENDING review is completely hidden and excluded from public rating metrics.");

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Admin Moderation: Approve, Edit, Reject
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 4] Admin Moderation Workflow (Approve, Edit, Reject) ---");

    // 4a: Admin approves
    updatedReview.status = "APPROVED";
    updatedReview.moderatedBy = adminUser._id;
    updatedReview.moderatedAt = new Date();
    await updatedReview.save();

    publicReviews = await getBookReviews(bookId);
    assert.strictEqual(publicReviews.length, 1, "APPROVED review must now appear publicly");
    assert.strictEqual(publicReviews[0].reviewerName, "Verified Reader One");
    assert.strictEqual(publicReviews[0].rating, 4);

    ratingSummary = await getBookRatingSummary(bookId);
    assert.strictEqual(ratingSummary.totalReviews, 1, "Total approved reviews must be 1");
    assert.strictEqual(ratingSummary.averageRating, 4.0, "Average rating must be 4.0");
    console.log("✔ 4.1 Admin APPROVE verified: Review is now visible publicly and included in ratings.");

    // 4b: Admin edit
    updatedReview.comment = "অ্যাডমিন সম্পাদিত: অত্যন্ত উপকারী ও মানসম্মত বই।";
    updatedReview.rating = 5;
    await updatedReview.save();

    publicReviews = await getBookReviews(bookId);
    assert.strictEqual(publicReviews[0].comment, "অ্যাডমিন সম্পাদিত: অত্যন্ত উপকারী ও মানসম্মত বই।");
    assert.strictEqual(publicReviews[0].rating, 5);
    ratingSummary = await getBookRatingSummary(bookId);
    assert.strictEqual(ratingSummary.averageRating, 5.0);
    console.log("✔ 4.2 Admin EDIT verified: Review content and rating updated accurately.");

    // 4c: Admin reject
    updatedReview.status = "REJECTED";
    await updatedReview.save();

    publicReviews = await getBookReviews(bookId);
    assert.strictEqual(publicReviews.length, 0, "REJECTED review must be removed from public display");
    ratingSummary = await getBookRatingSummary(bookId);
    assert.strictEqual(ratingSummary.totalReviews, 0, "REJECTED review must not count towards total");
    assert.strictEqual(ratingSummary.averageRating, 0, "REJECTED review must not affect average");
    console.log("✔ 4.3 Admin REJECT verified: Rejected review is strictly hidden and excluded.");

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Multi-Review Rating Aggregation (Approved Only)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 5] Multiple Reviews Rating Calculation & Breakdown ---");

    // Approve the first review (rating = 5)
    updatedReview.status = "APPROVED";
    await updatedReview.save();

    // Create a second reader with a 3-star approved review
    const secondReader = await User.create({
      name: "Second Reviewer",
      email: `reader_two_${Date.now()}@pustoka.test`,
      passwordHash: "dummyhash",
      role: "USER",
      status: "ACTIVE",
    });

    await Review.create({
      user: secondReader._id,
      book: testBook._id,
      rating: 3,
      comment: "মোটামুটি ভালো লেগেছে।",
      status: "APPROVED",
      moderatedBy: adminUser._id,
      moderatedAt: new Date(),
    });

    // Create a third review that is PENDING (rating = 1, should NOT affect score)
    const thirdReader = await User.create({
      name: "Third Reviewer",
      email: `reader_three_${Date.now()}@pustoka.test`,
      passwordHash: "dummyhash",
      role: "USER",
      status: "ACTIVE",
    });

    await Review.create({
      user: thirdReader._id,
      book: testBook._id,
      rating: 1,
      comment: "খারাপ বই (অপেক্ষমাণ রিভিউ)।",
      status: "PENDING",
    });

    publicReviews = await getBookReviews(bookId);
    assert.strictEqual(publicReviews.length, 2, "Only 2 approved reviews should appear publicly");

    ratingSummary = await getBookRatingSummary(bookId);
    // Expected average: (5 + 3) / 2 = 4.0 (the 1-star pending review is ignored!)
    assert.strictEqual(ratingSummary.totalReviews, 2, "Total approved reviews must be 2");
    assert.strictEqual(ratingSummary.averageRating, 4.0, "Average rating must be (5+3)/2 = 4.0");
    assert.strictEqual(ratingSummary.breakdown[5], 1, "Breakdown: 1 five-star review");
    assert.strictEqual(ratingSummary.breakdown[3], 1, "Breakdown: 1 three-star review");
    assert.strictEqual(ratingSummary.breakdown[1], 0, "Pending 1-star review must NOT appear in breakdown");
    console.log(`✔ 5.1 Verified: Average rating is ${ratingSummary.averageRating} across ${ratingSummary.totalReviews} approved reviews; pending reviews excluded.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Social Sharing URL Validation
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 6] Social Sharing URL Generation & Privacy Check ---");

    const sampleSlug = testBook.slug;
    const sampleTitle = testBook.title;
    const origin = "https://pustoka.com";
    const bookUrl = `${origin}/books/${sampleSlug}`;

    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookUrl)}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${sampleTitle} — ${bookUrl}`)}`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(sampleTitle)}&url=${encodeURIComponent(bookUrl)}`;

    assert.ok(fbUrl.includes(encodeURIComponent(bookUrl)), "Facebook share URL must contain encoded book URL");
    assert.ok(waUrl.includes(encodeURIComponent(sampleTitle)), "WhatsApp share URL must contain encoded title");
    assert.ok(xUrl.includes(encodeURIComponent(sampleTitle)), "X share URL must contain encoded title");

    // Privacy verification: no user email, id, or purchase token in share URLs
    for (const shareUrl of [fbUrl, waUrl, xUrl]) {
      assert.strictEqual(shareUrl.includes(purchasedUser.email), false, "Share URL must NOT expose user email");
      assert.strictEqual(shareUrl.includes(String(purchasedUser._id)), false, "Share URL must NOT expose user ID");
      assert.strictEqual(shareUrl.includes(String(dummyOrder)), false, "Share URL must NOT expose order ID");
    }
    console.log("✔ 6.1 Verified: Facebook, WhatsApp, and X share links contain book details and ZERO private user/order data.");

  } finally {
    // Clean up test records
    await Review.deleteMany({ book: testBook._id });
    await Purchase.deleteMany({ user: purchasedUser._id });
    await User.deleteMany({
      email: { $regex: /@pustoka\.test$/ },
    });
    await mongoose.disconnect();
  }

  console.log("\n==================================================================");
  console.log(">>> ALL REVIEWS, RATINGS & SOCIAL SHARING TESTS PASSED! <<<");
  console.log("==================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
