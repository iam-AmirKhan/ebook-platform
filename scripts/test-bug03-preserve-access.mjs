import assert from "node:assert";
import { test, describe, before, beforeEach } from "node:test";
import mongoose, { Types } from "mongoose";

// Ensure test environment is active so DB mocks are used and no live DB is modified
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/mock-in-memory-db";

// Mock mongoose connection so it never connects to remote MongoDB
mongoose.connect = async () => mongoose;
global.mongooseCache = { conn: mongoose, promise: Promise.resolve(mongoose) };
Object.defineProperty(mongoose.connection, "readyState", {
  value: 1,
  configurable: true,
  writable: true,
});

import BookRaw from "../src/models/Book.ts";
import PurchaseRaw from "../src/models/Purchase.ts";
import UserRaw from "../src/models/User.ts";
import OrderRaw from "../src/models/Order.ts";
import ReadingProgressRaw from "../src/models/ReadingProgress.ts";
import AuthorRaw from "../src/models/Author.ts";
import CategoryRaw from "../src/models/Category.ts";

import { getAccountDashboardData } from "../src/lib/data/account.ts";
import { getBookBySlug, getProtectedChapter } from "../src/lib/data/book-details.ts";
import { getFeaturedBooks } from "../src/lib/data/homepage.ts";
import { getCatalogBooks } from "../src/lib/data/catalog.ts";

const Book = BookRaw.default || BookRaw;
const Purchase = PurchaseRaw.default || PurchaseRaw;
const User = UserRaw.default || UserRaw;
const Order = OrderRaw.default || OrderRaw;
const ReadingProgress = ReadingProgressRaw.default || ReadingProgressRaw;
const Author = AuthorRaw.default || AuthorRaw;
const Category = CategoryRaw.default || CategoryRaw;

// Fixtures
const testAuthor = {
  _id: new Types.ObjectId("65f0d0000000000000000001"),
  penName: "টেস্ট লেখক",
  slug: "test-author",
  bio: "লেখক পরিচিতি",
};

const testCategory = {
  _id: new Types.ObjectId("65f0e0000000000000000001"),
  name: "বিজ্ঞান কল্পকাহিনী",
  slug: "sci-fi",
  status: "ACTIVE",
};

const activeBuyerId = new Types.ObjectId("65f0a0000000000000000001");
const cancelledBuyerId = new Types.ObjectId("65f0a0000000000000000002");
const nonPurchaserId = new Types.ObjectId("65f0a0000000000000000003");

// Book 1: Unpublished (status: "DRAFT")
const bookUnpublishedDraft = {
  _id: new Types.ObjectId("65f0b0000000000000000001"),
  title: "আনপাবলিশড বই ১ (ড্রাফট)",
  slug: "unpublished-draft-book",
  description: "এই বইটি লেখক অপ্রকাশিত করেছেন।",
  coverImage: "https://example.com/cover1.jpg",
  author: testAuthor,
  category: testCategory,
  price: 250,
  discountPrice: null,
  currency: "BDT",
  status: "DRAFT",
  createdAt: new Date("2026-01-01"),
  chapters: [
    {
      order: 1,
      title: "প্রথম অধ্যায়: সূচনা",
      isPreview: true,
      teaser: "সূচনা অংশ...",
      content: "এটি ড্রাফট বইয়ের প্রথম অধ্যায়ের পূর্ণাঙ্গ বিষয়বস্তু।",
    },
    {
      order: 2,
      title: "দ্বিতীয় অধ্যায়: রহস্য",
      isPreview: false,
      teaser: "রহস্যের শুরু...",
      content: "এটি ড্রাফট বইয়ের দ্বিতীয় অধ্যায়ের লকড গোপনীয় বিষয়বস্তু।",
    },
  ],
};

// Book 2: Archived (status: "ARCHIVED")
const bookArchived = {
  _id: new Types.ObjectId("65f0b0000000000000000002"),
  title: "আর্কাইভড বই ২",
  slug: "archived-book-two",
  description: "এই বইটি আর্কাইভ করা হয়েছে।",
  coverImage: "https://example.com/cover2.jpg",
  author: testAuthor,
  category: testCategory,
  price: 300,
  discountPrice: null,
  currency: "BDT",
  status: "ARCHIVED",
  createdAt: new Date("2026-01-02"),
  chapters: [
    {
      order: 1,
      title: "প্রথম অধ্যায়: অতীত",
      isPreview: true,
      teaser: "অতীতের কথা...",
      content: "এটি আর্কাইভড বইয়ের প্রথম অধ্যায়ের পূর্ণাঙ্গ বিষয়বস্তু।",
    },
    {
      order: 2,
      title: "দ্বিতীয় অধ্যায়: গোপন সত্য",
      isPreview: false,
      teaser: "সত্য উন্মোচন...",
      content: "এটি আর্কাইভড বইয়ের দ্বিতীয় অধ্যায়ের সুরক্ষিত পূর্ণাঙ্গ পাঠ্য।",
    },
  ],
};

// Book 3: Normal Published (status: "PUBLISHED")
const bookPublished = {
  _id: new Types.ObjectId("65f0b0000000000000000003"),
  title: "পাবলিশড বই ৩",
  slug: "published-book-three",
  description: "এটি একটি সক্রিয় প্রকাশিত বই।",
  coverImage: "https://example.com/cover3.jpg",
  author: testAuthor,
  category: testCategory,
  price: 200,
  discountPrice: null,
  currency: "BDT",
  status: "PUBLISHED",
  createdAt: new Date("2026-01-03"),
  chapters: [
    {
      order: 1,
      title: "অধ্যায় ১",
      isPreview: true,
      teaser: "সবার জন্য উন্মুক্ত...",
      content: "পাবলিশড প্রিভিউ অধ্যায়।",
    },
    {
      order: 2,
      title: "অধ্যায় ২",
      isPreview: false,
      teaser: "কেনা পাঠকদের জন্য...",
      content: "পাবলিশড সুরক্ষিত অধ্যায়।",
    },
  ],
};

// In-memory data collections
let booksDb = [];
let purchasesDb = [];
let readingProgressDb = [];
let ordersDb = [];

function resetDb() {
  booksDb = [
    JSON.parse(JSON.stringify(bookUnpublishedDraft)),
    JSON.parse(JSON.stringify(bookArchived)),
    JSON.parse(JSON.stringify(bookPublished)),
  ];

  purchasesDb = [
    // activeBuyer purchased all 3 books
    {
      _id: new Types.ObjectId("65f090000000000000000001"),
      user: activeBuyerId,
      book: bookUnpublishedDraft._id,
      order: new Types.ObjectId(),
      price: 250,
      currency: "BDT",
      status: "ACTIVE",
      purchasedAt: new Date("2026-02-01"),
    },
    {
      _id: new Types.ObjectId("65f090000000000000000002"),
      user: activeBuyerId,
      book: bookArchived._id,
      order: new Types.ObjectId(),
      price: 300,
      currency: "BDT",
      status: "ACTIVE",
      purchasedAt: new Date("2026-02-02"),
    },
    {
      _id: new Types.ObjectId("65f090000000000000000003"),
      user: activeBuyerId,
      book: bookPublished._id,
      order: new Types.ObjectId(),
      price: 200,
      currency: "BDT",
      status: "ACTIVE",
      purchasedAt: new Date("2026-02-03"),
    },
    // cancelledBuyer had purchase cancelled / refunded
    {
      _id: new Types.ObjectId("65f090000000000000000004"),
      user: cancelledBuyerId,
      book: bookUnpublishedDraft._id,
      order: new Types.ObjectId(),
      price: 250,
      currency: "BDT",
      status: "CANCELLED",
      purchasedAt: new Date("2026-02-01"),
    },
    {
      _id: new Types.ObjectId("65f090000000000000000005"),
      user: cancelledBuyerId,
      book: bookArchived._id,
      order: new Types.ObjectId(),
      price: 300,
      currency: "BDT",
      status: "REFUNDED",
      purchasedAt: new Date("2026-02-02"),
    },
  ];

  readingProgressDb = [
    {
      user: activeBuyerId,
      book: bookUnpublishedDraft._id,
      progress: 45,
      lastReadAt: new Date("2026-02-10"),
    },
    {
      user: activeBuyerId,
      book: bookArchived._id,
      progress: 80,
      lastReadAt: new Date("2026-02-12"),
    },
  ];

  ordersDb = [];
}

// Setup in-memory query stubs
before(() => {
  // Book.findOne stub
  Book.findOne = (query) => {
    let result = null;
    if (query?.slug) {
      result = booksDb.find((b) => b.slug === query.slug);
      if (query.status && result && result.status !== query.status) {
        result = null;
      }
    } else if (query?._id) {
      result = booksDb.find((b) => String(b._id) === String(query._id));
    }

    const doc = result ? JSON.parse(JSON.stringify(result)) : null;

    const chain = {
      select: () => chain,
      populate: () => chain,
      lean: async () => doc,
    };
    return chain;
  };

  // Book.find stub (for catalog/homepage)
  Book.find = (query) => {
    let results = booksDb.slice();
    if (query?.status) {
      results = results.filter((b) => b.status === query.status);
    }
    const chain = {
      sort: () => chain,
      limit: (lim) => {
        results = results.slice(0, lim);
        return chain;
      },
      skip: () => chain,
      populate: () => chain,
      select: () => chain,
      lean: async () => JSON.parse(JSON.stringify(results)),
    };
    return chain;
  };

  // Book.populate stub
  Book.populate = async (docs) => {
    return docs.map((doc) => {
      const full = booksDb.find((b) => String(b._id) === String(doc._id));
      return {
        ...doc,
        author: full?.author || testAuthor,
        category: full?.category || testCategory,
      };
    });
  };

  // Category.find stub
  Category.find = () => ({
    lean: async () => [testCategory],
  });

  // Book.aggregate stub (for catalog)
  Book.aggregate = async (pipeline) => {
    let items = booksDb.slice();
    for (const stage of pipeline) {
      if (stage.$match) {
        if (stage.$match.status) {
          items = items.filter((b) => b.status === stage.$match.status);
        }
      }
      if (stage.$limit) {
        items = items.slice(0, stage.$limit);
      }
    }
    return JSON.parse(JSON.stringify(items));
  };

  // Book.countDocuments stub
  Book.countDocuments = async (query) => {
    if (query?.status) {
      return booksDb.filter((b) => b.status === query.status).length;
    }
    return booksDb.length;
  };

  // Purchase.find stub
  Purchase.find = (query) => {
    let results = purchasesDb.filter((p) => {
      if (query.user && String(p.user) !== String(query.user)) return false;
      if (query.status && p.status !== query.status) return false;
      return true;
    });

    const chain = {
      sort: () => chain,
      populate: (popOptions) => {
        // Deep populate book
        results = results.map((p) => {
          const copy = JSON.parse(JSON.stringify(p));
          const bookDoc = booksDb.find((b) => String(b._id) === String(p.book));
          if (popOptions?.match?.status && bookDoc?.status !== popOptions.match.status) {
            copy.book = null;
          } else {
            copy.book = bookDoc ? JSON.parse(JSON.stringify(bookDoc)) : null;
          }
          return copy;
        });
        return chain;
      },
      lean: async () => JSON.parse(JSON.stringify(results)),
    };
    return chain;
  };

  // Purchase.findOne stub
  Purchase.findOne = (query) => {
    const match = purchasesDb.find((p) => {
      if (query.user && String(p.user) !== String(query.user)) return false;
      if (query.book && String(p.book) !== String(query.book)) return false;
      if (query.status && p.status !== query.status) return false;
      return true;
    });
    return {
      lean: async () => (match ? JSON.parse(JSON.stringify(match)) : null),
    };
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

  // ReadingProgress.find stub
  ReadingProgress.find = (query) => {
    const matches = readingProgressDb.filter((rp) => {
      if (query.user && String(rp.user) !== String(query.user)) return false;
      return true;
    });
    return {
      lean: async () => JSON.parse(JSON.stringify(matches)),
    };
  };

  // Order.find stub
  Order.find = () => {
    return {
      sort: () => ({
        lean: async () => [],
      }),
    };
  };
});

beforeEach(() => {
  resetDb();
});

describe("BUG-03: Preserve Purchased Book Access Verification", () => {
  // ────────────────────────────────────────────────────────────────────────
  // Requirement 1: An active purchaser can read an eligible purchased book after it is unpublished
  // ────────────────────────────────────────────────────────────────────────
  test("1. Active purchaser can read both preview and locked chapters of an unpublished (DRAFT) book", async () => {
    // 1a: Reading locked chapter (order 2)
    const resultLocked = await getProtectedChapter(
      bookUnpublishedDraft.slug,
      2,
      String(activeBuyerId),
      "Amir Active Buyer"
    );

    assert.strictEqual(resultLocked.allowed, true, "Active purchaser must be allowed to read locked chapter of unpublished book");
    assert.strictEqual(resultLocked.statusCode, 200, "Status must be 200 OK");
    assert.ok(resultLocked.chapter?.content, "Chapter content must be delivered to purchaser");
    assert.strictEqual(
      resultLocked.chapter.content,
      bookUnpublishedDraft.chapters[1].content,
      "Content must match original locked chapter"
    );
    assert.strictEqual(resultLocked.reader?.identifier, "Amir Active Buyer");

    // 1b: Reading preview chapter (order 1)
    const resultPreview = await getProtectedChapter(
      bookUnpublishedDraft.slug,
      1,
      String(activeBuyerId),
      "Amir Active Buyer"
    );
    assert.strictEqual(resultPreview.allowed, true, "Active purchaser must be allowed to read preview chapter");
    assert.strictEqual(resultPreview.statusCode, 200);
    assert.ok(resultPreview.chapter?.content);
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 2: An active purchaser can read an eligible purchased book after it is archived
  // ────────────────────────────────────────────────────────────────────────
  test("2. Active purchaser can read both preview and locked chapters of an ARCHIVED book", async () => {
    // 2a: Reading locked chapter (order 2)
    const resultLocked = await getProtectedChapter(
      bookArchived.slug,
      2,
      String(activeBuyerId),
      "Amir Active Buyer"
    );

    assert.strictEqual(resultLocked.allowed, true, "Active purchaser must be allowed to read locked chapter of archived book");
    assert.strictEqual(resultLocked.statusCode, 200, "Status must be 200 OK");
    assert.ok(resultLocked.chapter?.content, "Chapter content must be delivered to purchaser");
    assert.strictEqual(
      resultLocked.chapter.content,
      bookArchived.chapters[1].content,
      "Content must match original locked chapter"
    );
    assert.strictEqual(resultLocked.reader?.identifier, "Amir Active Buyer");

    // 2b: Reading preview chapter (order 1)
    const resultPreview = await getProtectedChapter(
      bookArchived.slug,
      1,
      String(activeBuyerId),
      "Amir Active Buyer"
    );
    assert.strictEqual(resultPreview.allowed, true);
    assert.strictEqual(resultPreview.statusCode, 200);
    assert.ok(resultPreview.chapter?.content);
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 3: A non-purchaser cannot access the protected chapter
  // ────────────────────────────────────────────────────────────────────────
  test("3. Non-purchasers and unauthenticated visitors cannot access protected chapters of unpublished or archived books", async () => {
    // 3a: Authenticated non-purchaser requesting locked chapter of unpublished book
    const unpurchasedLocked = await getProtectedChapter(
      bookUnpublishedDraft.slug,
      2,
      String(nonPurchaserId),
      "Unauthorized Reader"
    );
    assert.strictEqual(unpurchasedLocked.allowed, false, "Non-purchaser must be denied access");
    assert.strictEqual(unpurchasedLocked.statusCode, 403, "Status must be 403 Forbidden");
    assert.strictEqual(unpurchasedLocked.chapter, undefined, "Chapter content must not be provided");

    // 3b: Authenticated non-purchaser requesting preview chapter of unpublished book
    const unpurchasedPreview = await getProtectedChapter(
      bookUnpublishedDraft.slug,
      1,
      String(nonPurchaserId),
      "Unauthorized Reader"
    );
    assert.strictEqual(unpurchasedPreview.allowed, false, "Non-purchaser must not access unpublished book preview");
    assert.strictEqual(unpurchasedPreview.statusCode, 403);
    assert.strictEqual(unpurchasedPreview.chapter, undefined);

    // 3c: Authenticated non-purchaser requesting locked chapter of archived book
    const archivedLocked = await getProtectedChapter(
      bookArchived.slug,
      2,
      String(nonPurchaserId),
      "Unauthorized Reader"
    );
    assert.strictEqual(archivedLocked.allowed, false);
    assert.strictEqual(archivedLocked.statusCode, 403);
    assert.strictEqual(archivedLocked.chapter, undefined);

    // 3d: Unauthenticated visitor requesting chapter of unpublished book
    const unauthUnpublished = await getProtectedChapter(
      bookUnpublishedDraft.slug,
      1,
      null
    );
    assert.strictEqual(unauthUnpublished.allowed, false, "Unauthenticated request must be denied");
    assert.strictEqual(unauthUnpublished.statusCode, 401, "Status must be 401 Unauthorized");
    assert.strictEqual(unauthUnpublished.chapter, undefined);

    // 3e: Non-purchaser requesting locked chapter of a PUBLISHED book
    const publishedLocked = await getProtectedChapter(
      bookPublished.slug,
      2,
      String(nonPurchaserId),
      "Unauthorized Reader"
    );
    assert.strictEqual(publishedLocked.allowed, false, "Non-purchaser must be denied on published locked chapter");
    assert.strictEqual(publishedLocked.statusCode, 403);
    assert.strictEqual(publishedLocked.chapter, undefined);
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 4: A cancelled or inactive purchase does not grant access
  // ────────────────────────────────────────────────────────────────────────
  test("4. Cancelled or refunded purchases do not grant access to chapters", async () => {
    // 4a: Cancelled purchase on unpublished book
    const cancelledResult = await getProtectedChapter(
      bookUnpublishedDraft.slug,
      2,
      String(cancelledBuyerId),
      "Cancelled Buyer"
    );
    assert.strictEqual(cancelledResult.allowed, false, "Cancelled purchase must not grant access");
    assert.strictEqual(cancelledResult.statusCode, 403);
    assert.strictEqual(cancelledResult.chapter, undefined);

    // 4b: Refunded purchase on archived book
    const refundedResult = await getProtectedChapter(
      bookArchived.slug,
      2,
      String(cancelledBuyerId),
      "Refunded Buyer"
    );
    assert.strictEqual(refundedResult.allowed, false, "Refunded purchase must not grant access");
    assert.strictEqual(refundedResult.statusCode, 403);
    assert.strictEqual(refundedResult.chapter, undefined);
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 5: Unpublished/archived books remain excluded from public catalog and homepage discovery
  // ────────────────────────────────────────────────────────────────────────
  test("5. Unpublished and archived books remain excluded from public catalog and homepage discovery", async () => {
    // 5a: Featured books on homepage
    const featured = await getFeaturedBooks();
    const featuredIds = featured.map((b) => b._id);
    assert.ok(
      !featuredIds.includes(String(bookUnpublishedDraft._id)),
      "Unpublished draft book must NOT appear in featured books"
    );
    assert.ok(
      !featuredIds.includes(String(bookArchived._id)),
      "Archived book must NOT appear in featured books"
    );
    assert.ok(
      featuredIds.includes(String(bookPublished._id)),
      "Published book must appear in featured books"
    );

    // 5b: Catalog books
    const catalog = await getCatalogBooks({});
    const catalogIds = catalog.books.map((b) => b._id);
    assert.ok(
      !catalogIds.includes(String(bookUnpublishedDraft._id)),
      "Unpublished draft book must NOT appear in public catalog"
    );
    assert.ok(
      !catalogIds.includes(String(bookArchived._id)),
      "Archived book must NOT appear in public catalog"
    );
    assert.ok(
      catalogIds.includes(String(bookPublished._id)),
      "Published book must appear in public catalog"
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // Account Dashboard Library: Active purchaser's library includes unpublished & archived books
  // ────────────────────────────────────────────────────────────────────────
  test("6. Account library preserves previously purchased books even when unpublished or archived", async () => {
    const dashboardData = await getAccountDashboardData(String(activeBuyerId));

    assert.ok(dashboardData, "Dashboard data must be returned");
    const libraryIds = dashboardData.library.map((b) => b._id);

    // Both unpublished and archived books must be in the active purchaser's library
    assert.ok(
      libraryIds.includes(String(bookUnpublishedDraft._id)),
      "Unpublished purchased book MUST be in library"
    );
    assert.ok(
      libraryIds.includes(String(bookArchived._id)),
      "Archived purchased book MUST be in library"
    );
    assert.ok(
      libraryIds.includes(String(bookPublished._id)),
      "Published purchased book MUST be in library"
    );
    assert.strictEqual(dashboardData.library.length, 3, "Library must contain all 3 active purchases");

    // Reading progress must still be properly mapped
    const draftBookInLib = dashboardData.library.find((b) => b._id === String(bookUnpublishedDraft._id));
    assert.strictEqual(draftBookInLib?.progress, 45, "Reading progress for unpublished book must be preserved");

    const archivedBookInLib = dashboardData.library.find((b) => b._id === String(bookArchived._id));
    assert.strictEqual(archivedBookInLib?.progress, 80, "Reading progress for archived book must be preserved");

    // Recent reads should contain books with progress
    const recentReadIds = dashboardData.recentReads.map((b) => b._id);
    assert.ok(recentReadIds.includes(String(bookArchived._id)));
    assert.ok(recentReadIds.includes(String(bookUnpublishedDraft._id)));
  });

  test("7. Account library excludes deleted books and cancelled purchases", async () => {
    // 7a: Cancelled buyer should have empty library
    const cancelledData = await getAccountDashboardData(String(cancelledBuyerId));
    assert.strictEqual(cancelledData.library.length, 0, "Cancelled/refunded purchases must not appear in library");

    // 7b: Deleted book record in DB does not crash library and is safely dropped
    const deletedBookId = new Types.ObjectId("65f0b0000000000000000099");
    purchasesDb.push({
      _id: new Types.ObjectId("65f090000000000000000099"),
      user: activeBuyerId,
      book: deletedBookId, // Does NOT exist in booksDb
      order: new Types.ObjectId(),
      price: 100,
      currency: "BDT",
      status: "ACTIVE",
      purchasedAt: new Date(),
    });

    const withDeletedData = await getAccountDashboardData(String(activeBuyerId));
    assert.strictEqual(withDeletedData.library.length, 3, "Deleted book must be safely dropped from library");
  });

  // ────────────────────────────────────────────────────────────────────────
  // getBookBySlug Entitlement Isolation
  // ────────────────────────────────────────────────────────────────────────
  test("8. getBookBySlug preserves access for active purchaser while keeping unpublished books hidden from non-purchasers", async () => {
    // 8a: Active purchaser can view details of unpublished book
    const purchaserDraftView = await getBookBySlug(bookUnpublishedDraft.slug, String(activeBuyerId));
    assert.ok(purchaserDraftView, "Active purchaser must be able to load unpublished book details");
    assert.strictEqual(purchaserDraftView.isOwned, true, "Must be marked as owned");
    assert.strictEqual(purchaserDraftView.title, bookUnpublishedDraft.title);

    // Initial page payload must NOT leak locked chapter content even for owner
    for (const ch of purchaserDraftView.chapters) {
      if (!ch.isPreview) {
        assert.strictEqual(ch.content, null, "Locked chapter content must be null in initial page payload");
      }
    }

    // 8b: Active purchaser can view details of archived book
    const purchaserArchivedView = await getBookBySlug(bookArchived.slug, String(activeBuyerId));
    assert.ok(purchaserArchivedView, "Active purchaser must be able to load archived book details");
    assert.strictEqual(purchaserArchivedView.isOwned, true);

    // 8c: Non-purchaser cannot load details of unpublished book (returns null -> notFound)
    const nonPurchaserDraftView = await getBookBySlug(bookUnpublishedDraft.slug, String(nonPurchaserId));
    assert.strictEqual(nonPurchaserDraftView, null, "Non-purchaser must receive null for unpublished book");

    // 8d: Unauthenticated visitor cannot load details of unpublished book (returns null)
    const visitorDraftView = await getBookBySlug(bookUnpublishedDraft.slug, null);
    assert.strictEqual(visitorDraftView, null, "Unauthenticated visitor must receive null for unpublished book");

    // 8e: Non-purchaser CAN view details of published book (as a storefront item) with locked content stripped
    const nonPurchaserPublishedView = await getBookBySlug(bookPublished.slug, String(nonPurchaserId));
    assert.ok(nonPurchaserPublishedView, "Publicly published book must be viewable by non-purchaser");
    assert.strictEqual(nonPurchaserPublishedView.isOwned, false, "Non-purchaser does not own published book");

    // 8f: Nonexistent / deleted book returns null
    const missingBook = await getBookBySlug("non-existent-book-slug-404", String(activeBuyerId));
    assert.strictEqual(missingBook, null, "Nonexistent book must return null");
  });

  // ────────────────────────────────────────────────────────────────────────
  // Missing or deleted book record does not bypass authorization
  // ────────────────────────────────────────────────────────────────────────
  test("9. Missing or deleted book record does not bypass authorization in getProtectedChapter", async () => {
    const result = await getProtectedChapter(
      "totally-non-existent-book",
      1,
      String(activeBuyerId),
      "Active Reader"
    );
    assert.strictEqual(result.allowed, false, "Nonexistent book must be rejected");
    assert.strictEqual(result.statusCode, 404, "Status must be 404");
  });
});
