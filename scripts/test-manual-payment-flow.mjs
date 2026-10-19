import assert from "node:assert";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

import UserRaw from "../src/models/User.ts";
import BookRaw from "../src/models/Book.ts";
import PurchaseRaw from "../src/models/Purchase.ts";
import OrderRaw from "../src/models/Order.ts";
import FinancialLedgerRaw from "../src/models/FinancialLedger.ts";
import "../src/models/Author.ts";
import "../src/models/Category.ts";
import "../src/models/PlatformSettings.ts";

import { createManualOrderAction } from "../src/actions/payments.ts";
import { recordVerifiedSale, rejectPendingOrder } from "../src/lib/services/finance.ts";
import { getProtectedChapter } from "../src/lib/data/book-details.ts";

const User = UserRaw.default || UserRaw;
const Book = BookRaw.default || BookRaw;
const Purchase = PurchaseRaw.default || PurchaseRaw;
const Order = OrderRaw.default || OrderRaw;
const FinancialLedger = FinancialLedgerRaw.default || FinancialLedgerRaw;

async function runPaymentTestSuite() {
  console.log("==================================================================");
  console.log("=== RUNNING SUITE: MANUAL BKASH & NAGAD PAYMENT VERIFICATION ===");
  console.log("==================================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Locate a published book with chapters
  const book = await Book.findOne({
    status: "PUBLISHED",
    price: { $gt: 0 },
    "chapters.1": { $exists: true },
  }).lean();

  assert.ok(book, "Published book with chapters must exist for testing.");
  const lockedChapter = book.chapters.find((ch) => !ch.isPreview) || book.chapters[1];
  console.log(`Using published book: "${book.title}" (Price: ${book.price} BDT)`);
  console.log(`Locked Chapter to verify access: #${lockedChapter.order} "${lockedChapter.title}"`);

  // 2. Create test users: 1 Admin, 2 Readers
  const adminUser = await User.create({
    name: "Finance Admin Verifier",
    email: `finance_admin_${Date.now()}@pustoka.test`,
    passwordHash: "dummyhash",
    role: "ADMIN",
    status: "ACTIVE",
  });

  const readerOne = await User.create({
    name: "Reader One",
    email: `reader_one_${Date.now()}@pustoka.test`,
    passwordHash: "dummyhash",
    role: "USER",
    status: "ACTIVE",
  });

  const readerTwo = await User.create({
    name: "Reader Two",
    email: `reader_two_${Date.now()}@pustoka.test`,
    passwordHash: "dummyhash",
    role: "USER",
    status: "ACTIVE",
  });

  const testTrxId1 = `BKASH${Date.now().toString().slice(-6)}`;
  const testTrxId2 = `NAGAD${Date.now().toString().slice(-6)}`;

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: Guest / Unauthenticated Checkout is Blocked
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 1] Guest Checkout Protection ---");

    // Attempt to submit order without session (createManualOrderAction)
    const guestFormData = new FormData();
    guestFormData.set("bookId", String(book._id));
    guestFormData.set("paymentMethod", "BKASH");
    guestFormData.set("senderNumber", "01711111111");
    guestFormData.set("transactionId", testTrxId1);

    const guestResult = await createManualOrderAction(null, guestFormData);
    assert.strictEqual(guestResult.success, false, "Guest checkout must fail.");
    assert.ok(
      guestResult.error?.includes("সাইন ইন") || guestResult.error?.includes("লগইন"),
      `Guest error message should demand sign-in: ${guestResult.error}`
    );
    console.log("✔ 1.1 Verified: Guest checkout is strictly blocked with authentication error.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: Pending Orders Have No Book Access & Rejects Duplicates
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 2] Pending Order Creation & Content Isolation ---");

    // Create a pending order for readerOne with testTrxId1
    const pendingOrder1 = await Order.create({
      user: readerOne._id,
      items: [
        {
          book: book._id,
          title: book.title,
          price: book.price,
          quantity: 1,
        },
      ],
      subtotal: book.price,
      discount: 0,
      total: book.price,
      currency: "BDT",
      paymentMethod: "BKASH",
      senderNumber: "01711223344",
      transactionId: testTrxId1,
      status: "PENDING",
    });

    assert.ok(pendingOrder1._id, "Pending order must be created.");
    assert.strictEqual(pendingOrder1.status, "PENDING");
    console.log(`Created PENDING order #${String(pendingOrder1._id).slice(-6).toUpperCase()} with TrxID: ${testTrxId1}`);

    // Verify Reader One has NO access to locked chapters while order is PENDING
    const accessWhilePending = await getProtectedChapter(
      book.slug,
      lockedChapter.order,
      String(readerOne._id),
      readerOne.name
    );
    assert.strictEqual(accessWhilePending.allowed, false, "Reader must NOT have access while order is PENDING.");
    assert.strictEqual(accessWhilePending.statusCode, 403, "Must return 403 Forbidden.");
    assert.strictEqual(accessWhilePending.chapter, undefined, "Chapter content must not be released.");
    console.log("✔ 2.1 Verified: Pending order grants ZERO book access; locked chapters remain strictly forbidden.");

    // Duplicate TrxID check across users and methods
    const duplicateTxOrder = await Order.findOne({
      transactionId: testTrxId1,
      status: { $in: ["PENDING", "PAID"] },
    }).lean();

    assert.ok(duplicateTxOrder, "Existing transaction record must be found in database.");

    // 2.2 Server Action duplicate TrxID check across users and methods
    const duplicateFormData = new FormData();
    duplicateFormData.set("bookId", String(book._id));
    duplicateFormData.set("paymentMethod", "NAGAD");
    duplicateFormData.set("senderNumber", "01811223344");
    duplicateFormData.set("transactionId", testTrxId1);

    const dupActionResult = await createManualOrderAction(
      null,
      duplicateFormData,
      String(readerTwo._id)
    );
    assert.strictEqual(dupActionResult.success, false, "Duplicate TrxID submission must fail.");
    assert.ok(
      dupActionResult.error?.includes("ইতিমধ্যে ব্যবহৃত হয়েছে"),
      `Error must explain duplicate TrxID: ${dupActionResult.error}`
    );
    console.log("✔ 2.2 Verified: Duplicate TrxID submission via Server Action is strictly rejected across different users and methods.");

    // 2.3 Database-level duplicate TrxID enforcement via syncIndexes
    await Order.syncIndexes();
    let dbDuplicateRejected = false;
    try {
      await Order.create({
        user: readerTwo._id,
        items: [
          {
            book: book._id,
            title: book.title,
            price: book.price,
            quantity: 1,
          },
        ],
        subtotal: book.price,
        discount: 0,
        total: book.price,
        currency: "BDT",
        paymentMethod: "NAGAD",
        senderNumber: "01811223344",
        transactionId: testTrxId1,
        status: "PENDING",
      });
    } catch (err) {
      dbDuplicateRejected = true;
      assert.ok(
        String(err).includes("E11000") || String(err).includes("duplicate"),
        `Unique index must catch duplicate TrxID: ${err}`
      );
    }
    assert.ok(dbDuplicateRejected, "Database-level duplicate TrxID must be rejected by unique index.");
    console.log("✔ 2.3 Verified: Database-level partial unique index rejects duplicate TrxID.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: Admin Rejection Does NOT Grant Access or Post Earnings
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 3] Admin Rejection Flow ---");

    // Create a second pending order for readerTwo to reject
    const pendingOrder2 = await Order.create({
      user: readerTwo._id,
      items: [
        {
          book: book._id,
          title: book.title,
          price: book.price,
          quantity: 1,
        },
      ],
      subtotal: book.price,
      discount: 0,
      total: book.price,
      currency: "BDT",
      paymentMethod: "NAGAD",
      senderNumber: "01899887766",
      transactionId: testTrxId2,
      status: "PENDING",
    });

    const rejectResult = await rejectPendingOrder(
      String(pendingOrder2._id),
      String(adminUser._id),
      "ভুল TrxID বা অ্যাকাউন্টে টাকা জমা হয়নি।"
    );
    assert.strictEqual(rejectResult.success, true, "Order rejection must succeed.");

    const rejectedOrder = await Order.findById(pendingOrder2._id).lean();
    assert.strictEqual(rejectedOrder.status, "CANCELLED", "Rejected order status must be CANCELLED.");
    assert.strictEqual(rejectedOrder.adminNote, "ভুল TrxID বা অ্যাকাউন্টে টাকা জমা হয়নি।");
    assert.strictEqual(String(rejectedOrder.reviewedBy), String(adminUser._id));

    // Verify readerTwo STILL has NO access
    const accessAfterReject = await getProtectedChapter(
      book.slug,
      lockedChapter.order,
      String(readerTwo._id),
      readerTwo.name
    );
    assert.strictEqual(accessAfterReject.allowed, false, "Rejected order must NEVER grant access.");
    assert.strictEqual(accessAfterReject.statusCode, 403);

    // Verify NO purchase was created
    const purchaseAfterReject = await Purchase.findOne({
      user: readerTwo._id,
      book: book._id,
    }).lean();
    assert.strictEqual(purchaseAfterReject, null, "No Purchase record must exist for rejected order.");

    // Verify NO financial ledger entries were posted
    const ledgerAfterReject = await FinancialLedger.find({
      order: pendingOrder2._id,
    }).lean();
    assert.strictEqual(ledgerAfterReject.length, 0, "No FinancialLedger entries must be created for rejected order.");
    console.log("✔ 3.1 Verified: Admin rejection transitions order to CANCELLED, leaves zero Purchase and zero Ledger entries.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: Admin Approval Flow (Atomicity, Access Grant, and Ledger Posting)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 4] Admin Approval Flow (Idempotency & Entitlements) ---");

    const approveResult = await recordVerifiedSale(
      String(pendingOrder1._id),
      String(adminUser._id)
    );
    assert.strictEqual(approveResult.success, true, "Approval must succeed.");

    // Verify order is now PAID
    const paidOrder = await Order.findById(pendingOrder1._id).lean();
    assert.strictEqual(paidOrder.status, "PAID", "Order status must be PAID.");
    assert.strictEqual(String(paidOrder.reviewedBy), String(adminUser._id));
    assert.ok(paidOrder.reviewedAt instanceof Date);

    // Verify Purchase entitlement was created
    const purchase = await Purchase.findOne({
      user: readerOne._id,
      book: book._id,
      status: "ACTIVE",
    }).lean();
    assert.ok(purchase, "ACTIVE Purchase entitlement must exist for readerOne.");
    assert.strictEqual(String(purchase.order), String(pendingOrder1._id));

    // Verify readerOne NOW has full access to the locked chapter
    const accessAfterApproval = await getProtectedChapter(
      book.slug,
      lockedChapter.order,
      String(readerOne._id),
      readerOne.name
    );
    assert.strictEqual(accessAfterApproval.allowed, true, "Reader must have access after admin approval.");
    assert.strictEqual(accessAfterApproval.statusCode, 200);
    assert.ok(accessAfterApproval.chapter?.content, "Chapter content must be unlocked.");
    console.log("✔ 4.1 Verified: Admin approval unlocked chapter reading access for Reader One.");

    // Verify Financial Ledger entries: SALE, AUTHOR_EARNING, PLATFORM_COMMISSION
    const ledgerEntries = await FinancialLedger.find({
      order: pendingOrder1._id,
    }).lean();
    assert.strictEqual(ledgerEntries.length, 3, "Exactly 3 ledger entries must be posted for verified sale.");

    const saleEntry = ledgerEntries.find((e) => e.type === "SALE");
    const earningEntry = ledgerEntries.find((e) => e.type === "AUTHOR_EARNING");
    const commissionEntry = ledgerEntries.find((e) => e.type === "PLATFORM_COMMISSION");

    assert.ok(saleEntry, "SALE entry must exist.");
    assert.ok(earningEntry, "AUTHOR_EARNING entry must exist.");
    assert.ok(commissionEntry, "PLATFORM_COMMISSION entry must exist.");
    assert.strictEqual(saleEntry.amount, book.price);
    assert.strictEqual(earningEntry.amount + commissionEntry.amount, saleEntry.amount);
    console.log(`✔ 4.2 Verified: Exactly 3 ledger entries created (Sale: ৳${saleEntry.amount}, Royalty: ৳${earningEntry.amount}, Commission: ৳${commissionEntry.amount}).`);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: Idempotent Approval Protection (No Duplicate Access or Double Payout)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 5] Idempotency & Repeat Approval Rejection ---");

    // Attempting to approve the same order again must be rejected
    let secondApprovalFailed = false;
    try {
      await recordVerifiedSale(String(pendingOrder1._id), String(adminUser._id));
    } catch (err) {
      secondApprovalFailed = true;
      assert.ok(
        String(err).includes("ইতিমধ্যে প্রক্রিয়া") || String(err).includes("পাওয়া যায়নি"),
        `Second approval must reject already-paid order: ${err}`
      );
    }
    assert.ok(secondApprovalFailed, "Subsequent approval attempt on PAID order must fail.");

    // Ensure Purchase count and Ledger count did not duplicate
    const totalPurchases = await Purchase.countDocuments({
      user: readerOne._id,
      book: book._id,
    });
    assert.strictEqual(totalPurchases, 1, "There must strictly be 1 purchase record.");

    const totalLedgerForOrder = await FinancialLedger.countDocuments({
      order: pendingOrder1._id,
    });
    assert.strictEqual(totalLedgerForOrder, 3, "Ledger records must not be duplicated.");
    console.log("✔ 5.1 Verified: Duplicate approval is safely blocked with zero double-counting or extra purchases.");

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: Self-Approval Prevention (Separation of Duties)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 6] Self-Approval Prevention ---");

    // Create an order by adminUser
    const adminSelfOrder = await Order.create({
      user: adminUser._id,
      items: [
        {
          book: book._id,
          title: book.title,
          price: book.price,
          quantity: 1,
        },
      ],
      subtotal: book.price,
      discount: 0,
      total: book.price,
      currency: "BDT",
      paymentMethod: "BKASH",
      senderNumber: "01700000000",
      transactionId: `ADMIN${Date.now().toString().slice(-6)}`,
      status: "PENDING",
    });

    let selfApprovalBlocked = false;
    try {
      await recordVerifiedSale(String(adminSelfOrder._id), String(adminUser._id));
    } catch (err) {
      selfApprovalBlocked = true;
      assert.ok(
        String(err).includes("নিজের অর্ডারের পেমেন্ট নিজে অনুমোদন করতে পারবেন না"),
        `Self-approval must be blocked: ${err}`
      );
    }
    assert.ok(selfApprovalBlocked, "Admin must be blocked from approving their own order.");
    console.log("✔ 6.1 Verified: Separation of duties enforced; admin self-approval is strictly forbidden.");

  } finally {
    // Cleanup test records
    await Purchase.deleteMany({
      user: { $in: [readerOne._id, readerTwo._id, adminUser._id] },
    });
    await FinancialLedger.deleteMany({
      order: {
        $in: await Order.find({
          user: { $in: [readerOne._id, readerTwo._id, adminUser._id] },
        }).distinct("_id"),
      },
    });
    await Order.deleteMany({
      user: { $in: [readerOne._id, readerTwo._id, adminUser._id] },
    });
    await User.deleteMany({
      email: { $regex: /@pustoka\.test$/ },
    });
    await mongoose.disconnect();
  }

  console.log("\n==================================================================");
  console.log(">>> ALL MANUAL BKASH & NAGAD PAYMENT TESTS PASSED! <<<");
  console.log("==================================================================");
}

runPaymentTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
