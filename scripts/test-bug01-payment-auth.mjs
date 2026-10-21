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
import OrderRaw from "../src/models/Order.ts";
import PlatformSettingsRaw from "../src/models/PlatformSettings.ts";

import {
  createManualOrderAction,
  createMultiBookOrderAction,
  validateCartAction,
} from "../src/actions/payments.ts";

const Book = BookRaw.default || BookRaw;
const Purchase = PurchaseRaw.default || PurchaseRaw;
const Order = OrderRaw.default || OrderRaw;
const PlatformSettings = PlatformSettingsRaw.default || PlatformSettingsRaw;

// Test user fixtures
const userAlice = {
  id: "65f0a0000000000000000001",
  name: "Alice Reader",
  email: "alice@pustoka.test",
  image: null,
  role: "USER",
  status: "ACTIVE",
};

const userBob = {
  id: "65f0b0000000000000000002",
  name: "Bob Reader",
  email: "bob@pustoka.test",
  image: null,
  role: "USER",
  status: "ACTIVE",
};

// Test book fixtures
const book1 = {
  _id: new Types.ObjectId("65f0c0000000000000000010"),
  title: "হাতে কলমে জাভাস্ক্রিপ্ট",
  slug: "learn-javascript",
  status: "PUBLISHED",
  price: 250,
  discountPrice: 200,
  currency: "BDT",
  coverImage: "/images/js.jpg",
  author: { penName: "জাভাস্ক্রিপ্ট লেখক" },
};

const book2 = {
  _id: new Types.ObjectId("65f0c0000000000000000020"),
  title: "পাইথন প্রোগ্রামিং",
  slug: "learn-python",
  status: "PUBLISHED",
  price: 300,
  discountPrice: null,
  currency: "BDT",
  coverImage: "/images/python.jpg",
  author: { penName: "পাইথন লেখক" },
};

// In-memory state tracking to ensure ZERO mutations to external DB
let createdOrders = [];
let activePurchases = [];

describe("BUG-01: Payment Server Action Authorization & IDOR Protection", () => {
  before(() => {
    // Stub Book queries in-memory
    Book.findOne = (query) => ({
      lean: async () => {
        const idStr = String(query._id);
        if (idStr === String(book1._id) && query.status === book1.status) return book1;
        if (idStr === String(book2._id) && query.status === book2.status) return book2;
        return null;
      },
    });

    Book.find = (query) => {
      const ids = (query._id?.$in || []).map((id) => String(id));
      const results = [];
      if (ids.includes(String(book1._id))) results.push(book1);
      if (ids.includes(String(book2._id))) results.push(book2);

      const chain = {
        populate: () => chain,
        select: () => chain,
        lean: async () => results,
      };
      return chain;
    };

    // Stub Purchase queries in-memory
    Purchase.findOne = (query) => ({
      lean: async () => {
        const userIdStr = String(query.user);
        const bookIdStr = String(query.book);
        const match = activePurchases.find(
          (p) =>
            String(p.user) === userIdStr &&
            String(p.book) === bookIdStr &&
            p.status === query.status
        );
        return match || null;
      },
    });

    Purchase.find = (query) => {
      const userIdStr = String(query.user);
      const bookIds = (query.book?.$in || []).map((b) => String(b));
      const matches = activePurchases.filter(
        (p) =>
          String(p.user) === userIdStr &&
          bookIds.includes(String(p.book)) &&
          p.status === query.status
      );

      const chain = {
        select: () => chain,
        lean: async () => matches,
      };
      return chain;
    };

    // Stub PlatformSettings query
    PlatformSettings.findOne = () => ({
      lean: async () => ({
        bkashEnabled: true,
        nagadEnabled: true,
        bkashAccountNumber: "01712345678",
        nagadAccountNumber: "01812345678",
      }),
    });

    // Stub Order queries and creation in-memory (ZERO DB MUTATION)
    Order.findOne = (query) => {
      let result = null;
      if (query.transactionId) {
        const dup = createdOrders.find(
          (o) =>
            o.transactionId === query.transactionId &&
            ["PENDING", "PAID"].includes(o.status)
        );
        result = dup || null;
      }
      const queryObj = {
        lean: async () => result,
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
      return queryObj;
    };

    Order.create = async (doc) => {
      const record = {
        _id: new Types.ObjectId(),
        ...doc,
      };
      createdOrders.push(record);
      return record;
    };
  });

  beforeEach(() => {
    createdOrders = [];
    activePurchases = [];
    globalThis.__TEST_SESSION_USER__ = undefined;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Signature Verification: overrideUserId removed from exported actions
  // ──────────────────────────────────────────────────────────────────────────
  test("Action signatures: insecure overrideUserId parameter is completely removed", () => {
    // createManualOrderAction(_prevState, formData) -> length <= 2
    assert.strictEqual(
      createManualOrderAction.length <= 2,
      true,
      "createManualOrderAction must not declare an overrideUserId parameter"
    );

    // createMultiBookOrderAction(_prevState, formData) -> length <= 2
    assert.strictEqual(
      createMultiBookOrderAction.length <= 2,
      true,
      "createMultiBookOrderAction must not declare an overrideUserId parameter"
    );

    // validateCartAction(bookIds) -> length <= 1
    assert.strictEqual(
      validateCartAction.length <= 1,
      true,
      "validateCartAction must not declare an overrideUserId parameter"
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Unauthenticated user cannot create an order
  // ──────────────────────────────────────────────────────────────────────────
  test("Unauthenticated user: cannot create a single-book manual order", async () => {
    globalThis.__TEST_SESSION_USER__ = null;

    const formData = new FormData();
    formData.set("bookId", String(book1._id));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "01712345678");
    formData.set("transactionId", "TX123456");

    const result = await createManualOrderAction(null, formData);

    assert.strictEqual(result.success, false);
    assert.ok(
      result.error?.includes("সাইন ইন"),
      "Error must inform user to sign in first"
    );
    assert.strictEqual(createdOrders.length, 0, "No order must be created in database");
  });

  test("Unauthenticated user: cannot create a multi-book order", async () => {
    globalThis.__TEST_SESSION_USER__ = null;

    const formData = new FormData();
    formData.set("bookIdsJson", JSON.stringify([String(book1._id), String(book2._id)]));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "01712345678");
    formData.set("transactionId", "TXMULTI123456");

    const result = await createMultiBookOrderAction(null, formData);

    assert.strictEqual(result.success, false);
    assert.ok(
      result.error?.includes("সাইন ইন"),
      "Error must inform user to sign in first"
    );
    assert.strictEqual(createdOrders.length, 0, "No order must be created in database");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Authenticated user can submit their own valid order
  // ──────────────────────────────────────────────────────────────────────────
  test("Authenticated user: can submit their own valid single-book order", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    const formData = new FormData();
    formData.set("bookId", String(book1._id));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "01712345678");
    formData.set("transactionId", "TXALICE01");

    const result = await createManualOrderAction(null, formData);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.amount, 200, "Should use effective discount price");
    assert.strictEqual(createdOrders.length, 1);

    const created = createdOrders[0];
    assert.strictEqual(
      String(created.user),
      userAlice.id,
      "Order user MUST match authenticated session user (Alice)"
    );
    assert.strictEqual(created.status, "PENDING");
    assert.strictEqual(created.total, 200);
  });

  test("Authenticated user: can submit their own valid multi-book order", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    const formData = new FormData();
    formData.set("bookIdsJson", JSON.stringify([String(book1._id), String(book2._id)]));
    formData.set("paymentMethod", "NAGAD");
    formData.set("senderNumber", "01812345678");
    formData.set("transactionId", "TXALICE02");

    const result = await createMultiBookOrderAction(null, formData);

    assert.strictEqual(result.success, true);
    // Effective prices: book1 (discount 200) + book2 (price 300) = 500
    assert.strictEqual(result.amount, 500, "Server price calculation must be exact");
    assert.strictEqual(result.itemCount, 2);
    assert.strictEqual(createdOrders.length, 1);

    const created = createdOrders[0];
    assert.strictEqual(
      String(created.user),
      userAlice.id,
      "Order user MUST match authenticated session user (Alice)"
    );
    assert.strictEqual(created.status, "PENDING");
    assert.strictEqual(created.total, 500);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Supplying another user's ID cannot impersonate that user (IDOR Defense)
  // ──────────────────────────────────────────────────────────────────────────
  test("IDOR Defense: Supplying victim userId in formData cannot impersonate victim in single-book order", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    // Attacker Alice tries to submit an order spoofing Bob's ID via form fields
    const formData = new FormData();
    formData.set("bookId", String(book1._id));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "01712345678");
    formData.set("transactionId", "TXALICESPOOF01");
    // Injected client parameters attempting IDOR
    formData.set("userId", userBob.id);
    formData.set("overrideUserId", userBob.id);

    const result = await createManualOrderAction(null, formData);

    assert.strictEqual(result.success, true);
    assert.strictEqual(createdOrders.length, 1);

    const created = createdOrders[0];
    assert.notStrictEqual(
      String(created.user),
      userBob.id,
      "Order must NEVER be created under victim user (Bob)"
    );
    assert.strictEqual(
      String(created.user),
      userAlice.id,
      "Order must be bound exclusively to the authenticated session identity (Alice)"
    );
  });

  test("IDOR Defense: Supplying victim userId in formData cannot impersonate victim in multi-book order", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    const formData = new FormData();
    formData.set("bookIdsJson", JSON.stringify([String(book1._id), String(book2._id)]));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "01712345678");
    formData.set("transactionId", "TXALICESPOOF02");
    // Injected client parameters attempting IDOR
    formData.set("userId", userBob.id);
    formData.set("overrideUserId", userBob.id);

    const result = await createMultiBookOrderAction(null, formData);

    assert.strictEqual(result.success, true);
    assert.strictEqual(createdOrders.length, 1);

    const created = createdOrders[0];
    assert.notStrictEqual(
      String(created.user),
      userBob.id,
      "Order must NEVER be created under victim user (Bob)"
    );
    assert.strictEqual(
      String(created.user),
      userAlice.id,
      "Order must be bound exclusively to the authenticated session identity (Alice)"
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Cart validation privacy: cannot reveal another user's purchase information
  // ──────────────────────────────────────────────────────────────────────────
  test("Cart Validation Privacy: Unauthenticated user cannot inspect any user's purchase data", async () => {
    globalThis.__TEST_SESSION_USER__ = null;

    // Bob owns Book 1
    activePurchases = [
      {
        user: new Types.ObjectId(userBob.id),
        book: book1._id,
        status: "ACTIVE",
      },
    ];

    const result = await validateCartAction([String(book1._id), String(book2._id)]);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.items.length, 2);
    // Crucial: unauthenticated user must NOT see Bob's ownership of Book 1
    assert.deepStrictEqual(
      result.ownedBookIds,
      [],
      "Unauthenticated cart validation must not leak any owned books"
    );
    assert.strictEqual(result.items[0].isOwned, false);
    assert.strictEqual(result.items[1].isOwned, false);
  });

  test("Cart Validation Privacy: Authenticated user cannot pass another user's ID to reveal purchases", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    // Bob owns Book 1. Alice owns nothing.
    activePurchases = [
      {
        user: new Types.ObjectId(userBob.id),
        book: book1._id,
        status: "ACTIVE",
      },
    ];

    // Alice attempts to pass Bob's user ID as second argument (attempted IDOR)
    const result = await validateCartAction(
      [String(book1._id), String(book2._id)],
      userBob.id // Passed as 2nd argument (ignored)
    );

    assert.strictEqual(result.success, true);
    // Crucial: result must reflect Alice's purchases only (which is empty)
    assert.deepStrictEqual(
      result.ownedBookIds,
      [],
      "Cart validation must NEVER use client-supplied user ID; must not leak Bob's purchases to Alice"
    );
    assert.strictEqual(result.items[0].isOwned, false);
  });

  test("Cart Validation Privacy: Authenticated user correctly receives their own purchase info", async () => {
    globalThis.__TEST_SESSION_USER__ = userBob;

    // Bob owns Book 1
    activePurchases = [
      {
        user: new Types.ObjectId(userBob.id),
        book: book1._id,
        status: "ACTIVE",
      },
    ];

    const result = await validateCartAction([String(book1._id), String(book2._id)]);

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(
      result.ownedBookIds,
      [String(book1._id)],
      "Bob must see Book 1 identified as already owned"
    );
    assert.strictEqual(result.items.find((i) => i.bookId === String(book1._id))?.isOwned, true);
    assert.strictEqual(result.items.find((i) => i.bookId === String(book2._id))?.isOwned, false);
    // Grand total should only include unowned Book 2 (300 BDT)
    assert.strictEqual(result.grandTotal, 300);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Existing checkout flows & guardrails still work
  // ──────────────────────────────────────────────────────────────────────────
  test("Checkout guardrail: Duplicate TrxID across any order is rejected", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    // Pre-populate an order with this transaction ID
    createdOrders = [
      {
        _id: new Types.ObjectId(),
        transactionId: "TXDUPLICATE1",
        status: "PENDING",
      },
    ];

    const formData = new FormData();
    formData.set("bookId", String(book1._id));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "01712345678");
    formData.set("transactionId", "TXDUPLICATE1");

    const result = await createManualOrderAction(null, formData);

    assert.strictEqual(result.success, false);
    assert.ok(
      result.error?.includes("ইতিমধ্যে ব্যবহৃত"),
      "Must reject duplicate transaction ID"
    );
  });

  test("Checkout guardrail: Invalid phone number format is rejected", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    const formData = new FormData();
    formData.set("bookId", String(book1._id));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "12345"); // invalid phone
    formData.set("transactionId", "TXVALID123");

    const result = await createManualOrderAction(null, formData);

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("১১ ডিজিটের"), "Must reject invalid phone format");
  });

  test("Checkout guardrail: Invalid TrxID format is rejected", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    const formData = new FormData();
    formData.set("bookId", String(book1._id));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "01712345678");
    formData.set("transactionId", "BAD!@#"); // invalid chars

    const result = await createManualOrderAction(null, formData);

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("TrxID"), "Must reject invalid TrxID format");
  });

  test("Checkout guardrail: Purchasing already owned book is rejected", async () => {
    globalThis.__TEST_SESSION_USER__ = userAlice;

    // Alice already owns Book 1
    activePurchases = [
      {
        user: new Types.ObjectId(userAlice.id),
        book: book1._id,
        status: "ACTIVE",
      },
    ];

    const formData = new FormData();
    formData.set("bookId", String(book1._id));
    formData.set("paymentMethod", "BKASH");
    formData.set("senderNumber", "01712345678");
    formData.set("transactionId", "TXALICENEW");

    const result = await createManualOrderAction(null, formData);

    assert.strictEqual(result.success, false);
    assert.ok(
      result.error?.includes("ইতিমধ্যে এই বইটি কিনেছেন"),
      "Must reject purchase of already owned book"
    );
  });
});
