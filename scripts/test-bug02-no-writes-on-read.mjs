import assert from "node:assert";
import { test, describe, before, beforeEach } from "node:test";
import mongoose, { Types } from "mongoose";

// Ensure test environment is active so DB mocks are used
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
import CategoryRaw from "../src/models/Category.ts";
import AuthorRaw from "../src/models/Author.ts";

import { getFeaturedBooks } from "../src/lib/data/homepage.ts";
import { getCatalogBooks } from "../src/lib/data/catalog.ts";

const Book = BookRaw.default || BookRaw;
const Category = CategoryRaw.default || CategoryRaw;
const Author = AuthorRaw.default || AuthorRaw;

// Test fixtures
const catTech = {
  _id: new Types.ObjectId("65f0e0000000000000000001"),
  name: "প্রযুক্তি",
  slug: "technology",
  status: "ACTIVE",
};

const catLit = {
  _id: new Types.ObjectId("65f0e0000000000000000002"),
  name: "সাহিত্য",
  slug: "literature",
  status: "ACTIVE",
};

const author1 = {
  _id: new Types.ObjectId("65f0d0000000000000000001"),
  penName: "লেখক এক",
  slug: "author-one",
};

// Fixture books with varied displayOrder, including legacy documents (null / missing)
const bookFeatured1 = {
  _id: new Types.ObjectId("65f0c0000000000000000001"),
  title: "ফিচার্ড বই ১",
  slug: "featured-book-1",
  status: "PUBLISHED",
  price: 200,
  discountPrice: 180,
  currency: "BDT",
  displayOrder: 1, // Admin-featured #1
  createdAt: new Date("2026-01-01T00:00:00Z"),
  author: author1,
  category: catTech,
};

const bookFeatured2 = {
  _id: new Types.ObjectId("65f0c0000000000000000002"),
  title: "ফিচার্ড বই ২",
  slug: "featured-book-2",
  status: "PUBLISHED",
  price: 350,
  discountPrice: null,
  currency: "BDT",
  displayOrder: 2, // Admin-featured #2
  createdAt: new Date("2026-01-02T00:00:00Z"),
  author: author1,
  category: catLit,
};

const bookUnranked = {
  _id: new Types.ObjectId("65f0c0000000000000000003"),
  title: "সাধারণ বই ৩",
  slug: "regular-book-3",
  status: "PUBLISHED",
  price: 150,
  discountPrice: null,
  currency: "BDT",
  displayOrder: 10000, // Standard unranked
  createdAt: new Date("2026-01-10T00:00:00Z"),
  author: author1,
  category: catTech,
};

const bookLegacyNull = {
  _id: new Types.ObjectId("65f0c0000000000000000004"),
  title: "লিগ্যাসি বই ৪ (displayOrder is null)",
  slug: "legacy-book-4",
  status: "PUBLISHED",
  price: 400,
  discountPrice: 300,
  currency: "BDT",
  displayOrder: null, // Legacy with explicit null
  createdAt: new Date("2026-01-15T00:00:00Z"),
  author: author1,
  category: catLit,
};

const bookLegacyMissing = {
  _id: new Types.ObjectId("65f0c0000000000000000005"),
  title: "লিগ্যাসি বই ৫ (no displayOrder field)",
  slug: "legacy-book-5",
  status: "PUBLISHED",
  price: 100,
  discountPrice: null,
  currency: "BDT",
  // displayOrder intentionally undefined (missing field)
  createdAt: new Date("2026-01-20T00:00:00Z"),
  author: author1,
  category: catTech,
};

const bookDraft = {
  _id: new Types.ObjectId("65f0c0000000000000000006"),
  title: "খসড়া বই ৬",
  slug: "draft-book-6",
  status: "DRAFT", // Should never appear in public queries
  price: 250,
  displayOrder: 1,
  createdAt: new Date("2026-01-25T00:00:00Z"),
  author: author1,
  category: catTech,
};

const allBooksFixture = [
  bookFeatured1,
  bookFeatured2,
  bookUnranked,
  bookLegacyNull,
  bookLegacyMissing,
  bookDraft,
];

// Write operation call tracker
let writeCallCounts = {
  updateMany: 0,
  updateOne: 0,
  create: 0,
  bulkWrite: 0,
  deleteMany: 0,
};

describe("BUG-02: Public Read Queries Zero-Write & DisplayOrder Ordering", () => {
  before(() => {
    // Intercept any write operations to strictly verify NO writes are performed
    Book.updateMany = async () => {
      writeCallCounts.updateMany++;
      return { acknowledged: true, modifiedCount: 0 };
    };
    Book.updateOne = async () => {
      writeCallCounts.updateOne++;
      return { acknowledged: true, modifiedCount: 0 };
    };
    Book.create = async () => {
      writeCallCounts.create++;
      throw new Error("UNEXPECTED: Book.create called during public read!");
    };
    Book.bulkWrite = async () => {
      writeCallCounts.bulkWrite++;
      throw new Error("UNEXPECTED: Book.bulkWrite called during public read!");
    };
    Book.deleteMany = async () => {
      writeCallCounts.deleteMany++;
      throw new Error("UNEXPECTED: Book.deleteMany called during public read!");
    };

    // Category findOne mock
    Category.findOne = (query) => ({
      lean: async () => {
        if (query.slug === catTech.slug) return catTech;
        if (query.slug === catLit.slug) return catLit;
        return null;
      },
    });

    // Book countDocuments mock
    Book.countDocuments = async (query) => {
      let filtered = allBooksFixture.filter((b) => b.status === query.status);
      if (query.category) {
        filtered = filtered.filter(
          (b) => String(b.category?._id || b.category) === String(query.category)
        );
      }
      if (query.title?.$regex) {
        const re = new RegExp(query.title.$regex, query.title.$options || "i");
        filtered = filtered.filter((b) => re.test(b.title));
      }
      return filtered.length;
    };

    // Book.populate mock
    Book.populate = async (docs) => {
      return docs.map((doc) => {
        const full = allBooksFixture.find((b) => String(b._id) === String(doc._id));
        return {
          ...doc,
          author: full?.author || null,
          category: full?.category || null,
        };
      });
    };

    // Book.find mock (for getFeaturedBooks and explicit sorts)
    Book.find = (query) => {
      let docs = allBooksFixture.filter((b) => b.status === (query.status || "PUBLISHED"));

      if (query.displayOrder) {
        if (query.displayOrder.$gte !== undefined && query.displayOrder.$lte !== undefined) {
          docs = docs.filter(
            (b) =>
              typeof b.displayOrder === "number" &&
              b.displayOrder >= query.displayOrder.$gte &&
              b.displayOrder <= query.displayOrder.$lte
          );
        }
      }

      if (query.category) {
        docs = docs.filter(
          (b) => String(b.category?._id || b.category) === String(query.category)
        );
      }

      if (query.title?.$regex) {
        const re = new RegExp(query.title.$regex, query.title.$options || "i");
        docs = docs.filter((b) => re.test(b.title));
      }

      let currentSort = {};
      let currentSkip = 0;
      let currentLimit = docs.length;

      const chain = {
        sort: (sortObj) => {
          currentSort = sortObj;
          return chain;
        },
        skip: (n) => {
          currentSkip = n;
          return chain;
        },
        limit: (n) => {
          currentLimit = n;
          return chain;
        },
        populate: () => chain,
        select: () => chain,
        lean: async () => {
          let sorted = [...docs];
          if (currentSort.displayOrder === 1) {
            sorted.sort((a, b) => {
              const ordA = typeof a.displayOrder === "number" ? a.displayOrder : 10000;
              const ordB = typeof b.displayOrder === "number" ? b.displayOrder : 10000;
              if (ordA !== ordB) return ordA - ordB;
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
          } else if (currentSort.price === 1) {
            sorted.sort((a, b) => a.price - b.price);
          } else if (currentSort.price === -1) {
            sorted.sort((a, b) => b.price - a.price);
          } else if (currentSort.title === 1) {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
          } else if (currentSort.createdAt === -1) {
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
          return sorted.slice(currentSkip, currentSkip + currentLimit).map((d) => ({
            _id: d._id,
            title: d.title,
            slug: d.slug,
            coverImage: d.coverImage || null,
            price: d.price,
            discountPrice: d.discountPrice ?? null,
            currency: d.currency,
            createdAt: d.createdAt,
            displayOrder: d.displayOrder,
            author: d.author,
            category: d.category,
          }));
        },
      };

      return chain;
    };

    // Book.aggregate mock (for default featured catalog sort)
    Book.aggregate = async (pipeline) => {
      const matchStage = pipeline.find((s) => s.$match)?.$match || {};
      let docs = allBooksFixture.filter(
        (b) => b.status === (matchStage.status || "PUBLISHED")
      );

      if (matchStage.category) {
        docs = docs.filter(
          (b) => String(b.category?._id || b.category) === String(matchStage.category)
        );
      }

      if (matchStage.title?.$regex) {
        const re = new RegExp(matchStage.title.$regex, matchStage.title.$options || "i");
        docs = docs.filter((b) => re.test(b.title));
      }

      // Simulate $addFields with $ifNull: ["$displayOrder", 10000]
      let enriched = docs.map((b) => ({
        ...b,
        effectiveDisplayOrder:
          typeof b.displayOrder === "number" ? b.displayOrder : 10000,
      }));

      // Simulate $sort: { effectiveDisplayOrder: 1, createdAt: -1, _id: 1 }
      enriched.sort((a, b) => {
        if (a.effectiveDisplayOrder !== b.effectiveDisplayOrder) {
          return a.effectiveDisplayOrder - b.effectiveDisplayOrder;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Simulate $skip and $limit
      const skipStage = pipeline.find((s) => s.$skip)?.$skip || 0;
      const limitStage = pipeline.find((s) => s.$limit)?.$limit || enriched.length;

      return enriched.slice(skipStage, skipStage + limitStage).map((d) => ({
        _id: d._id,
        title: d.title,
        slug: d.slug,
        coverImage: d.coverImage || null,
        price: d.price,
        discountPrice: d.discountPrice ?? null,
        currency: d.currency,
        createdAt: d.createdAt,
        displayOrder: d.displayOrder,
        author: d.author?._id || d.author,
        category: d.category?._id || d.category,
      }));
    };
  });

  beforeEach(() => {
    writeCallCounts = {
      updateMany: 0,
      updateOne: 0,
      create: 0,
      bulkWrite: 0,
      deleteMany: 0,
    };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Zero Database Writes on Public Read Queries
  // ──────────────────────────────────────────────────────────────────────────
  test("Zero-write verification: getFeaturedBooks() never calls Book.updateMany() or writes to DB", async () => {
    const featured = await getFeaturedBooks();

    assert.strictEqual(
      writeCallCounts.updateMany,
      0,
      "getFeaturedBooks must NOT invoke Book.updateMany"
    );
    assert.strictEqual(
      writeCallCounts.updateOne,
      0,
      "getFeaturedBooks must NOT invoke Book.updateOne"
    );
    assert.strictEqual(
      writeCallCounts.bulkWrite,
      0,
      "getFeaturedBooks must NOT invoke Book.bulkWrite"
    );
    assert.ok(Array.isArray(featured), "Returns an array of featured books");
  });

  test("Zero-write verification: getCatalogBooks() default sort never calls Book.updateMany() or writes to DB", async () => {
    const catalog = await getCatalogBooks({});

    assert.strictEqual(
      writeCallCounts.updateMany,
      0,
      "getCatalogBooks default sort must NOT invoke Book.updateMany"
    );
    assert.strictEqual(
      writeCallCounts.updateOne,
      0,
      "getCatalogBooks must NOT invoke Book.updateOne"
    );
    assert.strictEqual(
      writeCallCounts.bulkWrite,
      0,
      "getCatalogBooks must NOT invoke Book.bulkWrite"
    );
    assert.ok(catalog.books.length > 0, "Returns books in catalog");
  });

  test("Zero-write verification: getCatalogBooks() explicit sorts and filters never write to DB", async () => {
    await getCatalogBooks({ sort: "latest" });
    await getCatalogBooks({ sort: "price-asc" });
    await getCatalogBooks({ sort: "price-desc" });
    await getCatalogBooks({ sort: "title-asc" });
    await getCatalogBooks({ category: "technology" });
    await getCatalogBooks({ q: "বই" });

    assert.strictEqual(
      writeCallCounts.updateMany,
      0,
      "All explicit sort and filter variants must NOT invoke Book.updateMany"
    );
    assert.strictEqual(
      writeCallCounts.updateOne,
      0,
      "All explicit sort and filter variants must NOT invoke Book.updateOne"
    );
    assert.strictEqual(
      writeCallCounts.bulkWrite,
      0,
      "All explicit sort and filter variants must NOT invoke Book.bulkWrite"
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Featured Books Ordering & Exclusion Guardrails
  // ──────────────────────────────────────────────────────────────────────────
  test("Featured books: strictly returns admin-featured books in rank order (1, 2) without unranked books", async () => {
    const featured = await getFeaturedBooks();

    assert.strictEqual(featured.length, 2, "Only books with 1 <= displayOrder <= 8 should be featured");
    assert.strictEqual(String(featured[0]._id), String(bookFeatured1._id), "Rank #1 book must be first");
    assert.strictEqual(String(featured[1]._id), String(bookFeatured2._id), "Rank #2 book must be second");

    // Unselected books (displayOrder 10000, null, or missing) must NOT appear in featured section
    const featuredIds = featured.map((b) => b._id);
    assert.strictEqual(featuredIds.includes(String(bookUnranked._id)), false);
    assert.strictEqual(featuredIds.includes(String(bookLegacyNull._id)), false);
    assert.strictEqual(featuredIds.includes(String(bookLegacyMissing._id)), false);
    assert.strictEqual(featuredIds.includes(String(bookDraft._id)), false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Catalog Default Sort: Legacy Records (Null / Missing) Handled Safely
  // ──────────────────────────────────────────────────────────────────────────
  test("Catalog default sort: Featured books (1, 2) appear ahead of legacy records without writes", async () => {
    const result = await getCatalogBooks({});

    assert.ok(result.books.length >= 5, "All published books must be returned");

    // First two books MUST be the explicitly ranked featured books
    assert.strictEqual(
      String(result.books[0]._id),
      String(bookFeatured1._id),
      "Book with displayOrder: 1 must be at index 0"
    );
    assert.strictEqual(
      String(result.books[1]._id),
      String(bookFeatured2._id),
      "Book with displayOrder: 2 must be at index 1"
    );

    // Books with null or missing displayOrder MUST NOT precede explicitly ranked books
    const book0Index = result.books.findIndex((b) => b._id === String(bookFeatured1._id));
    const book1Index = result.books.findIndex((b) => b._id === String(bookFeatured2._id));
    const legacyNullIndex = result.books.findIndex((b) => b._id === String(bookLegacyNull._id));
    const legacyMissingIndex = result.books.findIndex((b) => b._id === String(bookLegacyMissing._id));

    assert.ok(book0Index < legacyNullIndex, "displayOrder: 1 must precede legacy null document");
    assert.ok(book1Index < legacyNullIndex, "displayOrder: 2 must precede legacy null document");
    assert.ok(book0Index < legacyMissingIndex, "displayOrder: 1 must precede legacy missing-field document");
    assert.ok(book1Index < legacyMissingIndex, "displayOrder: 2 must precede legacy missing-field document");
  });

  test("Catalog default sort: Unranked/legacy books sort among themselves by createdAt descending", async () => {
    const result = await getCatalogBooks({});

    // Unranked books: bookLegacyMissing (Jan 20) > bookLegacyNull (Jan 15) > bookUnranked (Jan 10)
    const legacyMissingIndex = result.books.findIndex((b) => b._id === String(bookLegacyMissing._id));
    const legacyNullIndex = result.books.findIndex((b) => b._id === String(bookLegacyNull._id));
    const unrankedIndex = result.books.findIndex((b) => b._id === String(bookUnranked._id));

    assert.ok(
      legacyMissingIndex < legacyNullIndex,
      "Jan 20 legacy book must precede Jan 15 legacy book by createdAt desc"
    );
    assert.ok(
      legacyNullIndex < unrankedIndex,
      "Jan 15 legacy book must precede Jan 10 unranked book by createdAt desc"
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Catalog Explicit Sorts
  // ──────────────────────────────────────────────────────────────────────────
  test("Catalog explicit sort 'latest': orders strictly by createdAt descending", async () => {
    const result = await getCatalogBooks({ sort: "latest" });

    for (let i = 0; i < result.books.length - 1; i++) {
      const cur = new Date(result.books[i].createdAt).getTime();
      const next = new Date(result.books[i + 1].createdAt).getTime();
      assert.ok(cur >= next, `Index ${i} (${cur}) must be >= index ${i + 1} (${next})`);
    }
  });

  test("Catalog explicit sort 'price-asc': orders strictly by price ascending", async () => {
    const result = await getCatalogBooks({ sort: "price-asc" });

    for (let i = 0; i < result.books.length - 1; i++) {
      assert.ok(
        result.books[i].price <= result.books[i + 1].price,
        `Index ${i} price (${result.books[i].price}) must be <= index ${i + 1} (${result.books[i + 1].price})`
      );
    }
  });

  test("Catalog explicit sort 'price-desc': orders strictly by price descending", async () => {
    const result = await getCatalogBooks({ sort: "price-desc" });

    for (let i = 0; i < result.books.length - 1; i++) {
      assert.ok(
        result.books[i].price >= result.books[i + 1].price,
        `Index ${i} price (${result.books[i].price}) must be >= index ${i + 1} (${result.books[i + 1].price})`
      );
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Category Filters, Search & Draft Protection
  // ──────────────────────────────────────────────────────────────────────────
  test("Category filter: only returns published books from specified category", async () => {
    const result = await getCatalogBooks({ category: "technology" });

    assert.strictEqual(result.activeCategoryName, "প্রযুক্তি");
    assert.ok(result.books.length > 0);
    for (const b of result.books) {
      assert.strictEqual(b.categorySlug, "technology");
    }
  });

  test("Search filter: matches book title by case-insensitive regex", async () => {
    const result = await getCatalogBooks({ q: "ফিচার্ড" });

    assert.strictEqual(result.books.length, 2);
    for (const b of result.books) {
      assert.ok(b.title.includes("ফিচার্ড"));
    }
  });

  test("Draft books protection: draft books NEVER appear in public catalog or featured", async () => {
    const catalog = await getCatalogBooks({});
    const featured = await getFeaturedBooks();

    const catalogIds = catalog.books.map((b) => b._id);
    const featuredIds = featured.map((b) => b._id);

    assert.strictEqual(
      catalogIds.includes(String(bookDraft._id)),
      false,
      "Draft book must not appear in public catalog"
    );
    assert.strictEqual(
      featuredIds.includes(String(bookDraft._id)),
      false,
      "Draft book must not appear in featured books"
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Pagination
  // ──────────────────────────────────────────────────────────────────────────
  test("Pagination: correctly limits results per page and calculates totalPages", async () => {
    const page1 = await getCatalogBooks({ page: 1, limit: 2 });
    const page2 = await getCatalogBooks({ page: 2, limit: 2 });

    assert.strictEqual(page1.books.length, 2);
    assert.strictEqual(page2.books.length, 2);
    assert.notStrictEqual(page1.books[0]._id, page2.books[0]._id);
    assert.strictEqual(page1.currentPage, 1);
    assert.strictEqual(page2.currentPage, 2);
    assert.strictEqual(page1.totalCount, 5); // 5 published books
    assert.strictEqual(page1.totalPages, 3); // ceil(5 / 2) = 3
  });
});
