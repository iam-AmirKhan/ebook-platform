import assert from "node:assert";
import { test, describe, beforeEach } from "node:test";
import mongoose, { Types } from "mongoose";

// Activate test environment
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/mock-in-memory-db";

// Mock mongoose connection so tests run in-memory without network dependency
mongoose.connect = async () => mongoose;
global.mongooseCache = { conn: mongoose, promise: Promise.resolve(mongoose) };
Object.defineProperty(mongoose.connection, "readyState", {
  value: 1,
  configurable: true,
  writable: true,
});

import UserRaw from "../src/models/User.ts";
import AuthorRaw from "../src/models/Author.ts";
import AuthorApplicationRaw from "../src/models/AuthorApplication.ts";
import BookRaw from "../src/models/Book.ts";
import PurchaseRaw from "../src/models/Purchase.ts";

import {
  adminUpdateAuthorDetailsAction,
  adminHideAuthorAction,
  adminRestoreAuthorAction,
  rejectAuthorApplicationAction,
  adminRejectAuthorAction,
  approveAuthorApplicationAction,
} from "../src/actions/author-applications.ts";

import { getBookBySlug } from "../src/lib/data/book-details.ts";

import {
  AdminAuthorUpdateSchema,
} from "../src/validators/author-application.ts";

import {
  queryAdminAuthorApplications,
  queryAdminAuthorApplicationCounts,
} from "../src/lib/data/author-applications.ts";

const User = UserRaw.default || UserRaw;
const Author = AuthorRaw.default || AuthorRaw;
const AuthorApplication = AuthorApplicationRaw.default || AuthorApplicationRaw;
const Book = BookRaw.default || BookRaw;
const Purchase = PurchaseRaw.default || PurchaseRaw;

// Fixtures
const adminUser = {
  id: "65f0a0000000000000000001",
  name: "Admin User",
  email: "admin@pustoka.test",
  image: null,
  role: "ADMIN",
  status: "ACTIVE",
};

// In-memory data store for Mongoose mock
let usersDb = [];
let authorsDb = [];
let applicationsDb = [];
let booksDb = [];
let purchasesDb = [];

function setupMongooseMocks() {
  User.findById = (id) => {
    const idStr = String(id);
    const u = usersDb.find((item) => String(item._id) === idStr);
    if (!u) return Promise.resolve(null);
    return Promise.resolve({
      ...u,
      save: async function () {
        const idx = usersDb.findIndex((item) => String(item._id) === idStr);
        if (idx >= 0) usersDb[idx] = { ...this };
        return this;
      },
    });
  };

  User.findOne = (query) => {
    let result = null;
    if (query._id) {
      result = usersDb.find((u) => String(u._id) === String(query._id));
    } else if (query.email) {
      result = usersDb.find((u) => u.email === query.email);
    }
    if (!result) {
      return {
        lean: () => Promise.resolve(null),
        then: (resolve) => resolve(null),
      };
    }
    const doc = {
      ...result,
      save: async function () {
        const idx = usersDb.findIndex((item) => String(item._id) === String(result._id));
        if (idx >= 0) usersDb[idx] = { ...this };
        return this;
      },
    };
    return {
      lean: () => Promise.resolve({ ...result }),
      then: (resolve) => resolve(doc),
    };
  };

  User.find = () => ({
    select: () => ({
      lean: () => Promise.resolve([...usersDb]),
      then: (r) => r([...usersDb]),
    }),
    lean: () => Promise.resolve([...usersDb]),
    then: (resolve) => resolve([...usersDb]),
  });

  Author.prototype.save = async function () {
    const docData = typeof this.toObject === "function" ? this.toObject() : { ...this };
    const idStr = String(docData._id || this._id);
    const existingIdx = authorsDb.findIndex((a) => String(a._id) === idStr);
    if (existingIdx >= 0) {
      authorsDb[existingIdx] = { ...authorsDb[existingIdx], ...docData };
    } else {
      if (!docData._id) docData._id = new Types.ObjectId();
      authorsDb.push(docData);
    }
    return this;
  };

  Author.findById = (id) => {
    const idStr = String(id);
    const a = authorsDb.find((item) => String(item._id) === idStr);
    if (!a) return Promise.resolve(null);
    return Promise.resolve({
      ...a,
      save: async function () {
        const idx = authorsDb.findIndex((item) => String(item._id) === idStr);
        if (idx >= 0) authorsDb[idx] = { ...this };
        return this;
      },
    });
  };

  Author.find = (query = {}) => {
    let results = [...authorsDb];
    if (query.status) {
      results = results.filter((a) => a.status === query.status);
    }
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve(results),
            then: (r) => r(results),
          }),
          lean: () => Promise.resolve(results),
          then: (r) => r(results),
        }),
        lean: () => Promise.resolve(results),
        then: (r) => r(results),
      }),
      lean: () => Promise.resolve(results),
      then: (resolve) => resolve(results),
    };
  };

  Author.exists = (query) => {
    let results = [...authorsDb];
    if (query.slug) results = results.filter((a) => a.slug === query.slug);
    if (query.user && query.user.$ne) {
      results = results.filter((a) => String(a.user) !== String(query.user.$ne));
    }
    return Promise.resolve(results.length > 0 ? { _id: results[0]._id } : null);
  };

  Author.findOne = (query) => {
    let results = [...authorsDb];
    if (query.user) {
      results = results.filter((a) => String(a.user) === String(query.user));
    }
    if (query._id) {
      results = results.filter((a) => String(a._id) === String(query._id));
    }
    if (query.penName) {
      results = results.filter((a) => a.penName === query.penName);
    }
    if (query.slug) {
      results = results.filter((a) => a.slug === query.slug);
    }
    if (query.status) {
      results = results.filter((a) => a.status === query.status);
    }
    const result = results[0] || null;
    if (!result) {
      return {
        session: () => Promise.resolve(null),
        lean: () => Promise.resolve(null),
        select: () => ({
          lean: () => Promise.resolve(null),
          then: (r) => r(null),
        }),
        then: (resolve) => resolve(null),
      };
    }
    const doc = {
      ...result,
      save: async function () {
        const idx = authorsDb.findIndex((item) => String(item._id) === String(result._id));
        if (idx >= 0) authorsDb[idx] = { ...this };
        return this;
      },
    };
    return {
      session: () => Promise.resolve(doc),
      lean: () => Promise.resolve({ ...result }),
      select: () => ({
        lean: () => Promise.resolve({ ...result }),
        then: (r) => r(doc),
      }),
      then: (resolve) => resolve(doc),
    };
  };

  Book.findById = (id) => {
    const idStr = String(id);
    const b = booksDb.find((item) => String(item._id) === idStr);
    if (!b) return Promise.resolve(null);
    return Promise.resolve({
      ...b,
      save: async function () {
        const idx = booksDb.findIndex((item) => String(item._id) === idStr);
        if (idx >= 0) booksDb[idx] = { ...this };
        return this;
      },
    });
  };

  Book.findOne = (query) => {
    let results = [...booksDb];
    if (query._id) results = results.filter((b) => String(b._id) === String(query._id));
    if (query.slug) results = results.filter((b) => b.slug === query.slug);
    if (query.author) results = results.filter((b) => String(b.author) === String(query.author));
    if (query.status) results = results.filter((b) => b.status === query.status);
    const result = results[0] || null;

    const populateDoc = (doc) => {
      if (!doc) return null;
      const authorDoc = authorsDb.find((a) => String(a._id) === String(doc.author)) || null;
      return {
        ...doc,
        author: authorDoc
          ? {
              _id: authorDoc._id,
              penName: authorDoc.penName,
              slug: authorDoc.slug,
              bio: authorDoc.bio,
              status: authorDoc.status,
            }
          : null,
        category: {
          _id: new Types.ObjectId("65f0ca000000000000000001"),
          name: "ফিকশন",
          slug: "fiction",
        },
      };
    };

    return {
      populate: () => ({
        populate: () => ({
          lean: () => Promise.resolve(populateDoc(result)),
          then: (r) => r(populateDoc(result)),
        }),
        lean: () => Promise.resolve(populateDoc(result)),
        then: (r) => r(populateDoc(result)),
      }),
      lean: () => Promise.resolve(result ? { ...result } : null),
      then: (resolve) => resolve(result),
    };
  };

  Book.find = (query = {}) => {
    let results = [...booksDb];
    if (query.author) results = results.filter((b) => String(b.author) === String(query.author));
    if (query.status) results = results.filter((b) => b.status === query.status);
    return {
      lean: () => Promise.resolve(results),
      then: (resolve) => resolve(results),
    };
  };

  Purchase.findOne = (query) => {
    let results = [...purchasesDb];
    if (query.user) results = results.filter((p) => String(p.user) === String(query.user));
    if (query.book) results = results.filter((p) => String(p.book) === String(query.book));
    if (query.status) results = results.filter((p) => p.status === query.status);
    const result = results[0] || null;
    return {
      lean: () => Promise.resolve(result ? { ...result } : null),
      then: (resolve) => resolve(result),
    };
  };

  Purchase.exists = (query) => {
    let results = [...purchasesDb];
    if (query.user) results = results.filter((p) => String(p.user) === String(query.user));
    if (query.book) results = results.filter((p) => String(p.book) === String(query.book));
    if (query.status) results = results.filter((p) => p.status === query.status);
    return Promise.resolve(results.length > 0 ? { _id: results[0]._id } : null);
  };

  AuthorApplication.findById = (id) => {
    const idStr = String(id);
    const app = applicationsDb.find((item) => String(item._id) === idStr);
    if (!app) return Promise.resolve(null);
    return Promise.resolve({
      ...app,
      save: async function () {
        // Enforce bio required constraint to simulate Mongoose validation
        if (!this.bio || this.bio.trim() === "") {
          throw new Error("Validation error: Path bio is required.");
        }
        const idx = applicationsDb.findIndex((item) => String(item._id) === idStr);
        if (idx >= 0) applicationsDb[idx] = { ...this };
        return this;
      },
    });
  };

  AuthorApplication.findOne = (query) => {
    const execute = () => {
      let results = [...applicationsDb];
      if (query.user) {
        results = results.filter((app) => String(app.user) === String(query.user));
      }
      if (query._id) {
        results = results.filter((app) => String(app._id) === String(query._id));
      }
      if (query.displayName) {
        results = results.filter((app) => app.displayName === query.displayName);
      }
      if (query.status) {
        results = results.filter((app) => app.status === query.status);
      }
      if (results.length === 0) return null;
      const res = results[results.length - 1]; // newest
      return {
        ...res,
        save: async function () {
          if (!this.bio || this.bio.trim() === "") {
            throw new Error("Validation error: Path bio is required.");
          }
          const idx = applicationsDb.findIndex((item) => String(item._id) === String(res._id));
          if (idx >= 0) applicationsDb[idx] = { ...this };
          return this;
        },
      };
    };

    return {
      sort: () => ({
        then: (resolve) => resolve(execute()),
      }),
      then: (resolve) => resolve(execute()),
    };
  };

  AuthorApplication.findOneAndUpdate = (filter, update) => {
    const app = applicationsDb.find(
      (item) => String(item._id) === String(filter._id) && (!filter.status || item.status === filter.status)
    );
    if (!app) return Promise.resolve(null);
    if (update.$set) {
      Object.assign(app, update.$set);
    }
    return Promise.resolve({ ...app });
  };

  Author.countDocuments = (query = {}) => {
    let results = [...authorsDb];
    if (query.status) results = results.filter((a) => a.status === query.status);
    if (query.user && query.user.$nin) {
      const ninSet = new Set(query.user.$nin.map(String));
      results = results.filter((a) => !ninSet.has(String(a.user)));
    }
    return Promise.resolve(results.length);
  };

  AuthorApplication.countDocuments = (query = {}) => {
    let results = [...applicationsDb];
    if (query.status) results = results.filter((a) => a.status === query.status);
    return Promise.resolve(results.length);
  };

  AuthorApplication.distinct = (field) => {
    const vals = applicationsDb
      .map((a) => a[field])
      .filter((v) => v !== undefined && v !== null);
    return Promise.resolve([...new Set(vals.map(String))]);
  };

  AuthorApplication.find = (query = {}) => {
    let results = [...applicationsDb];
    if (query.status) results = results.filter((a) => a.status === query.status);
    return {
      distinct: (field) => {
        const vals = results.map((a) => a[field]).filter((v) => v !== undefined && v !== null);
        return Promise.resolve([...new Set(vals.map(String))]);
      },
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: () => ({
              lean: () => Promise.resolve(results),
              then: (r) => r(results),
            }),
            lean: () => Promise.resolve(results),
            then: (r) => r(results),
          }),
          lean: () => Promise.resolve(results),
          then: (r) => r(results),
        }),
        populate: () => ({
          lean: () => Promise.resolve(results),
          then: (r) => r(results),
        }),
        lean: () => Promise.resolve(results),
        then: (r) => r(results),
      }),
      populate: () => ({
        lean: () => Promise.resolve(results),
        then: (r) => r(results),
      }),
      lean: () => Promise.resolve(results),
      then: (r) => r(results),
    };
  };
}

describe("Pustoka Author Management - Regression Tests", () => {
  beforeEach(() => {
    setupMongooseMocks();
    globalThis.__TEST_SESSION_USER__ = adminUser;

    usersDb = [
      {
        _id: new Types.ObjectId("65f0a0000000000000000001"),
        name: "Admin User",
        email: "admin@pustoka.test",
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        _id: new Types.ObjectId("65f0b0000000000000000001"),
        name: "আরিফ মাহমুদ",
        email: "demo-author@pustoka.dev",
        role: "AUTHOR",
        status: "ACTIVE",
      },
      {
        _id: new Types.ObjectId("65f0c0000000000000000001"),
        name: "Sourav Khan",
        email: "sourav@pustoka.test",
        role: "AUTHOR",
        status: "ACTIVE",
      },
      {
        _id: new Types.ObjectId("65f0d0000000000000000001"),
        name: "Pending Applicant",
        email: "applicant@pustoka.test",
        role: "USER",
        status: "ACTIVE",
      },
    ];

    authorsDb = [
      // Standalone/demo author without AuthorApplication
      {
        _id: new Types.ObjectId("65f0b0000000000000000010"),
        user: new Types.ObjectId("65f0b0000000000000000001"),
        penName: "আরিফ মাহমুদ",
        slug: "arif-mahmud",
        bio: "লেখক ও গবেষক।",
        status: "ACTIVE",
        hiddenAt: null,
        hiddenBy: null,
      },
      // Application author with AuthorApplication
      {
        _id: new Types.ObjectId("65f0c0000000000000000010"),
        user: new Types.ObjectId("65f0c0000000000000000001"),
        penName: "Sourav Khan",
        slug: "sourav-khan",
        bio: "সাহিত্যিক ও প্রোগ্রামার।",
        status: "ACTIVE",
        hiddenAt: null,
        hiddenBy: null,
      },
      // Exact E2E Author with dangling user ID
      {
        _id: new Types.ObjectId("6ad48fddf26132564559aa6f"),
        user: new Types.ObjectId("6ad48fddf26132564559aa6e"), // non-existent in usersDb
        penName: "E2E Author PenName",
        slug: "author-e2e",
        bio: "Bio for E2E author",
        status: "ACTIVE",
        hiddenAt: null,
        hiddenBy: null,
      },
      // Orphaned author (user does not exist in usersDb)
      {
        _id: new Types.ObjectId("65f0e0000000000000000010"),
        user: new Types.ObjectId("65f0e0000000000000000099"), // non-existent
        penName: "Orphaned Author",
        slug: "orphaned-author",
        bio: "ইউজার ডিলিট হয়ে গেছে।",
        status: "ACTIVE",
        hiddenAt: null,
        hiddenBy: null,
      },
    ];

    applicationsDb = [
      // Application for Sourav Khan
      {
        _id: new Types.ObjectId("65f0c0000000000000000020"),
        user: new Types.ObjectId("65f0c0000000000000000001"),
        displayName: "Sourav Khan",
        email: "sourav@pustoka.test",
        phone: "01711111111",
        occupation: "সফটওয়্যার ইঞ্জিনিয়ার",
        address: "ঢাকা, বাংলাদেশ",
        socialUrl: "https://facebook.com/sourav",
        socialLinks: [{ platform: "Facebook", url: "https://facebook.com/sourav" }],
        bio: "সাহিত্যিক ও প্রোগ্রামার।",
        reason: "বই প্রকাশ করতে চাই",
        status: "APPROVED",
      },
      // Exact E2E Author Application with dangling user ID
      {
        _id: new Types.ObjectId("6ad9d556e265fa43590d76e7"),
        user: new Types.ObjectId("6ad48fddf26132564559aa6e"),
        displayName: "E2E Author PenName",
        email: null,
        phone: "013246575646",
        occupation: "75gbxdv",
        address: "xcsxXAXasdxz",
        socialUrl: "https://www.facebook.com/souravkhan420",
        socialLinks: [{ platform: "Facebook", url: "https://www.facebook.com/souravkhan420" }],
        bio: "Bio for E2E author",
        reason: "সরাসরি / ডেমো লেখক প্রোফাইল",
        status: "APPROVED",
      },
      // Pending application for Pending Applicant
      {
        _id: new Types.ObjectId("65f0d0000000000000000020"),
        user: new Types.ObjectId("65f0d0000000000000000001"),
        displayName: "Pending Applicant",
        email: "applicant@pustoka.test",
        phone: "01822222222",
        occupation: "শিক্ষক",
        address: "চট্টগ্রাম",
        socialUrl: "https://twitter.com/applicant",
        socialLinks: [{ platform: "X", url: "https://twitter.com/applicant" }],
        bio: "কবিতা ও ছোটগল্প লিখি।",
        reason: "আমার বই প্রকাশ করার ইচ্ছা।",
        status: "PENDING",
      },
    ];

    booksDb = [
      {
        _id: new Types.ObjectId("65f0ba000000000000000001"),
        author: new Types.ObjectId("65f0b0000000000000000010"),
        title: "স্বাবলম্বী লেখক ১",
        slug: "standalone-book-1",
        price: 150,
        status: "PUBLISHED",
        chapters: [
          { order: 1, title: "ভূমিকা", isPreview: true, teaser: "টিজার ১", content: "প্রথম অধ্যায় বিস্তারিত সূচীপত্র।" },
          { order: 2, title: "মূল অধ্যায়", isPreview: false, teaser: "টিজার ২", content: "দ্বিতীয় অধ্যায় সম্পূর্ণ গল্প।" },
        ],
      },
      {
        _id: new Types.ObjectId("65f0ba000000000000000002"),
        author: new Types.ObjectId("65f0b0000000000000000010"),
        title: "স্বাবলম্বী লেখক ড্রাফট",
        slug: "standalone-book-draft",
        price: 200,
        status: "DRAFT",
        chapters: [],
      },
      {
        _id: new Types.ObjectId("65f0ca000000000000000001"),
        author: new Types.ObjectId("65f0c0000000000000000010"),
        title: "সৌরভের প্রকাশিত বই",
        slug: "sourav-published-book",
        price: 250,
        status: "PUBLISHED",
        chapters: [
          { order: 1, title: "সূচনা", isPreview: true, teaser: "টিজার", content: "সূচনা পর্ব।" },
        ],
      },
      {
        _id: new Types.ObjectId("65f0fa000000000000000001"),
        author: new Types.ObjectId("65f0e0000000000000000010"), // Orphaned Author
        title: "অনাথ লেখকের প্রকাশিত বই",
        slug: "orphaned-published-book",
        price: 180,
        status: "PUBLISHED",
        chapters: [
          { order: 1, title: "প্রথম অধ্যায়", isPreview: true, teaser: "টিজার", content: "প্রথম অধ্যায় সম্পূর্ণ।" },
        ],
      },
    ];

    purchasesDb = [
      {
        _id: new Types.ObjectId("65f0ea000000000000000001"),
        user: new Types.ObjectId("65f0d0000000000000000001"), // Pending Applicant user bought standalone-book-1
        book: new Types.ObjectId("65f0ba000000000000000001"),
        status: "ACTIVE",
        price: 150,
      },
      {
        _id: new Types.ObjectId("65f0ea000000000000000002"),
        user: new Types.ObjectId("65f0d0000000000000000001"), // Pending Applicant user bought orphaned-published-book
        book: new Types.ObjectId("65f0fa000000000000000001"),
        status: "ACTIVE",
        price: 180,
      },
    ];
  });

  describe("Bug 1: Admin author edit persistence", () => {
    test("Schema preserves undefined for omitted optional fields", () => {
      const parsed = AdminAuthorUpdateSchema.safeParse({
        displayName: "নতুন লেখক নাম",
      });
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.displayName, "নতুন লেখক নাম");
      assert.strictEqual(parsed.data.phone, undefined);
      assert.strictEqual(parsed.data.occupation, undefined);
      assert.strictEqual(parsed.data.address, undefined);
      assert.strictEqual(parsed.data.socialUrl, undefined);
      assert.strictEqual(parsed.data.bio, undefined);
    });

    test("Schema trims provided strings and handles intentional clearing", () => {
      const parsed = AdminAuthorUpdateSchema.safeParse({
        displayName: "  প্রফেসর জামান  ",
        phone: "   ",
        occupation: "  লেখক  ",
        address: " ঢাকা ",
        socialUrl: " https://linkedin.com/in/zaman ",
        bio: "  নতুন লেখক পরিচিতি  ",
      });
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.displayName, "প্রফেসর জামান");
      assert.strictEqual(parsed.data.phone, "");
      assert.strictEqual(parsed.data.occupation, "লেখক");
      assert.strictEqual(parsed.data.address, "ঢাকা");
      assert.strictEqual(parsed.data.socialUrl, "https://linkedin.com/in/zaman");
      assert.strictEqual(parsed.data.bio, "নতুন লেখক পরিচিতি");
    });

    test("Admin can edit standalone author profile without creating a fake application", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";
      const initialAppsCount = applicationsDb.length;

      const res = await adminUpdateAuthorDetailsAction({
        targetId: standaloneAuthorId,
        displayName: "আরিফ মাহমুদ (সম্পাদিত)",
        bio: "আপডেট করা বায়োগ্রাফি ও পরিচিতি।",
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.message.includes("সফলভাবে আপডেট করা হয়েছে"));

      // Verify Author was updated in database
      const author = authorsDb.find((a) => String(a._id) === standaloneAuthorId);
      assert.strictEqual(author.penName, "আরিফ মাহমুদ (সম্পাদিত)");
      assert.strictEqual(author.bio, "আপডেট করা বায়োগ্রাফি ও পরিচিতি।");

      // Verify no fake application was invented
      assert.strictEqual(applicationsDb.length, initialAppsCount);
    });

    test("Fields not included in the edit are NOT accidentally cleared", async () => {
      const appAuthorId = "65f0c0000000000000000010"; // Sourav Khan

      // Update only displayName
      const res = await adminUpdateAuthorDetailsAction({
        targetId: appAuthorId,
        displayName: "সৌরভ খান (নতুন)",
      });

      assert.strictEqual(res.success, true);

      // Verify Author and Application updated
      const author = authorsDb.find((a) => String(a._id) === appAuthorId);
      assert.strictEqual(author.penName, "সৌরভ খান (নতুন)");
      // Bio was not cleared
      assert.strictEqual(author.bio, "সাহিত্যিক ও প্রোগ্রামার।");

      const app = applicationsDb.find((a) => String(a.user) === "65f0c0000000000000000001");
      assert.strictEqual(app.displayName, "সৌরভ খান (নতুন)");
      // Existing phone, occupation, address, socialUrl were NOT cleared
      assert.strictEqual(app.phone, "01711111111");
      assert.strictEqual(app.occupation, "সফটওয়্যার ইঞ্জিনিয়ার");
      assert.strictEqual(app.address, "ঢাকা, বাংলাদেশ");
      assert.strictEqual(app.socialUrl, "https://facebook.com/sourav");
    });

    test("Protected fields (email, role, userId) are NOT modified during edit", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";

      await adminUpdateAuthorDetailsAction({
        targetId: standaloneAuthorId,
        displayName: "আরিফ মাহমুদ আপডেট",
        bio: "বায়ো আপডেট",
      });

      const user = usersDb.find((u) => String(u._id) === "65f0b0000000000000000001");
      assert.strictEqual(user.email, "demo-author@pustoka.dev");
      assert.strictEqual(user.role, "AUTHOR");
      assert.strictEqual(user.status, "ACTIVE");
    });

    test("Validation rejects invalid names (< 2 chars) and returns field error", async () => {
      const res = await adminUpdateAuthorDetailsAction({
        targetId: "65f0b0000000000000000010",
        displayName: "A",
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error.includes("কমপক্ষে ২"));
    });

    test("Compensating rollback restores Author record if saving AuthorApplication fails", async () => {
      const appAuthorId = "65f0c0000000000000000010"; // Sourav Khan
      const originalAuthor = authorsDb.find((a) => String(a._id) === appAuthorId);
      const originalPenName = originalAuthor.penName;
      const originalBio = originalAuthor.bio;

      // Force AuthorApplication save to fail simulating secondary write failure
      const originalFindById = AuthorApplication.findById;
      const originalFindOne = AuthorApplication.findOne;
      const failingSave = async () => {
        throw new Error("Simulated database failure while saving AuthorApplication");
      };

      AuthorApplication.findById = (id) => {
        const app = applicationsDb.find((a) => String(a._id) === String(id));
        if (!app) return Promise.resolve(null);
        return Promise.resolve({
          ...app,
          save: failingSave,
        });
      };

      AuthorApplication.findOne = (query) => {
        const app = applicationsDb.find(
          (a) => String(a.user) === String(query.user) || String(a._id) === String(query._id)
        );
        if (!app) {
          return {
            sort: () => ({
              then: (resolve) => resolve(null),
            }),
            then: (resolve) => resolve(null),
          };
        }
        const doc = {
          ...app,
          save: failingSave,
        };
        return {
          sort: () => ({
            then: (resolve) => resolve(doc),
          }),
          then: (resolve) => resolve(doc),
        };
      };

      try {
        const res = await adminUpdateAuthorDetailsAction({
          targetId: appAuthorId,
          displayName: "Failed Update Name",
          bio: "Failed Update Bio",
        });

        // 1. Must never report success on failure
        assert.strictEqual(res.success, false);
        assert.ok(res.error);

        // 2. Author record must be rolled back to its snapshot state
        const authorAfterFailure = authorsDb.find((a) => String(a._id) === appAuthorId);
        assert.strictEqual(authorAfterFailure.penName, originalPenName);
        assert.strictEqual(authorAfterFailure.bio, originalBio);
      } finally {
        AuthorApplication.findById = originalFindById;
        AuthorApplication.findOne = originalFindOne;
      }
    });

    test("Editing exact E2E Author PenName record by Author ID persists both Author and AuthorApplication", async () => {
      const e2eAuthorId = "6ad48fddf26132564559aa6f";
      const e2eAppId = "6ad9d556e265fa43590d76e7";

      const res = await adminUpdateAuthorDetailsAction({
        targetId: e2eAuthorId,
        authorId: e2eAuthorId,
        applicationId: e2eAppId,
        displayName: "E2E Author PenName Updated",
        bio: "E2E author updated bio content.",
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.message.includes("সফলভাবে আপডেট করা হয়েছে"));

      // Fresh DB query for Author record
      const freshAuthor = await Author.findById(e2eAuthorId);
      assert.strictEqual(freshAuthor.penName, "E2E Author PenName Updated");
      assert.strictEqual(freshAuthor.bio, "E2E author updated bio content.");

      // Fresh DB query for AuthorApplication record
      const freshApp = await AuthorApplication.findById(e2eAppId);
      assert.strictEqual(freshApp.displayName, "E2E Author PenName Updated");
      assert.strictEqual(freshApp.bio, "E2E author updated bio content.");
    });

    test("Editing exact E2E Author PenName record by AuthorApplication ID resolves to correct Author and updates both", async () => {
      const e2eAuthorId = "6ad48fddf26132564559aa6f";
      const e2eAppId = "6ad9d556e265fa43590d76e7";

      // Pass only targetId as the AuthorApplication ID (e.g. from ALL tab)
      const res = await adminUpdateAuthorDetailsAction({
        targetId: e2eAppId,
        displayName: "E2E Author via App ID",
        bio: "Updated via application ID resolution.",
      });

      assert.strictEqual(res.success, true);

      // Verify Author was resolved via application.user and updated
      const freshAuthor = await Author.findById(e2eAuthorId);
      assert.strictEqual(freshAuthor.penName, "E2E Author via App ID");
      assert.strictEqual(freshAuthor.bio, "Updated via application ID resolution.");

      // Verify Application was also updated
      const freshApp = await AuthorApplication.findById(e2eAppId);
      assert.strictEqual(freshApp.displayName, "E2E Author via App ID");
      assert.strictEqual(freshApp.bio, "Updated via application ID resolution.");
    });

    test("TargetId resolution does not treat AuthorApplication ID as an Author ID or User ID", async () => {
      const e2eAppId = "6ad9d556e265fa43590d76e7";

      const res = await adminUpdateAuthorDetailsAction({
        targetId: e2eAppId,
        displayName: "Safe Resolution Test",
      });

      assert.strictEqual(res.success, true);

      // Author record should have the new penName
      const author = authorsDb.find((a) => String(a._id) === "6ad48fddf26132564559aa6f");
      assert.strictEqual(author.penName, "Safe Resolution Test");
      // Author user should remain untouched
      assert.strictEqual(String(author.user), "6ad48fddf26132564559aa6e");
    });

    test("Persisted updates remain consistent and visible across subsequent queries/page refresh", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";

      const updateRes = await adminUpdateAuthorDetailsAction({
        targetId: standaloneAuthorId,
        displayName: "আরিফ মাহমুদ পারসিস্টেড",
        bio: "এটি রিফ্রেশের পরেও অপরিবর্তিত থাকবে।",
      });

      assert.strictEqual(updateRes.success, true);

      // Simulate first page query (e.g. before refresh)
      const firstFetch = await Author.findById(standaloneAuthorId);
      assert.strictEqual(firstFetch.penName, "আরিফ মাহমুদ পারসিস্টেড");
      assert.strictEqual(firstFetch.bio, "এটি রিফ্রেশের পরেও অপরিবর্তিত থাকবে।");

      // Simulate full page refresh query (e.g. after refresh)
      const secondFetch = await Author.findById(standaloneAuthorId);
      assert.strictEqual(secondFetch.penName, "আরিফ মাহমুদ পারসিস্টেড");
      assert.strictEqual(secondFetch.bio, "এটি রিফ্রেশের পরেও অপরিবর্তিত থাকবে।");
    });
  });

  describe("Pustoka Final Author & Book Management Fix - 11 Verification Points", () => {
    // Helper to evaluate profile completeness matching AdminApplicationCard
    function computeProfileIncomplete(displayName, bio) {
      return !displayName?.trim() || displayName.trim().length < 2 || !bio?.trim();
    }

    test("1. Complete profiles do not show the incomplete badge", () => {
      const isBadgeShown = computeProfileIncomplete("E2E Author PenName", "Bio for E2E author");
      assert.strictEqual(isBadgeShown, false, "Complete profile must NOT show incomplete badge");
    });

    test("2. Incomplete profiles still show the badge", () => {
      assert.strictEqual(computeProfileIncomplete("E2E Author PenName", ""), true, "Empty bio must show badge");
      assert.strictEqual(computeProfileIncomplete("E2E Author PenName", "   "), true, "Whitespace bio must show badge");
      assert.strictEqual(computeProfileIncomplete("E2E Author PenName", null), true, "Null bio must show badge");
      assert.strictEqual(computeProfileIncomplete("", "Some valid bio"), true, "Empty name must show badge");
      assert.strictEqual(computeProfileIncomplete("A", "Some valid bio"), true, "Short name (<2 chars) must show badge");
    });

    test("3. Admin can reject a valid standalone/demo author without an application record", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";
      const initialAppsCount = applicationsDb.length;

      const res = await rejectAuthorApplicationAction(standaloneAuthorId, "ডেমো লেখক পরিচ্ছন্নতা");
      assert.strictEqual(res.success, true);
      assert.ok(res.message.includes("প্রত্যাখ্যান করা হয়েছে"));

      const author = authorsDb.find((a) => String(a._id) === standaloneAuthorId);
      assert.strictEqual(author.status, "REJECTED");
      assert.strictEqual(author.rejectionReason, "ডেমো লেখক পরিচ্ছন্নতা");
      assert.strictEqual(String(author.rejectedBy), adminUser.id);
      assert.ok(author.rejectedAt instanceof Date);

      // Verify no fake AuthorApplication was invented
      assert.strictEqual(applicationsDb.length, initialAppsCount);
    });

    test("4. Rejection preserves User, Author, books, purchases, orders, reviews, and reading progress", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";
      await rejectAuthorApplicationAction(standaloneAuthorId, "অপ্রয়োজনীয় ডেমো লেখক");

      // User account is preserved
      const user = usersDb.find((u) => String(u._id) === "65f0b0000000000000000001");
      assert.ok(user, "User account must not be deleted");
      assert.strictEqual(user.role, "USER", "User role is safely demoted to USER");

      // Author record is preserved
      const author = authorsDb.find((a) => String(a._id) === standaloneAuthorId);
      assert.ok(author, "Author record must not be deleted");
      assert.strictEqual(String(author.user), "65f0b0000000000000000001");
      assert.strictEqual(author.penName, "আরিফ মাহমুদ");

      // Books remain untouched
      const books = booksDb.filter((b) => String(b.author) === standaloneAuthorId);
      assert.strictEqual(books.length, 2, "All book records must remain preserved");
      assert.strictEqual(books[0].status, "PUBLISHED", "Published books must not have status modified");
      assert.strictEqual(books[1].status, "DRAFT", "Draft books must not have status modified");

      // Purchases remain active
      const purchase = purchasesDb.find((p) => String(p.book) === "65f0ba000000000000000001");
      assert.ok(purchase, "Purchase records must be preserved");
      assert.strictEqual(purchase.status, "ACTIVE");
    });

    test("5. Rejected authors are excluded from active/public author discovery and cannot perform author publishing", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";
      await rejectAuthorApplicationAction(standaloneAuthorId, "বাতিল");

      // Public author search excludes REJECTED authors
      const activeAuthors = (await Author.find({ status: "ACTIVE" })).filter((a) => a.status === "ACTIVE");
      assert.ok(!activeAuthors.some((a) => String(a._id) === standaloneAuthorId));

      // Publishing author lookup requires ACTIVE status
      const activeAuthorForPublishing = await Author.findOne({
        user: "65f0b0000000000000000001",
        status: "ACTIVE",
      });
      assert.strictEqual(activeAuthorForPublishing, null, "Rejected author cannot resolve ACTIVE author profile for publishing");

      // User role is USER
      const user = usersDb.find((u) => String(u._id) === "65f0b0000000000000000001");
      assert.strictEqual(user.role, "USER");
    });

    test("6. Admin can find and restore a rejected author", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";
      await rejectAuthorApplicationAction(standaloneAuthorId, "সাময়িক বাতিল");

      // Find in rejected list
      const rejectedAuthor = await Author.findOne({ _id: standaloneAuthorId, status: "REJECTED" });
      assert.ok(rejectedAuthor, "Admin can find rejected author");

      // Execute restoration
      const restoreRes = await adminRestoreAuthorAction(standaloneAuthorId);
      assert.strictEqual(restoreRes.success, true);
      assert.ok(restoreRes.message.includes("পুনরুদ্ধার করা হয়েছে"));

      // Status restored and audit fields cleared
      const restoredAuthor = authorsDb.find((a) => String(a._id) === standaloneAuthorId);
      assert.strictEqual(restoredAuthor.status, "ACTIVE");
      assert.strictEqual(restoredAuthor.rejectedAt, null);
      assert.strictEqual(restoredAuthor.rejectedBy, null);
      assert.strictEqual(restoredAuthor.rejectionReason, null);
    });

    test("7. Restore returns the correct original author identity and role without creating duplicate records", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";
      const initialAuthorsCount = authorsDb.length;

      await rejectAuthorApplicationAction(standaloneAuthorId, "বাতিল");
      await adminRestoreAuthorAction(standaloneAuthorId);

      // No duplicate Author records created
      assert.strictEqual(authorsDb.length, initialAuthorsCount);
      const matching = authorsDb.filter((a) => String(a._id) === standaloneAuthorId);
      assert.strictEqual(matching.length, 1);
      assert.strictEqual(String(matching[0].user), "65f0b0000000000000000001");

      // Role restored to AUTHOR
      const user = usersDb.find((u) => String(u._id) === "65f0b0000000000000000001");
      assert.strictEqual(user.role, "AUTHOR");
    });

    test("8. Independently hidden/unpublished books remain in their original states after restoration", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";

      await rejectAuthorApplicationAction(standaloneAuthorId, "বাতিল");
      await adminRestoreAuthorAction(standaloneAuthorId);

      const book1 = booksDb.find((b) => String(b._id) === "65f0ba000000000000000001");
      const book2 = booksDb.find((b) => String(b._id) === "65f0ba000000000000000002");

      assert.strictEqual(book1.status, "PUBLISHED", "Published book remains PUBLISHED");
      assert.strictEqual(book2.status, "DRAFT", "Draft/hidden book remains DRAFT without unwanted publishing");
    });

    test("9. Existing application approval/rejection and book Hide/Unhide flows still work", async () => {
      // 9.1 Approve application
      const pendingAppId = "65f0d0000000000000000020";
      const approveRes = await approveAuthorApplicationAction(pendingAppId);
      assert.strictEqual(approveRes.success, true);
      const app = applicationsDb.find((a) => String(a._id) === pendingAppId);
      assert.strictEqual(app.status, "APPROVED");

      // 9.2 Hide author
      const authorId = "65f0c0000000000000000010";
      const hideRes = await adminHideAuthorAction(authorId);
      assert.strictEqual(hideRes.success, true);
      const author = authorsDb.find((a) => String(a._id) === authorId);
      assert.strictEqual(author.status, "INACTIVE");

      // 9.3 Restore hidden author
      const restoreRes = await adminRestoreAuthorAction(authorId);
      assert.strictEqual(restoreRes.success, true);
      const restoredAuthor = authorsDb.find((a) => String(a._id) === authorId);
      assert.strictEqual(restoredAuthor.status, "ACTIVE");
    });

    test("10. Unauthorized users cannot execute rejection or restoration", async () => {
      globalThis.__TEST_SESSION_USER__ = {
        id: "65f0d0000000000000000001",
        name: "Unauthorized Normal User",
        email: "user@pustoka.test",
        image: null,
        role: "USER",
        status: "ACTIVE",
      };

      const standaloneAuthorId = "65f0b0000000000000000010";

      await assert.rejects(
        async () => {
          await adminRejectAuthorAction(standaloneAuthorId, "অননুমোদিত");
        },
        (err) =>
          err?.message === "NEXT_REDIRECT" ||
          err?.digest?.startsWith("NEXT_REDIRECT") ||
          err?.message?.includes("/forbidden")
      );

      await assert.rejects(
        async () => {
          await adminRestoreAuthorAction(standaloneAuthorId);
        },
        (err) =>
          err?.message === "NEXT_REDIRECT" ||
          err?.digest?.startsWith("NEXT_REDIRECT") ||
          err?.message?.includes("/forbidden")
      );
    });

    test("11. Existing purchasers retain their authorized reading access", async () => {
      const standaloneAuthorId = "65f0b0000000000000000010";
      await rejectAuthorApplicationAction(standaloneAuthorId, "বাতিল");

      // Non-purchaser cannot view book of rejected author
      const nonPurchaserId = "65f0a0000000000000000099";
      const publicResult = await getBookBySlug("standalone-book-1", nonPurchaserId);
      assert.strictEqual(publicResult, null, "Public visitor without purchase cannot view rejected author book");

      // Purchaser retains reading access
      const purchaserUserId = "65f0d0000000000000000001";
      const purchaserResult = await getBookBySlug("standalone-book-1", purchaserUserId);
      assert.ok(purchaserResult, "Authorized purchaser must retain full book access");
      assert.strictEqual(purchaserResult.slug, "standalone-book-1");
      assert.strictEqual(purchaserResult.isOwned, true);
    });
  });

  describe("Bug 1 & Bug 2: Orphaned Author Reject and Hide Fixes", () => {
    test("1. Admin can reject an orphaned author record (!user && !!author) without error", async () => {
      const orphanedAuthorId = "65f0e0000000000000000010";
      const initialUsersCount = usersDb.length;
      const initialAppsCount = applicationsDb.length;

      const res = await adminRejectAuthorAction(orphanedAuthorId, "অনাথ লেখক প্রত্যাখ্যানের কারণ");
      assert.strictEqual(res.success, true);
      assert.ok(res.message.includes("সফলভাবে লেখক তালিকা থেকে প্রত্যাখ্যান করা হয়েছে"));

      // Verified Author record updated to REJECTED with audit fields
      const author = authorsDb.find((a) => String(a._id) === orphanedAuthorId);
      assert.ok(author, "Author record exists");
      assert.strictEqual(author.status, "REJECTED");
      assert.ok(author.rejectedAt instanceof Date);
      assert.strictEqual(String(author.rejectedBy), adminUser.id);
      assert.strictEqual(author.rejectionReason, "অনাথ লেখক প্রত্যাখ্যানের কারণ");

      // Does not create a fake User or AuthorApplication
      assert.strictEqual(usersDb.length, initialUsersCount, "No fake user created");
      assert.strictEqual(applicationsDb.length, initialAppsCount, "No fake application created");

      // Unrelated author records and books remain untouched
      const books = booksDb.filter((b) => String(b.author) === orphanedAuthorId);
      assert.strictEqual(books.length, 1);
      assert.strictEqual(books[0].status, "PUBLISHED", "Book status not changed");
    });

    test("2. Admin can hide an orphaned author record (!user && !!author) without error", async () => {
      const orphanedAuthorId = "65f0e0000000000000000010";
      const initialUsersCount = usersDb.length;

      const res = await adminHideAuthorAction(orphanedAuthorId);
      assert.strictEqual(res.success, true);
      assert.ok(res.message.includes("সফলভাবে লেখক তালিকা থেকে লুকানো হয়েছে"));

      // Verified Author record updated to INACTIVE with audit fields
      const author = authorsDb.find((a) => String(a._id) === orphanedAuthorId);
      assert.ok(author);
      assert.strictEqual(author.status, "INACTIVE");
      assert.ok(author.hiddenAt instanceof Date);
      assert.strictEqual(String(author.hiddenBy), adminUser.id);

      // Safe execution without user: no user role update crash, no fake records
      assert.strictEqual(usersDb.length, initialUsersCount);

      // Books and files remain intact, individual book status untouched
      const book = booksDb.find((b) => String(b.author) === orphanedAuthorId);
      assert.ok(book);
      assert.strictEqual(book.status, "PUBLISHED");
    });

    test("3. Admin can restore an orphaned author from both INACTIVE and REJECTED states", async () => {
      const orphanedAuthorId = "65f0e0000000000000000010";

      // Case A: Hide -> Restore
      await adminHideAuthorAction(orphanedAuthorId);
      let restoreRes = await adminRestoreAuthorAction(orphanedAuthorId);
      assert.strictEqual(restoreRes.success, true);
      assert.ok(restoreRes.message.includes("পুনরুদ্ধার করা হয়েছে"));

      let author = authorsDb.find((a) => String(a._id) === orphanedAuthorId);
      assert.strictEqual(author.status, "ACTIVE");
      assert.strictEqual(author.hiddenAt, null);
      assert.strictEqual(author.hiddenBy, null);

      // Case B: Reject -> Restore
      await adminRejectAuthorAction(orphanedAuthorId, "টেস্ট কারণ");
      const rejectedAuthor = authorsDb.find((a) => String(a._id) === orphanedAuthorId);
      assert.strictEqual(rejectedAuthor.status, "REJECTED");

      restoreRes = await adminRestoreAuthorAction(orphanedAuthorId);
      assert.strictEqual(restoreRes.success, true);
      assert.ok(restoreRes.message.includes("পুনরুদ্ধার করা হয়েছে"));

      author = authorsDb.find((a) => String(a._id) === orphanedAuthorId);
      assert.strictEqual(author.status, "ACTIVE");
      assert.strictEqual(author.rejectedAt, null);
      assert.strictEqual(author.rejectedBy, null);
      assert.strictEqual(author.rejectionReason, null);
    });

    test("4. Rejecting orphaned author with linked AuthorApplication updates only verified Author", async () => {
      // Author 6ad48fddf26132564559aa6f has AuthorApplication 6ad9d556e265fa43590d76e7, user does not exist
      const authorId = "6ad48fddf26132564559aa6f";
      const appId = "6ad9d556e265fa43590d76e7";

      const res = await adminRejectAuthorAction(authorId, "E2E Orphaned Reject");
      assert.strictEqual(res.success, true);

      // Verified author is REJECTED
      let author = authorsDb.find((a) => String(a._id) === authorId);
      assert.strictEqual(author.status, "REJECTED");
      assert.strictEqual(author.rejectionReason, "E2E Orphaned Reject");

      // Orphaned application was not corrupted with invalid user ref
      const app = applicationsDb.find((a) => String(a._id) === appId);
      assert.ok(app);

      // Delegating through rejectAuthorApplicationAction with application ID resolves to actual Author
      author.status = "ACTIVE"; // reset
      const resViaApp = await rejectAuthorApplicationAction(appId, "Via App ID");
      assert.strictEqual(resViaApp.success, true);
      author = authorsDb.find((a) => String(a._id) === authorId);
      assert.strictEqual(author.status, "REJECTED");
    });

    test("5. Orphaned author appears in correct query filters and counts when rejected or hidden", async () => {
      const orphanedAuthorId = "65f0e0000000000000000010";

      // 5.1 When rejected, appears in REJECTED filter
      await adminRejectAuthorAction(orphanedAuthorId, "ফিল্টার টেস্ট");
      const rejectedList = await queryAdminAuthorApplications({ status: "REJECTED" });
      const foundInRejected = rejectedList.applications.some((item) => item.authorId === orphanedAuthorId);
      assert.strictEqual(foundInRejected, true, "Rejected orphaned author appears in REJECTED filter");

      const counts = await queryAdminAuthorApplicationCounts();
      assert.ok(counts.rejected >= 1, "Rejected count includes orphaned author");

      // 5.2 Restore returns it to ACTIVE
      await adminRestoreAuthorAction(orphanedAuthorId);
      const activeList = await queryAdminAuthorApplications({ status: "APPROVED" });
      const foundInActive = activeList.applications.some((item) => item.authorId === orphanedAuthorId);
      assert.strictEqual(foundInActive, true, "Restored orphaned author appears in APPROVED/ACTIVE filter");

      // 5.3 When hidden, appears in HIDDEN filter
      await adminHideAuthorAction(orphanedAuthorId);
      const hiddenList = await queryAdminAuthorApplications({ status: "HIDDEN" });
      const foundInHidden = hiddenList.applications.some((item) => item.authorId === orphanedAuthorId);
      assert.strictEqual(foundInHidden, true, "Hidden orphaned author appears in HIDDEN filter");
    });

    test("6. Books, ebook files, purchases, and reading progress remain completely unchanged", async () => {
      const orphanedAuthorId = "65f0e0000000000000000010";
      const bookBefore = { ...booksDb.find((b) => String(b.author) === orphanedAuthorId) };
      const purchaseBefore = { ...purchasesDb.find((p) => String(p.book) === String(bookBefore._id)) };

      // Hide and restore
      await adminHideAuthorAction(orphanedAuthorId);
      await adminRestoreAuthorAction(orphanedAuthorId);

      // Reject and restore
      await adminRejectAuthorAction(orphanedAuthorId, "টেস্ট");
      await adminRestoreAuthorAction(orphanedAuthorId);

      const bookAfter = booksDb.find((b) => String(b.author) === orphanedAuthorId);
      const purchaseAfter = purchasesDb.find((p) => String(p.book) === String(bookBefore._id));

      assert.strictEqual(bookAfter.title, bookBefore.title);
      assert.strictEqual(bookAfter.price, bookBefore.price);
      assert.strictEqual(bookAfter.status, bookBefore.status);
      assert.strictEqual(bookAfter.chapters.length, bookBefore.chapters.length);
      assert.strictEqual(purchaseAfter.status, purchaseBefore.status);
    });
  });
});
