import mongoose, { Types } from "mongoose";
import assert from "node:assert";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
import { getMongooseConnection } from "../src/lib/db/mongoose";
import User from "../src/models/User.ts";
import Author from "../src/models/Author.ts";
import Book from "../src/models/Book.ts";
import Order from "../src/models/Order.ts";
import Purchase from "../src/models/Purchase.ts";
import FinancialLedger from "../src/models/FinancialLedger.ts";
import Withdrawal from "../src/models/Withdrawal.ts";
import Category from "../src/models/Category.ts";
import PlatformSettings from "../src/models/PlatformSettings.ts";
import {
  recordVerifiedSale,
  calculateAuthorBalances,
  requestAuthorWithdrawal,
  acceptWithdrawalRequest,
  rejectWithdrawalRequest,
  markWithdrawalAsPaid,
  cancelAuthorWithdrawal,
} from "../src/lib/services/finance.ts";

const UserModel = User?.default || User;
const AuthorModel = Author?.default || Author;
const BookModel = Book?.default || Book;
const CategoryModel = Category?.default || Category;
const OrderModel = Order?.default || Order;
const PurchaseModel = Purchase?.default || Purchase;
const FinancialLedgerModel = FinancialLedger?.default || FinancialLedger;
const WithdrawalModel = Withdrawal?.default || Withdrawal;
const PlatformSettingsModel = PlatformSettings?.default || PlatformSettings;

async function main() {
  console.log("=== PUSTOKA FINANCIAL SYSTEM INTEGRITY TEST SUITE ===");
  console.log("Environment: REAL MongoDB database (No mocks)");

  await getMongooseConnection();
  const dbName = mongoose.connection.name;
  console.log(`Connected to database: ${dbName}`);

  // Ensure all collections and indexes are initialized before transaction tests
  await Promise.all([
    UserModel.init(),
    AuthorModel.init(),
    CategoryModel.init(),
    BookModel.init(),
    OrderModel.init(),
    PurchaseModel.init(),
    FinancialLedgerModel.init(),
    WithdrawalModel.init(),
  ]);
  console.log("✓ Schema models and indexes synchronized.");

  // Test Transaction Support Detection
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await session.abortTransaction();
    session.endSession();
    console.log("MongoDB replica set transaction support: ACTIVE");
  } catch (txErr) {
    console.log("MongoDB replica set transaction support: STANDALONE (atomic fallback active)", txErr.message);
  }

  // Isolation tracking: strictly isolated test records only
  const cleanup = {
    users: [],
    authors: [],
    categories: [],
    books: [],
    orders: [],
    purchases: [],
    ledgers: [],
    withdrawals: [],
  };

  const runId = Date.now();
  let originalCommissionPercent = 30;

  try {
    const existingSettings = await PlatformSettingsModel.findOne();
    if (existingSettings) {
      originalCommissionPercent = existingSettings.commissionPercent;
      await PlatformSettingsModel.updateOne({}, { commissionPercent: 30 });
    } else {
      await PlatformSettingsModel.create({ commissionPercent: 30 });
    }

    // -------------------------------------------------------------------------
    // STEP 0: ISOLATED FIXTURES
    // -------------------------------------------------------------------------
    console.log("\n[SETUP] Creating isolated test users, author profile, and book...");

    const testAdmin = await UserModel.create({
      name: "Financial Test Admin",
      email: `fin_admin_${runId}@pustoka.test`,
      role: "ADMIN",
      status: "ACTIVE",
    });
    cleanup.users.push(testAdmin._id);

    const authorUser = await UserModel.create({
      name: "Financial Test Author",
      email: `fin_author_${runId}@pustoka.test`,
      role: "AUTHOR",
      status: "ACTIVE",
    });
    cleanup.users.push(authorUser._id);

    const readerUser = await UserModel.create({
      name: "Financial Test Reader",
      email: `fin_reader_${runId}@pustoka.test`,
      role: "USER",
      status: "ACTIVE",
    });
    cleanup.users.push(readerUser._id);

    const authorProfile = await AuthorModel.create({
      user: authorUser._id,
      penName: "Test Royalty PenName",
      slug: `fin-author-${runId}`,
      status: "ACTIVE",
    });
    cleanup.authors.push(authorProfile._id);

    const testCategory = await CategoryModel.create({
      name: "Financial Test Category",
      slug: `fin-cat-${runId}`,
      status: "ACTIVE",
    });
    cleanup.categories.push(testCategory._id);

    const bookPrice = 1000;
    const testBook = await BookModel.create({
      title: "Financial Test Book",
      slug: `fin-book-${runId}`,
      description: "Test description for book",
      price: bookPrice,
      author: authorProfile._id,
      category: testCategory._id,
      status: "PUBLISHED",
    });
    cleanup.books.push(testBook._id);

    console.log("✓ Isolated fixtures initialized successfully.");

    // -------------------------------------------------------------------------
    // TEST 1: Commission calculation & ledger snapshotting
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Sale Verification & Commission Snapshotting ---");
    const testOrder = await OrderModel.create({
      user: readerUser._id,
      items: [
        {
          book: testBook._id,
          title: testBook.title,
          price: bookPrice,
          quantity: 1,
        },
      ],
      subtotal: bookPrice,
      discount: 0,
      total: bookPrice,
      currency: "BDT",
      paymentMethod: "BKASH",
      senderNumber: "01711111111",
      transactionId: `TX_${runId}`,
      status: "PENDING",
    });
    cleanup.orders.push(testOrder._id);

    const approveResult = await recordVerifiedSale(
      String(testOrder._id),
      String(testAdmin._id)
    );
    assert.strictEqual(approveResult.success, true);

    const verifiedOrder = await OrderModel.findById(testOrder._id);
    assert.strictEqual(verifiedOrder.status, "PAID");

    const purchase = await PurchaseModel.findOne({ order: testOrder._id });
    assert.ok(purchase, "Purchase must be created for reader");
    assert.strictEqual(purchase.status, "ACTIVE");
    cleanup.purchases.push(purchase._id);

    const orderLedgers = await FinancialLedgerModel.find({ order: testOrder._id });
    assert.strictEqual(
      orderLedgers.length,
      3,
      "Order must create exactly 3 ledger entries (SALE, AUTHOR_EARNING, PLATFORM_COMMISSION)"
    );
    for (const l of orderLedgers) cleanup.ledgers.push(l._id);

    const saleEntry = orderLedgers.find((e) => e.type === "SALE");
    const earningEntry = orderLedgers.find((e) => e.type === "AUTHOR_EARNING");
    const commissionEntry = orderLedgers.find((e) => e.type === "PLATFORM_COMMISSION");

    assert.strictEqual(saleEntry.amount, 1000);
    assert.strictEqual(commissionEntry.amount, 300); // 30% commission
    assert.strictEqual(earningEntry.amount, 700); // 70% author earning
    console.log("✓ Sale ৳1000 split correctly: Commission ৳300 (30%), Author ৳700 (70%)");

    let balances = await calculateAuthorBalances(authorProfile._id);
    assert.strictEqual(balances.lifetimeEarnings, 700);
    assert.strictEqual(balances.availableBalance, 700);
    assert.strictEqual(balances.pendingBalance, 0);
    assert.strictEqual(balances.withdrawnTotal, 0);
    console.log("✓ Initial balance verified: Available ৳700, Lifetime ৳700");

    // -------------------------------------------------------------------------
    // TEST 2: Duplicate payment approval idempotency
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Duplicate Approval Idempotency ---");
    let duplicateApprovalCaught = false;
    try {
      await recordVerifiedSale(String(testOrder._id), String(testAdmin._id));
    } catch (err) {
      duplicateApprovalCaught = true;
      console.log("✓ Duplicate approval rejected with message:", err.message);
    }
    assert.ok(duplicateApprovalCaught, "Duplicate order approval must fail");

    const purchasesCount = await PurchaseModel.countDocuments({ order: testOrder._id });
    assert.strictEqual(purchasesCount, 1, "Must never create duplicate purchases");
    const ledgersCount = await FinancialLedgerModel.countDocuments({ order: testOrder._id });
    assert.strictEqual(ledgersCount, 3, "Must never create duplicate ledger entries");
    console.log("✓ Idempotency confirmed: No duplicate purchase or ledger rows");

    // -------------------------------------------------------------------------
    // TEST 3: Concurrent withdrawal requests and balance limits
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Withdrawal Concurrency & Overdraft Prevention ---");
    // Author requests 500 BDT out of 700 available
    const req1 = await requestAuthorWithdrawal(
      String(authorProfile._id),
      500,
      "BKASH",
      "01722222222"
    );
    assert.strictEqual(req1.success, true);
    cleanup.withdrawals.push(new Types.ObjectId(req1.withdrawalId));

    // Balance after request: available should be 200, pending should be 500
    balances = await calculateAuthorBalances(authorProfile._id);
    assert.strictEqual(balances.pendingBalance, 500);
    assert.strictEqual(balances.availableBalance, 200);
    assert.strictEqual(balances.lifetimeEarnings, 700);
    console.log("✓ Available balance correctly reduced to ৳200 (৳500 pending)");

    // Concurrently submitting a second withdrawal request while one is PENDING must fail
    let concurrentBlocked = false;
    try {
      await requestAuthorWithdrawal(
        String(authorProfile._id),
        150,
        "NAGAD",
        "01733333333"
      );
    } catch (err) {
      concurrentBlocked = true;
      console.log("✓ Concurrent withdrawal request blocked:", err.message);
    }
    assert.ok(concurrentBlocked, "Concurrent PENDING withdrawal request must be rejected");

    // -------------------------------------------------------------------------
    // TEST 4: Withdrawal acceptance, encumbrance reservation & payout
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Withdrawal Acceptance & Payout Flow ---");
    const acceptRes = await acceptWithdrawalRequest(
      req1.withdrawalId,
      String(testAdmin._id)
    );
    assert.strictEqual(acceptRes.success, true);

    const reservedLedger = await FinancialLedgerModel.findOne({
      withdrawal: req1.withdrawalId,
      type: "WITHDRAWAL_RESERVED",
    });
    assert.ok(reservedLedger, "WITHDRAWAL_RESERVED ledger entry must exist");
    cleanup.ledgers.push(reservedLedger._id);

    // After acceptance, pending requests = 0, activeReservations = 500, pendingBalance = 500
    balances = await calculateAuthorBalances(authorProfile._id);
    assert.strictEqual(balances.pendingBalance, 500);
    assert.strictEqual(balances.availableBalance, 200);
    assert.strictEqual(balances.lifetimeEarnings, 700);
    console.log("✓ Encumbrance verified: WITHDRAWAL_RESERVED holds ৳500, Available ৳200");

    // Mark withdrawal as PAID
    const payRes = await markWithdrawalAsPaid(
      req1.withdrawalId,
      String(testAdmin._id),
      `PAY_TRX_${runId}`
    );
    assert.strictEqual(payRes.success, true);

    const releasedLedger = await FinancialLedgerModel.findOne({
      withdrawal: req1.withdrawalId,
      type: "WITHDRAWAL_RELEASED",
    });
    assert.ok(releasedLedger, "WITHDRAWAL_RELEASED must liquidate the encumbrance hold");
    cleanup.ledgers.push(releasedLedger._id);

    const paidLedger = await FinancialLedgerModel.findOne({
      withdrawal: req1.withdrawalId,
      type: "WITHDRAWAL_PAID",
    });
    assert.ok(paidLedger, "WITHDRAWAL_PAID ledger debit entry must exist");
    cleanup.ledgers.push(paidLedger._id);

    // Accounting check after payout:
    // lifetimeEarnings: 700 (STRICTLY INVARIANT - NEVER DECREASED BY PAYOUT)
    // withdrawnTotal: 500
    // pendingBalance: 0
    // availableBalance: 200
    balances = await calculateAuthorBalances(authorProfile._id);
    assert.strictEqual(balances.lifetimeEarnings, 700, "Lifetime earnings must NEVER decrease upon payout");
    assert.strictEqual(balances.withdrawnTotal, 500, "Withdrawn total must equal paid sum");
    assert.strictEqual(balances.pendingBalance, 0, "Pending balance must return to 0 after payout");
    assert.strictEqual(balances.availableBalance, 200, "Available balance must remain ৳200");
    console.log("✓ Payout accounting verified: Lifetime ৳700, Withdrawn ৳500, Available ৳200");

    // -------------------------------------------------------------------------
    // TEST 5: Duplicate payout attempt idempotency
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Duplicate Payout Retry Idempotency ---");
    let duplicatePayoutCaught = false;
    try {
      await markWithdrawalAsPaid(
        req1.withdrawalId,
        String(testAdmin._id),
        `PAY_TRX_DUPLICATE_${runId}`
      );
    } catch (err) {
      duplicatePayoutCaught = true;
      console.log("✓ Duplicate payout retry blocked:", err.message);
    }
    assert.ok(duplicatePayoutCaught, "Duplicate payout attempt must be rejected");

    const paidLedgersCount = await FinancialLedgerModel.countDocuments({
      withdrawal: req1.withdrawalId,
      type: "WITHDRAWAL_PAID",
    });
    assert.strictEqual(paidLedgersCount, 1, "Must never duplicate WITHDRAWAL_PAID ledger entries");
    console.log("✓ Idempotency confirmed: Exactly 1 WITHDRAWAL_PAID record");

    // -------------------------------------------------------------------------
    // TEST 6: Rejection and fund release
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 6: Withdrawal Rejection & Fund Release ---");
    // Author requests remaining 200 BDT
    const req2 = await requestAuthorWithdrawal(
      String(authorProfile._id),
      200,
      "BKASH",
      "01744444444"
    );
    cleanup.withdrawals.push(new Types.ObjectId(req2.withdrawalId));

    // Admin accepts (funds reserved)
    await acceptWithdrawalRequest(req2.withdrawalId, String(testAdmin._id));
    const r2Reserved = await FinancialLedgerModel.findOne({
      withdrawal: req2.withdrawalId,
      type: "WITHDRAWAL_RESERVED",
    });
    if (r2Reserved) cleanup.ledgers.push(r2Reserved._id);

    balances = await calculateAuthorBalances(authorProfile._id);
    assert.strictEqual(balances.availableBalance, 0);
    assert.strictEqual(balances.pendingBalance, 200);

    // Admin rejects request -> funds must be released back to author available balance
    const rejectRes = await rejectWithdrawalRequest(
      req2.withdrawalId,
      String(testAdmin._id),
      "ভুল একাউন্ট নম্বর"
    );
    assert.strictEqual(rejectRes.success, true);

    const r2Released = await FinancialLedgerModel.findOne({
      withdrawal: req2.withdrawalId,
      type: "WITHDRAWAL_RELEASED",
    });
    assert.ok(r2Released, "WITHDRAWAL_RELEASED entry must be created on rejection of accepted request");
    cleanup.ledgers.push(r2Released._id);

    balances = await calculateAuthorBalances(authorProfile._id);
    assert.strictEqual(balances.availableBalance, 200, "Available balance must be fully restored upon rejection");
    assert.strictEqual(balances.pendingBalance, 0);
    assert.strictEqual(balances.lifetimeEarnings, 700);
    console.log("✓ Rejection releases reserved funds: Available balance restored to ৳200");

    // -------------------------------------------------------------------------
    // TEST 7: Author self-cancellation and fund release
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: Author Self-Cancellation & Fund Release ---");
    const req3 = await requestAuthorWithdrawal(
      String(authorProfile._id),
      150,
      "NAGAD",
      "01755555555"
    );
    cleanup.withdrawals.push(new Types.ObjectId(req3.withdrawalId));

    balances = await calculateAuthorBalances(authorProfile._id);
    assert.strictEqual(balances.availableBalance, 50);
    assert.strictEqual(balances.pendingBalance, 150);

    // Author cancels before admin acts
    const cancelRes = await cancelAuthorWithdrawal(
      req3.withdrawalId,
      String(authorProfile._id)
    );
    assert.strictEqual(cancelRes.success, true);

    balances = await calculateAuthorBalances(authorProfile._id);
    assert.strictEqual(balances.availableBalance, 200, "Available balance restored to ৳200 after cancellation");
    assert.strictEqual(balances.pendingBalance, 0);
    console.log("✓ Cancellation releases pending funds: Available balance restored to ৳200");

    console.log("\n========================================================");
    console.log("ALL 7 FINANCIAL INTEGRITY & CONCURRENCY TESTS PASSED!");
    console.log("========================================================");
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Purge strictly created test records
    // -------------------------------------------------------------------------
    console.log("\n[CLEANUP] Removing test fixtures...");
    if (cleanup.ledgers.length) {
      await FinancialLedgerModel.deleteMany({ _id: { $in: cleanup.ledgers } });
    }
    if (cleanup.withdrawals.length) {
      await WithdrawalModel.deleteMany({ _id: { $in: cleanup.withdrawals } });
    }
    if (cleanup.purchases.length) {
      await PurchaseModel.deleteMany({ _id: { $in: cleanup.purchases } });
    }
    if (cleanup.orders.length) {
      await OrderModel.deleteMany({ _id: { $in: cleanup.orders } });
    }
    if (cleanup.books.length) {
      await BookModel.deleteMany({ _id: { $in: cleanup.books } });
    }
    if (cleanup.authors.length) {
      await AuthorModel.deleteMany({ _id: { $in: cleanup.authors } });
    }
    if (cleanup.categories.length) {
      await CategoryModel.deleteMany({ _id: { $in: cleanup.categories } });
    }
    if (cleanup.users.length) {
      await UserModel.deleteMany({ _id: { $in: cleanup.users } });
    }
    await PlatformSettingsModel.updateOne({}, { commissionPercent: originalCommissionPercent });
    await mongoose.disconnect();
    console.log("✓ Cleaned up all isolated test records and disconnected.");
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
