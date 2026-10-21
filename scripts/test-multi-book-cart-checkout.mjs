import assert from "node:assert";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import mongoose, { Types } from "mongoose";

loadEnvConfig(process.cwd());

import UserRaw from "../src/models/User.ts";
import BookRaw from "../src/models/Book.ts";
import PurchaseRaw from "../src/models/Purchase.ts";
import OrderRaw from "../src/models/Order.ts";
import FinancialLedgerRaw from "../src/models/FinancialLedger.ts";
import AuthorRaw from "../src/models/Author.ts";
import CategoryRaw from "../src/models/Category.ts";
import PlatformSettingsRaw from "../src/models/PlatformSettings.ts";

import {
  createManualOrderAction,
  createMultiBookOrderAction,
  validateCartAction,
} from "../src/actions/payments.ts";
import { recordVerifiedSale, rejectPendingOrder } from "../src/lib/services/finance.ts";

const User = UserRaw.default || UserRaw;
const Book = BookRaw.default || BookRaw;
const Purchase = PurchaseRaw.default || PurchaseRaw;
const Order = OrderRaw.default || OrderRaw;
const FinancialLedger = FinancialLedgerRaw.default || FinancialLedgerRaw;
const Author = AuthorRaw.default || AuthorRaw;
const Category = CategoryRaw.default || CategoryRaw;
const PlatformSettings = PlatformSettingsRaw.default || PlatformSettingsRaw;

async function runTestSuite() {
  console.log("==================================================================");
  console.log("=== RUNNING SUITE: MULTI-BOOK CART & SINGLE-PAYMENT CHECKOUT ===");
  console.log("==================================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Ensure active category & author exist
  let author = await Author.findOne().lean();
  let category = await Category.findOne().lean();

  if (!author) {
    const authorUser = await User.create({
      name: "Test Author User",
      email: `author_${Date.now()}@pustoka.test`,
      passwordHash: "dummy",
      role: "AUTHOR",
      status: "ACTIVE",
    });
    author = await Author.create({
      user: authorUser._id,
      penName: "টেস্ট লেখক",
      slug: `test-author-${Date.now()}`,
      bio: "টেস্ট বায়ো",
      isApproved: true,
    });
  }

  if (!category) {
    category = await Category.create({
      name: "সাহিত্য",
      slug: `literature-${Date.now()}`,
      description: "সাহিত্য বিষয়ক বই",
      isActive: true,
    });
  }

  // Ensure PlatformSettings has manual payments enabled
  await PlatformSettings.findOneAndUpdate(
    {},
    {
      commissionPercent: 15,
      bkashEnabled: true,
      nagadEnabled: true,
      bkashAccountNumber: "01700000000",
      nagadAccountNumber: "01800000000",
    },
    { upsert: true }
  );

  // 2. Ensure at least 10 published books exist for testing
  let publishedBooks = await Book.find({ status: "PUBLISHED" }).lean();
  if (publishedBooks.length < 10) {
    const needed = 10 - publishedBooks.length;
    console.log(`Seeding ${needed} additional test books to reach 10 published books...`);
    for (let i = 0; i < needed; i++) {
      await Book.create({
        title: `পরীক্ষামূলক বই #${publishedBooks.length + i + 1}`,
        slug: `test-book-${Date.now()}-${i}`,
        author: author._id,
        category: category._id,
        price: 150 + i * 20,
        discountPrice: i % 2 === 0 ? 120 + i * 20 : null,
        currency: "BDT",
        summary: "পরীক্ষামূলক বইয়ের সারসংক্ষেপ",
        description: "সম্পূর্ণ বিবরণ",
        learningOutcomes: ["পয়েন্ট ১", "পয়েন্ট ২"],
        chapters: [
          { order: 1, title: "প্রথম অধ্যায়", content: "ভূমিকা ও প্রথম অধ্যায়", teaser: "টিজার ১", isPreview: true },
          { order: 2, title: "দ্বিতীয় অধ্যায়", content: "গোপন ও সংরক্ষিত অধ্যায়", teaser: "টিজার ২", isPreview: false },
        ],
        status: "PUBLISHED",
      });
    }
    publishedBooks = await Book.find({ status: "PUBLISHED" }).lean();
  }

  console.log(`Available published books for tests: ${publishedBooks.length}`);

  // 3. Create test users
  const adminUser = await User.create({
    name: "Finance Admin Verifier",
    email: `finance_admin_${Date.now()}@pustoka.test`,
    passwordHash: "dummy",
    role: "ADMIN",
    status: "ACTIVE",
  });

  const buyer = await User.create({
    name: "Multi-Book Buyer",
    email: `buyer_${Date.now()}@pustoka.test`,
    passwordHash: "dummy",
    role: "USER",
    status: "ACTIVE",
  });

  const otherReader = await User.create({
    name: "Other Reader",
    email: `other_reader_${Date.now()}@pustoka.test`,
    passwordHash: "dummy",
    role: "USER",
    status: "ACTIVE",
  });

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: Server Validation (validateCartAction)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 1] Server-side Cart Validation ---");

    const sampleBooks = publishedBooks.slice(0, 3);
    const sampleIds = sampleBooks.map((b) => String(b._id));
    const fakeId = new Types.ObjectId().toString();

    const valResult = await validateCartAction([...sampleIds, fakeId], String(buyer._id));
    assert.strictEqual(valResult.success, true);
    assert.strictEqual(valResult.items.length, 3, "Should return 3 valid books.");
    assert.strictEqual(valResult.unavailableBookIds.length, 1, "Should flag the fake ID as unavailable.");
    assert.strictEqual(valResult.unavailableBookIds[0], fakeId);
    assert.strictEqual(valResult.ownedBookIds.length, 0, "Buyer does not own any yet.");

    let expectedTotal = 0;
    for (const b of sampleBooks) {
      const hasDiscount = b.discountPrice !== null && b.discountPrice !== undefined && b.discountPrice < b.price;
      expectedTotal += hasDiscount ? b.discountPrice : b.price;
    }
    assert.strictEqual(valResult.grandTotal, expectedTotal, "Server grand total must match sum of effective prices.");
    console.log("✔ 1.1 Server validation correctly verifies available books, flags missing ones, and computes exact grand total.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: Guest Checkout Protection & Validation Guardrails
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 2] Security & Input Guardrails ---");

    const guestForm = new FormData();
    guestForm.set("bookIdsJson", JSON.stringify(sampleIds));
    guestForm.set("paymentMethod", "BKASH");
    guestForm.set("senderNumber", "01711112222");
    guestForm.set("transactionId", "GUESTTRX1234");

    const guestResult = await createMultiBookOrderAction(null, guestForm);
    assert.strictEqual(guestResult.success, false);
    assert.ok(guestResult.error?.includes("সাইন ইন"), "Guest must be told to sign in.");
    console.log("✔ 2.1 Guest checkout is blocked on the server.");

    // Invalid phone number
    const badPhoneForm = new FormData();
    badPhoneForm.set("bookIdsJson", JSON.stringify(sampleIds));
    badPhoneForm.set("paymentMethod", "BKASH");
    badPhoneForm.set("senderNumber", "12345");
    badPhoneForm.set("transactionId", "TRX1234");
    const badPhoneRes = await createMultiBookOrderAction(null, badPhoneForm, String(buyer._id));
    assert.strictEqual(badPhoneRes.success, false);
    assert.ok(badPhoneRes.error?.includes("১১ ডিজিটের"), "Invalid phone format rejected.");
    console.log("✔ 2.2 Invalid phone number format is strictly rejected.");

    // Invalid TrxID
    const badTxForm = new FormData();
    badTxForm.set("bookIdsJson", JSON.stringify(sampleIds));
    badTxForm.set("paymentMethod", "BKASH");
    badTxForm.set("senderNumber", "01711112222");
    badTxForm.set("transactionId", "@@@");
    const badTxRes = await createMultiBookOrderAction(null, badTxForm, String(buyer._id));
    assert.strictEqual(badTxRes.success, false);
    assert.ok(badTxRes.error?.includes("TrxID"), "Invalid TrxID rejected.");
    console.log("✔ 2.3 Invalid TrxID format is rejected.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: 3-Book Cart → 1 Order, 1 Payment, 1 TrxID
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 3] 3-Book Cart Checkout Flow ---");

    const trxId3 = `BKASH3BOOK${Date.now().toString().slice(-6)}`;
    const form3 = new FormData();
    // Intentionally pass duplicate ID to verify deduplication
    form3.set("bookIdsJson", JSON.stringify([...sampleIds, sampleIds[0]]));
    form3.set("paymentMethod", "BKASH");
    form3.set("senderNumber", "01711113333");
    form3.set("transactionId", trxId3);

    const orderRes3 = await createMultiBookOrderAction(null, form3, String(buyer._id));
    assert.strictEqual(orderRes3.success, true, `3-book order failed: ${orderRes3.error}`);
    assert.strictEqual(orderRes3.itemCount, 3, "Order items must be deduplicated to 3 books.");
    assert.strictEqual(orderRes3.amount, expectedTotal, "Order amount must equal server sum.");

    const dbOrder3 = await Order.findById(orderRes3.orderId).lean();
    assert.ok(dbOrder3, "Order must exist in database.");
    assert.strictEqual(dbOrder3.status, "PENDING");
    assert.strictEqual(dbOrder3.items.length, 3);
    assert.strictEqual(dbOrder3.total, expectedTotal);
    assert.strictEqual(dbOrder3.transactionId, trxId3.toUpperCase());
    console.log(`✔ 3.1 3-book cart created ONE PENDING order #${orderRes3.orderNumber} with total ৳${orderRes3.amount}.`);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: Content Protection while Order is PENDING
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 4] Content Protection (Pending Order Grants NO Access) ---");

    for (const b of sampleBooks) {
      const activePurchase = await Purchase.findOne({
        user: buyer._id,
        book: b._id,
        status: "ACTIVE",
      }).lean();
      assert.strictEqual(activePurchase, null, `Pending order must not grant Purchase for book ${b.title}`);
    }
    console.log("✔ 4.1 Verified: ZERO book access granted while multi-book order is PENDING.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: Duplicate TrxID Prevention Across Orders
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 5] TrxID Uniqueness Enforcement ---");

    const dupTxForm = new FormData();
    dupTxForm.set("bookIdsJson", JSON.stringify(sampleIds));
    dupTxForm.set("paymentMethod", "BKASH");
    dupTxForm.set("senderNumber", "01711114444");
    dupTxForm.set("transactionId", trxId3); // Reused TrxID

    const dupTxRes = await createMultiBookOrderAction(null, dupTxForm, String(otherReader._id));
    assert.strictEqual(dupTxRes.success, false);
    assert.ok(dupTxRes.error?.includes("ইতিমধ্যে ব্যবহৃত"), "Duplicate TrxID must be rejected.");
    console.log("✔ 5.1 Reusing transaction ID is strictly rejected across all active/pending orders.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: 10-Book Cart → 1 Order, 1 Grand Total, 1 TrxID
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 6] 10-Book Cart Checkout Flow ---");

    const tenBooks = publishedBooks.slice(0, 10);
    const tenBookIds = tenBooks.map((b) => String(b._id));
    let tenExpectedTotal = 0;
    for (const b of tenBooks) {
      const hasDiscount = b.discountPrice !== null && b.discountPrice !== undefined && b.discountPrice < b.price;
      tenExpectedTotal += hasDiscount ? b.discountPrice : b.price;
    }

    const trxId10 = `NAGAD10BK${Date.now().toString().slice(-6)}`;
    const form10 = new FormData();
    form10.set("bookIdsJson", JSON.stringify(tenBookIds));
    form10.set("paymentMethod", "NAGAD");
    form10.set("senderNumber", "01811115555");
    form10.set("transactionId", trxId10);

    const orderRes10 = await createMultiBookOrderAction(null, form10, String(otherReader._id));
    assert.strictEqual(orderRes10.success, true, `10-book order creation failed: ${orderRes10.error}`);
    assert.strictEqual(orderRes10.itemCount, 10, "Order must contain exactly 10 books.");
    assert.strictEqual(orderRes10.amount, tenExpectedTotal, "10-book total must match server-calculated sum.");

    const dbOrder10 = await Order.findById(orderRes10.orderId).lean();
    assert.ok(dbOrder10);
    assert.strictEqual(dbOrder10.items.length, 10);
    assert.strictEqual(dbOrder10.total, tenExpectedTotal);
    assert.strictEqual(dbOrder10.paymentMethod, "NAGAD");
    assert.strictEqual(dbOrder10.status, "PENDING");
    console.log(`✔ 6.1 10 books in cart successfully created ONE PENDING order #${orderRes10.orderNumber} (Total: ৳${orderRes10.amount}).`);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 7: Admin Verification & Atomic Multi-Book Approval
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 7] Admin Approval Unlocks ALL Books in the Order ---");

    const approveRes = await recordVerifiedSale(orderRes10.orderId, String(adminUser._id));
    assert.strictEqual(approveRes.success, true);

    const approvedOrder = await Order.findById(orderRes10.orderId).lean();
    assert.strictEqual(approvedOrder.status, "PAID");
    assert.ok(approvedOrder.reviewedAt);

    // Verify EVERY ONE of the 10 books is now ACTIVE for the buyer
    const purchases = await Purchase.find({
      user: otherReader._id,
      order: approvedOrder._id,
      status: "ACTIVE",
    }).lean();

    assert.strictEqual(purchases.length, 10, "All 10 books must have ACTIVE Purchase records.");

    // Verify Financial Ledger entries for each of the 10 books
    const ledgerEntries = await FinancialLedger.find({
      order: approvedOrder._id,
    }).lean();

    // 3 entries per book: SALE, AUTHOR_EARNING, PLATFORM_COMMISSION
    assert.strictEqual(ledgerEntries.length, 30, "10 books must create 30 financial ledger entries (3 per book).");

    const salesEntries = ledgerEntries.filter((e) => e.type === "SALE");
    const earningEntries = ledgerEntries.filter((e) => e.type === "AUTHOR_EARNING");
    const commissionEntries = ledgerEntries.filter((e) => e.type === "PLATFORM_COMMISSION");

    assert.strictEqual(salesEntries.length, 10);
    assert.strictEqual(earningEntries.length, 10);
    assert.strictEqual(commissionEntries.length, 10);

    const totalGrossInLedger = salesEntries.reduce((sum, e) => sum + e.amount, 0);
    assert.strictEqual(totalGrossInLedger, tenExpectedTotal, "Total gross sales in ledger must equal order total.");
    console.log(`✔ 7.1 Single admin approval atomically unlocked all 10 books and posted 30 immutable ledger entries.`);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 8: Repeated Approval Idempotency
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 8] Repeated Approval Idempotency & Safety ---");

    let repeatedThrew = false;
    try {
      await recordVerifiedSale(orderRes10.orderId, String(adminUser._id));
    } catch (err) {
      repeatedThrew = true;
      assert.ok(err.message.includes("ইতিমধ্যে প্রক্রিয়া") || err.message.includes("পাওয়া যায়নি"));
    }
    assert.strictEqual(repeatedThrew, true, "Repeated approval must be blocked.");

    // Ensure no duplicate purchases or ledger entries were created
    const purchasesAfter = await Purchase.find({
      user: otherReader._id,
      order: approvedOrder._id,
    }).lean();
    assert.strictEqual(purchasesAfter.length, 10, "No duplicate purchases created.");

    const ledgerAfter = await FinancialLedger.find({
      order: approvedOrder._id,
    }).lean();
    assert.strictEqual(ledgerAfter.length, 30, "No duplicate ledger entries created.");
    console.log("✔ 8.1 Repeated approval is strictly idempotent; zero duplicate purchases or ledger entries.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 9: Reject Order Workflow
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 9] Reject Order Flow (Grants Access to NONE) ---");

    const rejectRes = await rejectPendingOrder(
      orderRes3.orderId,
      String(adminUser._id),
      "ভুল TrxID প্রদান করা হয়েছে।"
    );
    assert.strictEqual(rejectRes.success, true);

    const rejectedOrder = await Order.findById(orderRes3.orderId).lean();
    assert.strictEqual(rejectedOrder.status, "CANCELLED");
    assert.ok(rejectedOrder.adminNote?.includes("ভুল TrxID"));

    const rejectedPurchases = await Purchase.find({
      user: buyer._id,
      order: rejectedOrder._id,
    }).lean();
    assert.strictEqual(rejectedPurchases.length, 0, "Rejected order must grant access to NONE of its books.");

    const rejectedLedgers = await FinancialLedger.find({
      order: rejectedOrder._id,
    }).lean();
    assert.strictEqual(rejectedLedgers.length, 0, "Rejected order must post zero financial ledger entries.");
    console.log("✔ 9.1 Order cancellation verified: 0 purchases, 0 ledger entries, 0 access granted.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 10: Already-Owned Book Prevention
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 10] Already-Owned Books Handling ---");

    // otherReader now owns the 10 books from TEST 7.
    // Attempting to re-order one or more of these books must fail.
    const reorderForm = new FormData();
    reorderForm.set("bookIdsJson", JSON.stringify([tenBookIds[0], tenBookIds[1]]));
    reorderForm.set("paymentMethod", "BKASH");
    reorderForm.set("senderNumber", "01711116666");
    reorderForm.set("transactionId", `REORDER${Date.now().toString().slice(-6)}`);

    const reorderRes = await createMultiBookOrderAction(null, reorderForm, String(otherReader._id));
    assert.strictEqual(reorderRes.success, false);
    assert.ok(
      reorderRes.error?.includes("ইতিমধ্যে আপনার লাইব্রেরিতে রয়েছে"),
      `Should reject re-purchasing already-owned books: ${reorderRes.error}`
    );
    console.log("✔ 10.1 System prevents ordering already-owned books.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 11: Single-Book Checkout Compatibility Unchanged
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 11] Single-Book Checkout Compatibility ---");

    const singleBook = publishedBooks[0];
    const singleTrx = `SINGLEBKASH${Date.now().toString().slice(-6)}`;
    const singleForm = new FormData();
    singleForm.set("bookId", String(singleBook._id));
    singleForm.set("paymentMethod", "BKASH");
    singleForm.set("senderNumber", "01799998888");
    singleForm.set("transactionId", singleTrx);

    const singleRes = await createManualOrderAction(null, singleForm, String(buyer._id));
    assert.strictEqual(singleRes.success, true, `Single-book checkout failed: ${singleRes.error}`);
    assert.ok(singleRes.orderId);

    const singleDbOrder = await Order.findById(singleRes.orderId).lean();
    assert.strictEqual(singleDbOrder.items.length, 1);
    assert.strictEqual(singleDbOrder.items[0].title, singleBook.title);
    console.log(`✔ 11.1 Existing single-book manual checkout at /checkout/${singleBook.slug} functions flawlessly.`);

    console.log("\n==================================================================");
    console.log("=== ALL 11 VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
    console.log("==================================================================\n");
  } finally {
    await mongoose.disconnect();
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed with error:", err);
  process.exit(1);
});
