import assert from "node:assert";
import { test, describe, before, beforeEach } from "node:test";
import mongoose, { Types } from "mongoose";

// Ensure test environment is active so session hook is enabled and no live DB is modified
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
import AuthorRaw from "../src/models/Author.ts";
import CategoryRaw from "../src/models/Category.ts";

import { adminReorderBooks, adminSaveFeaturedBooks } from "../src/actions/admin-books.ts";
import { getFeaturedBooks } from "../src/lib/data/homepage.ts";
import { getCatalogBooks } from "../src/lib/data/catalog.ts";

const Book = BookRaw.default || BookRaw;
const Author = AuthorRaw.default || AuthorRaw;
const Category = CategoryRaw.default || CategoryRaw;

// Admin session fixture
const adminUser = {
  id: "65f0a0000000000000000001",
  name: "Super Admin",
  email: "admin@pustoka.test",
  image: null,
  role: "ADMIN",
  status: "ACTIVE",
};

const testCategory1 = {
  _id: new Types.ObjectId("65f0e0000000000000000001"),
  name: "বিজ্ঞান",
  slug: "science",
  status: "ACTIVE",
};

const testCategory2 = {
  _id: new Types.ObjectId("65f0e0000000000000000002"),
  name: "ইতিহাস",
  slug: "history",
  status: "ACTIVE",
};

const testAuthor = {
  _id: new Types.ObjectId("65f0d0000000000000000001"),
  penName: "লেখক এক",
  slug: "author-one",
};

// Create 4 initial featured books
const initialFeaturedBooks = [1, 2, 3, 4].map((rank) => ({
  _id: new Types.ObjectId(`65f0b000000000000000000${rank}`),
  title: `ফিচার্ড বই ${rank}`,
  slug: `featured-book-${rank}`,
  status: "PUBLISHED",
  price: 200 + rank * 10,
  discountPrice: null,
  currency: "BDT",
  displayOrder: rank, // 1, 2, 3, 4
  createdAt: new Date(`2026-01-0${rank}T00:00:00Z`),
  author: testAuthor,
  category: testCategory1,
}));

// Create 15 generic published books
const genericBooks = Array.from({ length: 15 }, (_, i) => {
  const num = i + 1;
  const hexNum = (num + 10).toString(16).padStart(2, "0");
  return {
    _id: new Types.ObjectId(`65f0c00000000000000000${hexNum}`),
    title: `সাধারণ বই ${num}`,
    slug: `generic-book-${num}`,
    status: "PUBLISHED",
    price: 100 + num * 5,
    discountPrice: null,
    currency: "BDT",
    displayOrder: 10000,
    createdAt: new Date(`2026-02-01T0${Math.min(9, num)}:00:00Z`),
    author: testAuthor,
    category: num % 2 === 0 ? testCategory1 : testCategory2,
  };
});

let booksDb = [];

function resetDb() {
  booksDb = [
    ...JSON.parse(JSON.stringify(initialFeaturedBooks)),
    ...JSON.parse(JSON.stringify(genericBooks)),
  ];
}

before(() => {
  // Category.find stub
  Category.find = () => ({
    lean: async () => [testCategory1, testCategory2],
  });

  // Category.findOne stub
  Category.findOne = (query) => {
    const cat = [testCategory1, testCategory2].find((c) => {
      if (query.slug && c.slug !== query.slug) return false;
      if (query._id && String(c._id) !== String(query._id)) return false;
      return true;
    });
    return {
      lean: async () => (cat ? JSON.parse(JSON.stringify(cat)) : null),
    };
  };

  // Book.populate stub
  Book.populate = async (docs) => {
    return docs.map((doc) => {
      const full = booksDb.find((b) => String(b._id) === String(doc._id));
      return {
        ...doc,
        author: full?.author || testAuthor,
        category: full?.category || testCategory1,
      };
    });
  };

  // Book.find stub
  Book.find = (query) => {
    let docs = booksDb.filter((b) => {
      if (query.status && b.status !== query.status) return false;
      if (query._id?.$in) {
        const strIds = query._id.$in.map(String);
        if (!strIds.includes(String(b._id))) return false;
      }
      if (query.displayOrder) {
        if (query.displayOrder.$gte !== undefined && b.displayOrder < query.displayOrder.$gte) {
          return false;
        }
        if (query.displayOrder.$lte !== undefined && b.displayOrder > query.displayOrder.$lte) {
          return false;
        }
      }
      if (query.category) {
        if (String(b.category?._id || b.category) !== String(query.category)) return false;
      }
      if (query.title?.$regex) {
        const re = new RegExp(query.title.$regex, query.title.$options || "i");
        if (!re.test(b.title)) return false;
      }
      return true;
    });

    let currentLimit = docs.length;
    let currentSkip = 0;

    const chain = {
      select: () => chain,
      populate: () => chain,
      sort: (sortObj) => {
        docs = docs.slice().sort((a, b) => {
          for (const [key, dir] of Object.entries(sortObj)) {
            if (key === "displayOrder") {
              const ordA = a.displayOrder ?? 10000;
              const ordB = b.displayOrder ?? 10000;
              if (ordA !== ordB) return (ordA - ordB) * Number(dir);
            } else if (key === "price") {
              if (a.price !== b.price) return (a.price - b.price) * Number(dir);
            } else if (key === "createdAt") {
              const timeA = new Date(a.createdAt).getTime();
              const timeB = new Date(b.createdAt).getTime();
              if (timeA !== timeB) return (timeA - timeB) * Number(dir);
            }
          }
          return 0;
        });
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
      lean: async () => {
        return JSON.parse(JSON.stringify(docs.slice(currentSkip, currentSkip + currentLimit)));
      },
    };
    return chain;
  };

  // Book.countDocuments stub
  Book.countDocuments = async (query) => {
    return booksDb.filter((b) => {
      if (query.status && b.status !== query.status) return false;
      if (query._id?.$in) {
        const strIds = query._id.$in.map(String);
        if (!strIds.includes(String(b._id))) return false;
      }
      return true;
    }).length;
  };

  // Book.updateMany stub
  Book.updateMany = async (filter, update) => {
    let count = 0;
    for (const b of booksDb) {
      let match = true;
      if (filter.displayOrder?.$lte !== undefined && b.displayOrder > filter.displayOrder.$lte) {
        match = false;
      }
      if (filter._id?.$nin) {
        const ninStr = filter._id.$nin.map(String);
        if (ninStr.includes(String(b._id))) {
          match = false;
        }
      }
      if (match) {
        if (update.$set?.displayOrder !== undefined) {
          b.displayOrder = update.$set.displayOrder;
        }
        count++;
      }
    }
    return { matchedCount: count, modifiedCount: count };
  };

  // Book.bulkWrite stub
  Book.bulkWrite = async (operations) => {
    let modified = 0;
    for (const op of operations) {
      if (op.updateOne) {
        const targetId = String(op.updateOne.filter._id);
        const book = booksDb.find((b) => String(b._id) === targetId);
        if (book && op.updateOne.update.$set) {
          Object.assign(book, op.updateOne.update.$set);
          modified++;
        }
      }
    }
    return { matchedCount: modified, modifiedCount: modified };
  };

  // Book.aggregate stub (for catalog default sort)
  Book.aggregate = async (pipeline) => {
    let items = JSON.parse(JSON.stringify(booksDb));
    for (const stage of pipeline) {
      if (stage.$match) {
        items = items.filter((b) => {
          if (stage.$match.status && b.status !== stage.$match.status) return false;
          if (stage.$match.category && String(b.category?._id || b.category) !== String(stage.$match.category)) return false;
          return true;
        });
      }
      if (stage.$addFields?.effectiveDisplayOrder) {
        items = items.map((b) => ({
          ...b,
          effectiveDisplayOrder: typeof b.displayOrder === "number" ? b.displayOrder : 10000,
        }));
      }
      if (stage.$sort) {
        items.sort((a, b) => {
          if (stage.$sort.effectiveDisplayOrder) {
            if (a.effectiveDisplayOrder !== b.effectiveDisplayOrder) {
              return a.effectiveDisplayOrder - b.effectiveDisplayOrder;
            }
          }
          if (stage.$sort.createdAt) {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            if (timeA !== timeB) return (timeA - timeB) * stage.$sort.createdAt;
          }
          return 0;
        });
      }
      if (stage.$limit) {
        items = items.slice(0, stage.$limit);
      }
    }
    return items;
  };
});

beforeEach(() => {
  resetDb();
  globalThis.__TEST_SESSION_USER__ = adminUser;
});

describe("BUG-05: Protect Featured Books Ordering Verification", () => {
  // ────────────────────────────────────────────────────────────────────────
  // Requirement 1: Generic reordering of fewer than eight books does not change homepage featured selections
  // ────────────────────────────────────────────────────────────────────────
  test("1. Generic reordering of fewer than eight books does not change homepage featured selections or order", async () => {
    // Initial verification: 4 featured books exist
    const initialFeatured = await getFeaturedBooks();
    assert.strictEqual(initialFeatured.length, 4, "Initial featured books count must be 4");
    const initialFeaturedIds = initialFeatured.map((b) => b._id);
    assert.deepStrictEqual(
      initialFeaturedIds,
      initialFeaturedBooks.map((b) => String(b._id)),
      "Initial featured sequence must match F1 -> F2 -> F3 -> F4"
    );

    // Perform generic reorder of 3 non-featured books (fewer than 8)
    const booksToReorder = [
      String(genericBooks[2]._id), // G3
      String(genericBooks[0]._id), // G1
      String(genericBooks[1]._id), // G2
    ];

    const result = await adminReorderBooks(booksToReorder);
    assert.strictEqual(result.success, true, "adminReorderBooks must succeed");

    // Homepage featured books check
    const featuredAfter = await getFeaturedBooks();
    assert.strictEqual(featuredAfter.length, 4, "Featured count must remain 4");
    assert.deepStrictEqual(
      featuredAfter.map((b) => b._id),
      initialFeaturedIds,
      "Featured books selection and ranking MUST remain identical after generic reorder"
    );

    // Verify the reordered generic books received orders starting above featured range (>= 9)
    const g3 = booksDb.find((b) => String(b._id) === booksToReorder[0]);
    const g1 = booksDb.find((b) => String(b._id) === booksToReorder[1]);
    const g2 = booksDb.find((b) => String(b._id) === booksToReorder[2]);

    assert.strictEqual(g3?.displayOrder, 9, "First generic book must get displayOrder 9");
    assert.strictEqual(g1?.displayOrder, 10, "Second generic book must get displayOrder 10");
    assert.strictEqual(g2?.displayOrder, 11, "Third generic book must get displayOrder 11");

    // Featured books must not have been reset to 10000
    for (const fBook of initialFeaturedBooks) {
      const doc = booksDb.find((b) => String(b._id) === String(fBook._id));
      assert.strictEqual(doc?.displayOrder, fBook.displayOrder, `Featured book ${fBook.title} rank must not change`);
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 2: Generic reordering of more than eight books does not change homepage featured selections
  // ────────────────────────────────────────────────────────────────────────
  test("2. Generic reordering of more than eight books does not change homepage featured selections", async () => {
    const initialFeatured = await getFeaturedBooks();
    const initialFeaturedIds = initialFeatured.map((b) => b._id);

    // Reorder 12 generic books (more than 8)
    const twelveBooks = genericBooks.slice(0, 12).map((b) => String(b._id));
    assert.strictEqual(twelveBooks.length, 12);

    const result = await adminReorderBooks(twelveBooks);
    assert.strictEqual(result.success, true);

    // Homepage featured books must NOT be overwritten by the first 8 of the 12 generic books!
    const featuredAfter = await getFeaturedBooks();
    assert.strictEqual(featuredAfter.length, 4, "Featured count must strictly remain 4");
    assert.deepStrictEqual(
      featuredAfter.map((b) => b._id),
      initialFeaturedIds,
      "Featured selections must be completely unchanged by reordering >8 books"
    );

    // Verify the 12 generic books received orders 9 through 20
    for (let i = 0; i < twelveBooks.length; i++) {
      const doc = booksDb.find((b) => String(b._id) === twelveBooks[i]);
      assert.strictEqual(doc?.displayOrder, 9 + i, `Generic book #${i} must have displayOrder ${9 + i}`);
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 3: The explicit Featured Books management action can still change the selection and rank
  // ────────────────────────────────────────────────────────────────────────
  test("3. The explicit Featured Books management action (adminSaveFeaturedBooks) can still change selection and rank", async () => {
    // Select 3 new featured books: G1 (#1), G5 (#2), F1 (#3)
    const newFeaturedIds = [
      String(genericBooks[0]._id),
      String(genericBooks[4]._id),
      String(initialFeaturedBooks[0]._id),
    ];

    const result = await adminSaveFeaturedBooks(newFeaturedIds);
    assert.strictEqual(result.success, true, "adminSaveFeaturedBooks must succeed");

    const featuredAfter = await getFeaturedBooks();
    assert.strictEqual(featuredAfter.length, 3, "Featured books count must now be 3");
    assert.deepStrictEqual(
      featuredAfter.map((b) => b._id),
      newFeaturedIds,
      "Featured books must match the new explicit selection and order"
    );

    // Previously featured books F2, F3, F4 must have been reset to 10000
    const f2 = booksDb.find((b) => String(b._id) === String(initialFeaturedBooks[1]._id));
    const f3 = booksDb.find((b) => String(b._id) === String(initialFeaturedBooks[2]._id));
    const f4 = booksDb.find((b) => String(b._id) === String(initialFeaturedBooks[3]._id));
    assert.strictEqual(f2?.displayOrder, 10000);
    assert.strictEqual(f3?.displayOrder, 10000);
    assert.strictEqual(f4?.displayOrder, 10000);
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 4: Homepage featured ordering remains stable after a generic reorder
  // ────────────────────────────────────────────────────────────────────────
  test("4. Homepage featured ordering remains stable after subsequent generic reorders", async () => {
    // Step 1: Explicitly configure featured books
    const explicitFeaturedIds = [
      String(genericBooks[0]._id),
      String(genericBooks[1]._id),
    ];
    await adminSaveFeaturedBooks(explicitFeaturedIds);

    let featured = await getFeaturedBooks();
    assert.strictEqual(featured.length, 2);
    assert.deepStrictEqual(featured.map((b) => b._id), explicitFeaturedIds);

    // Step 2: Perform generic reorder of other books
    const genericReorderIds = [
      String(genericBooks[5]._id),
      String(genericBooks[6]._id),
      String(genericBooks[7]._id),
      String(genericBooks[8]._id),
    ];
    const reorderRes = await adminReorderBooks(genericReorderIds);
    assert.strictEqual(reorderRes.success, true);

    // Step 3: Verify homepage featured books are 100% stable
    featured = await getFeaturedBooks();
    assert.strictEqual(featured.length, 2, "Featured count must still be 2");
    assert.deepStrictEqual(
      featured.map((b) => b._id),
      explicitFeaturedIds,
      "Featured books must remain exactly as explicitly configured"
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // Requirement 5: Public catalog filtering and sorting continue to work
  // ────────────────────────────────────────────────────────────────────────
  test("5. Public catalog default sort, explicit sort, and filters continue to work", async () => {
    // Set 2 generic books into generic ordered sequence
    await adminReorderBooks([String(genericBooks[0]._id), String(genericBooks[1]._id)]);

    // 5a: Default catalog sort: Featured books (1..4) precede generic ordered books (9, 10), which precede unranked (10000)
    const defaultCatalog = await getCatalogBooks({});
    const books = defaultCatalog.books;
    assert.ok(books.length > 5);

    // First 4 must be the featured books in order (1, 2, 3, 4)
    assert.strictEqual(books[0].displayOrder, 1);
    assert.strictEqual(books[1].displayOrder, 2);
    assert.strictEqual(books[2].displayOrder, 3);
    assert.strictEqual(books[3].displayOrder, 4);

    // Next 2 must be the generic reordered books (9, 10)
    assert.strictEqual(books[4].displayOrder, 9);
    assert.strictEqual(books[5].displayOrder, 10);

    // Remaining books have displayOrder 10000
    assert.strictEqual(books[6].displayOrder, 10000);

    // 5b: Category filter
    const cat1Catalog = await getCatalogBooks({ category: testCategory1.slug });
    assert.ok(cat1Catalog.books.length > 0);
    for (const b of cat1Catalog.books) {
      assert.strictEqual(b.categorySlug, testCategory1.slug);
    }

    // 5c: Explicit sort 'price-asc'
    const priceCatalog = await getCatalogBooks({ sort: "price-asc" });
    assert.ok(priceCatalog.books.length > 1);
    for (let i = 0; i < priceCatalog.books.length - 1; i++) {
      assert.ok(priceCatalog.books[i].price <= priceCatalog.books[i + 1].price);
    }
  });
});
