import assert from "node:assert";
import { test, describe, before, beforeEach } from "node:test";
import mongoose, { Types } from "mongoose";

// Ensure test environment is active so session hook is enabled
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/mock-in-memory-db";

// Mock mongoose connection so it never attempts to connect to remote MongoDB
mongoose.connect = async () => mongoose;
global.mongooseCache = { conn: mongoose, promise: Promise.resolve(mongoose) };
Object.defineProperty(mongoose.connection, "readyState", {
  value: 1,
  configurable: true,
  writable: true,
});

// Import models and actions
import BookRaw from "../src/models/Book.ts";
import PurchaseRaw from "../src/models/Purchase.ts";
import ReviewRaw from "../src/models/Review.ts";
import { submitBookReview } from "../src/actions/reviews.ts";

const Book = BookRaw.default || BookRaw;
const Purchase = PurchaseRaw.default || PurchaseRaw;
const Review = ReviewRaw.default || ReviewRaw;

// Fixtures
const userAlice = {
  id: "65f0a0000000000000000001",
  name: "Alice Reader",
  email: "alice@pustoka.test",
  image: null,
  role: "USER",
  status: "ACTIVE",
};

const userBob = {
  id: "65f0a0000000000000000002",
  name: "Bob Reader",
  email: "bob@pustoka.test",
  image: null,
  role: "USER",
  status: "ACTIVE",
};

// Books
const freeBook = {
  _id: new Types.ObjectId("65f0b0000000000000000001"),
  title: "ফ্রি বই (বাংলা ব্যাকরণ)",
  slug: "free-bangla-grammar",
  status: "PUBLISHED",
  price: 0,
  discountPrice: null,
  currency: "BDT",
};

const freeDiscountBook = {
  _id: new Types.ObjectId("65f0b0000000000000000002"),
  title: "১০০% ছাড়ে ফ্রি বই",
  slug: "free-discount-book",
  status: "PUBLISHED",
  price: 150,
  discountPrice: 0,
  currency: "BDT",
};

const paidBook = {
  _id: new Types.ObjectId("65f0b0000000000000000003"),
  title: "পেইড বই (প্রোগ্রামিং ফান্ডামেন্টালস)",
  slug: "programming-fundamentals",
  status: "PUBLISHED",
  price: 250,
  discountPrice: 200,
  currency: "BDT",
};

const unpublishedDraftFreeBook = {
  _id: new Types.ObjectId("65f0b0000000000000000004"),
  title: "ড্রাফট ফ্রি বই",
  slug: "draft-free-book",
  status: "DRAFT",
  price: 0,
  discountPrice: null,
  currency: "BDT",
};

const archivedFreeBook = {
  _id: new Types.ObjectId("65f0b0000000000000000005"),
  title: "আর্কাইভড ফ্রি বই",
  slug: "archived-free-book",
  status: "ARCHIVED",
  price: 0,
  discountPrice: null,
  currency: "BDT",
};

// In-memory collections
let booksDb = [];
let purchasesDb = [];
let reviewsDb = [];

function resetDb() {
  booksDb = [
    { ...freeBook },
    { ...freeDiscountBook },
    { ...paidBook },
    { ...unpublishedDraftFreeBook },
    { ...archivedFreeBook },
  ];

  purchasesDb = [
    // Alice has ACTIVE purchase for paidBook
    {
      _id: new Types.ObjectId("65f090000000000000000001"),
      user: new Types.ObjectId(userAlice.id),
      book: paidBook._id,
      status: "ACTIVE",
    },
    // Bob has CANCELLED purchase for paidBook
    {
      _id: new Types.ObjectId("65f090000000000000000002"),
      user: new Types.ObjectId(userBob.id),
      book: paidBook._id,
      status: "CANCELLED",
    },
  ];

  reviewsDb = [];
}

before(() => {
  // Book.findById stub
  Book.findById = (id) => {
    const doc = booksDb.find((b) => String(b._id) === String(id));
    const chain = {
      select: () => chain,
      lean: async () => (doc ? JSON.parse(JSON.stringify(doc)) : null),
    };
    return chain;
  };

  // Purchase.exists stub
  Purchase.exists = async (query) => {
    const match = purchasesDb.find((p) => {
      if (query.user && String(p.user) !== String(query.user)) return false;
      if (query.book && String(p.book) !== String(query.book)) return false;
      if (query.status && p.status !== query.status) return false;
      return true;
    });
    return match ? { _id: match._id } : null;
  };

  // Review.findOneAndUpdate stub (upsert)
  Review.findOneAndUpdate = async (filter, update, options) => {
    const existingIndex = reviewsDb.findIndex(
      (r) =>
        String(r.user) === String(filter.user) &&
        String(r.book) === String(filter.book)
    );

    let doc;
    if (existingIndex >= 0) {
      doc = reviewsDb[existingIndex];
      if (update.$set) {
        Object.assign(doc, update.$set);
      }
      doc.updatedAt = new Date();
    } else if (options?.upsert) {
      doc = {
        _id: new Types.ObjectId(),
        user: filter.user,
        book: filter.book,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(update.$set || {}),
      };
      reviewsDb.push(doc);
    }
    return JSON.parse(JSON.stringify(doc));
  };

  // Review.countDocuments stub
  Review.countDocuments = async (filter) => {
    return reviewsDb.filter((r) => {
      if (filter.user && String(r.user) !== String(filter.user)) return false;
      if (filter.book && String(r.book) !== String(filter.book)) return false;
      if (filter.status && r.status !== filter.status) return false;
      return true;
    }).length;
  };

  // Review.findOne stub
  Review.findOne = (filter) => {
    const doc = reviewsDb.find((r) => {
      if (filter.user && String(r.user) !== String(filter.user)) return false;
      if (filter.book && String(r.book) !== String(filter.book)) return false;
      return true;
    });
    return {
      lean: async () => (doc ? JSON.parse(JSON.stringify(doc)) : null),
    };
  };
});

beforeEach(() => {
  resetDb();
  globalThis.__TEST_SESSION_USER__ = undefined;
});

describe("BUG-04: Allow Reviews for Free Books Verification", () => {
  // ────────────────────────────────────────────────────────────────────────
  // Requirement 1: An authenticated reader can submit a review for a published free book without a Purchase record
  // ────────────────────────────────────────────────────────────────────────
  test("1a. Authenticated reader without a purchase record can successfully review a published free book (price === 0)", async () => {
    globalThis.__TEST_SESSION_USER__ = userBob; // Bob has NO purchase for freeBook

    const formData = new FormData();
    formData.append("bookId", String(freeBook._id));
    formData.append("rating", "5");
    formData.append("comment", "অসাধারণ একটি ফ্রি বই! খুব সুন্দর ব্যাখ্যা দেওয়া হয়েছে।");

    const result = await submitBookReview({ success: false }, formData);

    assert.strictEqual(result.success, true, "Review submission for free book must succeed");
    assert.ok(result.message, "Success message must be provided");

    // Verify review in DB
    const reviewInDb = reviewsDb.find(
      (r) => String(r.user) === userBob.id && String(r.book) === String(freeBook._id)
    );
    assert.ok(reviewInDb, "Review must be saved in the database");
    assert.strictEqual(reviewInDb.rating, 5);
    assert.strictEqual(reviewInDb.comment, "অসাধারণ একটি ফ্রি বই! খুব সুন্দর ব্যাখ্যা দেওয়া হয়েছে।");
    assert.strictEqual(reviewInDb.status, "PENDING", "Review must default to PENDING for moderation");
  });

  test("1b. Authenticated reader can review a 100% discounted free book (discountPrice === 0) without a purchase record", async () => {
    globalThis.__TEST_SESSION_USER__ = userBob; // Bob has NO purchase for freeDiscountBook

    const formData = new FormData();
    formData.append("bookId", String(freeDiscountBook._id));
    formData.append("rating", "4");
    formData.append("comment", "১০০% ছাড়ে ফ্রি পেয়ে পড়েছি, দারুণ অভিজ্ঞতা!");

    const result = await submitBookReview({ success: false }, formData);

    assert.strictEqual(result.success, true, "Review submission for 100% discounted free book must succeed");

    const reviewInDb = reviewsDb.find(
      (r) => String(r.user) === userBob.id && String(r.book) === String(freeDiscountBook._id)
    );
    assert.ok(reviewInDb);
    assert.strictEqual(reviewInDb.rating, 4);
    assert.strictEqual(reviewInDb.status, "PENDING");
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 2: A reader without a Purchase record cannot review a paid book
  // ────────────────────────────────────────────────────────────────────────
  test("2a. Reader without an active Purchase record is rejected when reviewing a paid book", async () => {
    // Bob has a CANCELLED purchase for paidBook, NOT an active one
    globalThis.__TEST_SESSION_USER__ = userBob;

    const formData = new FormData();
    formData.append("bookId", String(paidBook._id));
    formData.append("rating", "5");
    formData.append("comment", "বইটি না কিনেই রিভিউ দেওয়ার চেষ্টা করছি!");

    const result = await submitBookReview({ success: false }, formData);

    assert.strictEqual(result.success, false, "Review submission without active purchase must fail");
    assert.strictEqual(
      result.error,
      "শুধুমাত্র বইটি ক্রয়কারী পাঠকরাই পর্যালোচনা ও রেটিং দিতে পারবেন।"
    );

    // Verify no review was created
    const reviewInDb = reviewsDb.find(
      (r) => String(r.user) === userBob.id && String(r.book) === String(paidBook._id)
    );
    assert.strictEqual(reviewInDb, undefined, "No review should be created for unpurchased paid book");
  });

  test("2b. Reader who never interacted with a paid book at all cannot review it", async () => {
    // New user with zero purchases
    globalThis.__TEST_SESSION_USER__ = {
      id: "65f0a0000000000000000099",
      name: "Stranger",
      email: "stranger@pustoka.test",
      image: null,
      role: "USER",
      status: "ACTIVE",
    };

    const formData = new FormData();
    formData.append("bookId", String(paidBook._id));
    formData.append("rating", "3");
    formData.append("comment", "আমি কখনো এই বইটি কিনিনি।");

    const result = await submitBookReview({ success: false }, formData);

    assert.strictEqual(result.success, false);
    assert.strictEqual(
      result.error,
      "শুধুমাত্র বইটি ক্রয়কারী পাঠকরাই পর্যালোচনা ও রেটিং দিতে পারবেন।"
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 3: A reader with a valid ACTIVE Purchase can review a paid book
  // ────────────────────────────────────────────────────────────────────────
  test("3. Reader with a valid ACTIVE Purchase can successfully review a paid book", async () => {
    // Alice has ACTIVE purchase for paidBook
    globalThis.__TEST_SESSION_USER__ = userAlice;

    const formData = new FormData();
    formData.append("bookId", String(paidBook._id));
    formData.append("rating", "5");
    formData.append("comment", "প্রোগ্রামিং শেখার জন্য অদ্বিতীয় একটি বই। খুবই কার্যকরী!");

    const result = await submitBookReview({ success: false }, formData);
    if (!result.success) {
      console.error("DEBUG TEST 3 FAILURE:", result);
    }

    assert.strictEqual(result.success, true, "Review submission with active purchase must succeed");

    const reviewInDb = reviewsDb.find(
      (r) => String(r.user) === userAlice.id && String(r.book) === String(paidBook._id)
    );
    assert.ok(reviewInDb, "Review must be saved");
    assert.strictEqual(reviewInDb.rating, 5);
    assert.strictEqual(reviewInDb.status, "PENDING");
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 4: Unauthenticated review submissions are rejected
  // ────────────────────────────────────────────────────────────────────────
  test("4. Unauthenticated review submissions are rejected immediately", async () => {
    globalThis.__TEST_SESSION_USER__ = null; // Unauthenticated

    const formData = new FormData();
    formData.append("bookId", String(freeBook._id));
    formData.append("rating", "5");
    formData.append("comment", "লগইন না করে রিভিউ দিচ্ছি!");

    const result = await submitBookReview({ success: false }, formData);

    assert.strictEqual(result.success, false, "Unauthenticated review must be rejected");
    assert.strictEqual(
      result.error,
      "পর্যালোচনা জমা দিতে অনুগ্রহ করে লগইন করুন।"
    );
    assert.strictEqual(reviewsDb.length, 0, "No review should be created in DB");
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 5: Invalid ratings are rejected and comments remain sanitized
  // ────────────────────────────────────────────────────────────────────────
  test("5a. Invalid ratings (< 1, > 5, NaN) are rejected with field errors", async () => {
    globalThis.__TEST_SESSION_USER__ = userBob;

    // Rating = 0
    const formZero = new FormData();
    formZero.append("bookId", String(freeBook._id));
    formZero.append("rating", "0");
    formZero.append("comment", "শূন্য রেটিং!");
    const resZero = await submitBookReview({ success: false }, formZero);
    assert.strictEqual(resZero.success, false);
    assert.ok(resZero.fieldErrors?.rating);

    // Rating = 6
    const formSix = new FormData();
    formSix.append("bookId", String(freeBook._id));
    formSix.append("rating", "6");
    formSix.append("comment", "ছয় রেটিং!");
    const resSix = await submitBookReview({ success: false }, formSix);
    assert.strictEqual(resSix.success, false);
    assert.ok(resSix.fieldErrors?.rating);

    // Rating = "abc"
    const formNan = new FormData();
    formNan.append("bookId", String(freeBook._id));
    formNan.append("rating", "abc");
    formNan.append("comment", "নাল রেটিং!");
    const resNan = await submitBookReview({ success: false }, formNan);
    assert.strictEqual(resNan.success, false);
    assert.ok(resNan.fieldErrors?.rating);
  });

  test("5b. Comment validation (min 3 chars, max 1000 chars, trimmed)", async () => {
    globalThis.__TEST_SESSION_USER__ = userBob;

    // Comment too short (< 3 chars)
    const formShort = new FormData();
    formShort.append("bookId", String(freeBook._id));
    formShort.append("rating", "5");
    formShort.append("comment", "হা");
    const resShort = await submitBookReview({ success: false }, formShort);
    assert.strictEqual(resShort.success, false);
    assert.ok(resShort.fieldErrors?.comment);

    // Comment whitespace-only (trimmed to < 3 chars)
    const formWhitespace = new FormData();
    formWhitespace.append("bookId", String(freeBook._id));
    formWhitespace.append("rating", "5");
    formWhitespace.append("comment", "    ");
    const resWhitespace = await submitBookReview({ success: false }, formWhitespace);
    assert.strictEqual(resWhitespace.success, false);
    assert.ok(resWhitespace.fieldErrors?.comment);

    // Comment too long (> 1000 chars)
    const formLong = new FormData();
    formLong.append("bookId", String(freeBook._id));
    formLong.append("rating", "5");
    formLong.append("comment", "ক".repeat(1001));
    const resLong = await submitBookReview({ success: false }, formLong);
    assert.strictEqual(resLong.success, false);
    assert.ok(resLong.fieldErrors?.comment);

    // Valid comment with leading and trailing whitespace is properly trimmed
    const formTrim = new FormData();
    formTrim.append("bookId", String(freeBook._id));
    formTrim.append("rating", "5");
    formTrim.append("comment", "   খুব সুন্দর ও তথ্যবহুল বই।   ");
    const resTrim = await submitBookReview({ success: false }, formTrim);
    if (!resTrim.success) {
      console.error("DEBUG TEST 5b FAILURE:", resTrim);
    }
    assert.strictEqual(resTrim.success, true);

    const saved = reviewsDb.find((r) => String(r.user) === userBob.id);
    assert.strictEqual(saved?.comment, "খুব সুন্দর ও তথ্যবহুল বই।", "Whitespace must be trimmed");
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 6: Duplicate reviews and moderation behavior remain correct
  // ────────────────────────────────────────────────────────────────────────
  test("6. Duplicate reviews update the existing record (1 review per user per book) and reset to PENDING", async () => {
    globalThis.__TEST_SESSION_USER__ = userBob;

    // Step 1: Submit first review
    const form1 = new FormData();
    form1.append("bookId", String(freeBook._id));
    form1.append("rating", "4");
    form1.append("comment", "প্রথমবারের রিভিউ: বইটা ভালো।");
    const res1 = await submitBookReview({ success: false }, form1);
    if (!res1.success) {
      console.error("DEBUG TEST 6 STEP 1 FAILURE:", res1);
    }
    assert.strictEqual(res1.success, true);

    assert.strictEqual(reviewsDb.length, 1);
    const firstReviewId = reviewsDb[0]._id;

    // Simulate admin approving the review
    reviewsDb[0].status = "APPROVED";
    reviewsDb[0].moderatedBy = new Types.ObjectId("65f0d0000000000000000001");
    reviewsDb[0].moderatedAt = new Date();

    // Step 2: User updates/edits their review
    const form2 = new FormData();
    form2.append("bookId", String(freeBook._id));
    form2.append("rating", "5");
    form2.append("comment", "আপডেটেড রিভিউ: পুরো বইটা পড়ে দেখলাম সত্যিই অসাধারণ!");
    const res2 = await submitBookReview({ success: false }, form2);
    assert.strictEqual(res2.success, true);

    // Verify uniqueness: still exactly 1 review in database
    assert.strictEqual(reviewsDb.length, 1, "Review count must not duplicate");
    assert.strictEqual(String(reviewsDb[0]._id), String(firstReviewId), "Review ID must remain identical");
    assert.strictEqual(reviewsDb[0].rating, 5, "Rating must be updated");
    assert.strictEqual(reviewsDb[0].comment, "আপডেটেড রিভিউ: পুরো বইটা পড়ে দেখলাম সত্যিই অসাধারণ!");

    // Verify moderation reset: status must reset to PENDING and clear previous moderation
    assert.strictEqual(reviewsDb[0].status, "PENDING", "Updated review must reset status to PENDING for moderation");
    assert.strictEqual(reviewsDb[0].moderatedBy, null, "moderatedBy must be reset to null");
    assert.strictEqual(reviewsDb[0].moderatedAt, null, "moderatedAt must be reset to null");
  });

  // ────────────────────────────────────────────────────────────────────────
  // Unpublished and Archived books cannot be reviewed
  // ────────────────────────────────────────────────────────────────────────
  test("7. Unpublished (DRAFT) and ARCHIVED books cannot be reviewed, even if free", async () => {
    globalThis.__TEST_SESSION_USER__ = userBob;

    // 7a: DRAFT free book
    const formDraft = new FormData();
    formDraft.append("bookId", String(unpublishedDraftFreeBook._id));
    formDraft.append("rating", "5");
    formDraft.append("comment", "ড্রাফট বই রিভিউ দেওয়ার চেষ্টা!");
    const resDraft = await submitBookReview({ success: false }, formDraft);
    assert.strictEqual(resDraft.success, false);
    assert.strictEqual(
      resDraft.error,
      "বইটি খুঁজে পাওয়া যায়নি অথবা এটি বর্তমানে উপলব্ধ নেই।"
    );

    // 7b: ARCHIVED free book
    const formArchived = new FormData();
    formArchived.append("bookId", String(archivedFreeBook._id));
    formArchived.append("rating", "5");
    formArchived.append("comment", "আর্কাইভড বই রিভিউ দেওয়ার চেষ্টা!");
    const resArchived = await submitBookReview({ success: false }, formArchived);
    assert.strictEqual(resArchived.success, false);
    assert.strictEqual(
      resArchived.error,
      "বইটি খুঁজে পাওয়া যায়নি অথবা এটি বর্তমানে উপলব্ধ নেই।"
    );
  });
});
