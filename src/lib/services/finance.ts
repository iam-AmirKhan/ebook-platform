import mongoose, { Types } from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import Order, { type IOrderDocument } from "@/models/Order";
import Purchase from "@/models/Purchase";
import Book from "@/models/Book";
import FinancialLedger, { type LedgerEntryType } from "@/models/FinancialLedger";
import Withdrawal from "@/models/Withdrawal";
import { getPlatformSettings } from "@/lib/data/platform-settings";

export interface AuthorFinancialStats {
  lifetimeEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  withdrawnTotal: number;
}

export interface PlatformFinancialStats {
  totalVerifiedSales: number;
  totalPlatformCommission: number;
  totalAuthorEarnings: number;
  pendingOrdersCount: number;
  pendingOrdersAmount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  completedPayoutsCount: number;
  completedPayoutsAmount: number;
}

/**
/**
 * Helper to run operations within a MongoDB transaction.
 * FAILS CLOSED if MongoDB replica set multi-document transactions are unavailable,
 * preventing partial financial writes, uncommitted ledger entries, or inconsistent balances.
 */
async function runInTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  let session: mongoose.ClientSession | null = null;

  try {
    session = await mongoose.startSession();
  } catch (startErr: unknown) {
    const msg = startErr instanceof Error ? startErr.message : String(startErr);
    throw new Error(
      `আর্থিক লেনদেনের জন্য ডেটাবেস ট্রানজেকশন সেশন শুরু করা সম্ভব হয়নি: ${msg}`
    );
  }

  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session!);
    });
    return result!;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("Transaction numbers are only allowed on a replica set") ||
      msg.includes("Transactions are not supported")
    ) {
      throw new Error(
        "আর্থিক লেনদেনের জন্য ডেটাবেস রেপ্লিকা সেট মাল্টি-ডকুমেন্ট ট্রানজেকশন আবশ্যক। ডেটা অখণ্ডতা রক্ষার স্বার্থে লেনদেন বন্ধ রাখা হয়েছে।"
      );
    }
    throw error;
  } finally {
    try {
      await session.endSession();
    } catch {
      // Ignore session end error
    }
  }
}

/**
 * Calculate author's balances from immutable financial records.
 *
 * RIGOROUS ACCOUNTING MODEL:
 * --------------------------
 * 1. lifetimeEarnings   = SUM(AUTHOR_EARNING) - SUM(REFUND)
 *    (Lifetime earnings never decrease when a withdrawal is made).
 * 2. withdrawnTotal     = SUM(WITHDRAWAL_PAID)
 * 3. activeReservations = MAX(0, SUM(WITHDRAWAL_RESERVED) - SUM(WITHDRAWAL_RELEASED))
 *    (Reservations exist only while an accepted withdrawal is waiting for payout).
 * 4. pendingRequests    = SUM(amount of PENDING withdrawals not yet accepted)
 * 5. pendingBalance     = activeReservations + pendingRequests
 *    (Total in-flight funds awaiting payout or review).
 * 6. availableBalance   = MAX(0, lifetimeEarnings - withdrawnTotal - pendingBalance)
 *    (Funds available for immediate new withdrawal requests).
 */
export async function calculateAuthorBalances(
  authorId: string | Types.ObjectId
): Promise<AuthorFinancialStats> {
  await dbConnect();
  const aId =
    typeof authorId === "string"
      ? new Types.ObjectId(authorId)
      : new Types.ObjectId(authorId.toString());

  // 1. Aggregate all ledger entries for this author
  const ledgerAgg = await FinancialLedger.aggregate<{
    _id: string;
    total: number;
  }>([
    { $match: { author: aId } },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let earningsSum = 0;
  let refundsSum = 0;
  let withdrawnFromLedger = 0;
  let reservedFromLedger = 0;
  let releasedFromLedger = 0;

  for (const row of ledgerAgg) {
    if (row._id === "AUTHOR_EARNING") {
      earningsSum += row.total;
    } else if (row._id === "REFUND") {
      refundsSum += row.total;
    } else if (row._id === "WITHDRAWAL_PAID") {
      withdrawnFromLedger += row.total;
    } else if (row._id === "WITHDRAWAL_RESERVED") {
      reservedFromLedger += row.total;
    } else if (row._id === "WITHDRAWAL_RELEASED") {
      releasedFromLedger += row.total;
    }
  }

  const lifetimeEarnings = Math.max(0, earningsSum - refundsSum);
  const activeReservations = Math.max(0, reservedFromLedger - releasedFromLedger);

  // 2. Aggregate PENDING withdrawal requests not yet accepted (no ledger entry created yet)
  const pendingRequestsAgg = await Withdrawal.aggregate<{
    total: number;
  }>([
    {
      $match: {
        author: aId,
        status: "PENDING",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  const pendingRequests =
    pendingRequestsAgg.length > 0 ? pendingRequestsAgg[0].total : 0;

  // Total in-flight / pending funds
  const pendingBalance = activeReservations + pendingRequests;

  // 3. Verify withdrawnTotal with Withdrawal collection (ensures cross-collection consistency)
  const paidWithdrawalsAgg = await Withdrawal.aggregate<{
    total: number;
  }>([
    {
      $match: {
        author: aId,
        status: "PAID",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  const withdrawnTotal = Math.max(
    paidWithdrawalsAgg.length > 0 ? paidWithdrawalsAgg[0].total : 0,
    withdrawnFromLedger
  );

  const availableBalance = Math.max(
    0,
    lifetimeEarnings - withdrawnTotal - pendingBalance
  );

  return {
    lifetimeEarnings,
    availableBalance,
    pendingBalance,
    withdrawnTotal,
  };
}

/**
 * Calculate overall platform financial statistics for the admin dashboard.
 */
export async function calculatePlatformStats(): Promise<PlatformFinancialStats> {
  await dbConnect();

  // Aggregate verified sales & commissions from ledger
  const ledgerTotals = await FinancialLedger.aggregate<{
    _id: string;
    total: number;
  }>([
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let totalVerifiedSales = 0;
  let totalPlatformCommission = 0;
  let totalAuthorEarnings = 0;

  for (const item of ledgerTotals) {
    if (item._id === "SALE") totalVerifiedSales += item.total;
    if (item._id === "PLATFORM_COMMISSION") totalPlatformCommission += item.total;
    if (item._id === "AUTHOR_EARNING") totalAuthorEarnings += item.total;
  }

  // Aggregate pending orders
  const pendingOrdersAgg = await Order.aggregate<{
    count: number;
    amount: number;
  }>([
    { $match: { status: "PENDING" } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        amount: { $sum: "$total" },
      },
    },
  ]);

  const pendingOrdersCount = pendingOrdersAgg[0]?.count ?? 0;
  const pendingOrdersAmount = pendingOrdersAgg[0]?.amount ?? 0;

  // Aggregate pending withdrawals (PENDING + ACCEPTED)
  const pendingWithdrawalsAgg = await Withdrawal.aggregate<{
    count: number;
    amount: number;
  }>([
    { $match: { status: { $in: ["PENDING", "ACCEPTED"] } } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
      },
    },
  ]);

  const pendingWithdrawalsCount = pendingWithdrawalsAgg[0]?.count ?? 0;
  const pendingWithdrawalsAmount = pendingWithdrawalsAgg[0]?.amount ?? 0;

  // Aggregate completed payouts (PAID)
  const completedPayoutsAgg = await Withdrawal.aggregate<{
    count: number;
    amount: number;
  }>([
    { $match: { status: "PAID" } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
      },
    },
  ]);

  const completedPayoutsCount = completedPayoutsAgg[0]?.count ?? 0;
  const completedPayoutsAmount = completedPayoutsAgg[0]?.amount ?? 0;

  return {
    totalVerifiedSales,
    totalPlatformCommission,
    totalAuthorEarnings,
    pendingOrdersCount,
    pendingOrdersAmount,
    pendingWithdrawalsCount,
    pendingWithdrawalsAmount,
    completedPayoutsCount,
    completedPayoutsAmount,
  };
}

/**
 * Approve a pending manual payment order atomically.
 *
 * Steps:
 * 1. Checks order is in PENDING status; atomically marks as PAID.
 * 2. Snapshots current platform commission percentage.
 * 3. Creates Purchase records granting reader access.
 * 4. Posts immutable FinancialLedger entries (SALE, AUTHOR_EARNING, PLATFORM_COMMISSION).
 * 5. Uses idempotency keys so repeated requests cannot duplicate records.
 */
export async function recordVerifiedSale(
  orderId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> {
  await dbConnect();

  // Retrieve current commission percentage
  const settings = await getPlatformSettings();
  const commissionPercent = settings.commissionPercent;

  return runInTransaction(async (session) => {
    // 1. Atomically transition order from PENDING to PAID
    const orderQuery = Order.findOneAndUpdate(
      { _id: orderId, status: "PENDING" },
      {
        status: "PAID",
        reviewedBy: new Types.ObjectId(adminUserId),
        reviewedAt: new Date(),
      },
      { returnDocument: "after" }
    );
    if (session) orderQuery.session(session);

    const order = (await orderQuery) as IOrderDocument | null;
    if (!order) {
      throw new Error("অর্ডারটি পাওয়া যায়নি অথবা ইতিমধ্যে প্রক্রিয়া করা হয়েছে।");
    }

    // Separation of duties: admin cannot approve their own purchase
    if (order.user.toString() === adminUserId.toString()) {
      throw new Error("অ্যাডমিন নিজের অর্ডারের পেমেন্ট নিজে অনুমোদন করতে পারবেন না।");
    }

    // 2. Process each item in order
    for (const item of order.items) {
        const bookQuery = Book.findById(item.book).select("author title price");
        if (session) bookQuery.session(session);
        const book = await bookQuery;

        if (!book) {
          throw new Error(`বইটি পাওয়া যায়নি: ${item.title}`);
        }

        // Check or create Purchase
        const purchaseQuery = Purchase.findOne({
          user: order.user,
          book: item.book,
          status: "ACTIVE",
        });
        if (session) purchaseQuery.session(session);
        let purchase = await purchaseQuery;

        if (!purchase) {
          const createPurchaseDocs = [
            {
              user: order.user,
              book: item.book,
              order: order._id as Types.ObjectId,
              price: item.price,
              currency: order.currency,
              status: "ACTIVE" as const,
              purchasedAt: new Date(),
            },
          ];
          const createdPurchases = await Purchase.create(createPurchaseDocs, {
            session,
          });
          purchase = createdPurchases[0];
        }

        // 3. Calculate snapshotted commission & earnings server-side
        const grossAmount = item.price;
        const commissionAmount = Math.round(
          (grossAmount * commissionPercent) / 100
        );
        const authorEarningAmount = grossAmount - commissionAmount;

        // 4. Create Ledger Entries
        const ledgerEntries = [
          {
            author: book.author,
            book: item.book,
            order: order._id,
            purchase: purchase._id,
            withdrawal: null,
            type: "SALE" as LedgerEntryType,
            amount: grossAmount,
            currency: order.currency,
            commissionPercent,
            commissionAmount,
            authorEarningAmount,
            idempotencyKey: `SALE:${order._id}:${item.book}`,
            description: `বই বিক্রয়: ${item.title} (অর্ডার #${String(order._id).slice(-6)})`,
          },
          {
            author: book.author,
            book: item.book,
            order: order._id,
            purchase: purchase._id,
            withdrawal: null,
            type: "AUTHOR_EARNING" as LedgerEntryType,
            amount: authorEarningAmount,
            currency: order.currency,
            commissionPercent,
            commissionAmount,
            authorEarningAmount,
            idempotencyKey: `AUTHOR_EARNING:${order._id}:${item.book}`,
            description: `লেখকের রয়্যালটি আয়: ${item.title} (অর্ডার #${String(order._id).slice(-6)})`,
          },
          {
            author: book.author,
            book: item.book,
            order: order._id,
            purchase: purchase._id,
            withdrawal: null,
            type: "PLATFORM_COMMISSION" as LedgerEntryType,
            amount: commissionAmount,
            currency: order.currency,
            commissionPercent,
            commissionAmount,
            authorEarningAmount,
            idempotencyKey: `PLATFORM_COMMISSION:${order._id}:${item.book}`,
            description: `প্ল্যাটফর্ম কমিশন (${commissionPercent}%): ${item.title} (অর্ডার #${String(order._id).slice(-6)})`,
          },
        ];

        await FinancialLedger.insertMany(ledgerEntries, { session });
      }

      return {
        success: true,
        message:
          "পেমেন্ট সফলভাবে অনুমোদিত হয়েছে এবং ক্রেতার লাইব্রেরিতে বইটি যুক্ত করা হয়েছে।",
      };
  });
}

/**
 * Reject a pending order with audit notes.
 * Does not grant access or author earnings.
 */
export async function rejectPendingOrder(
  orderId: string,
  adminUserId: string,
  note?: string
): Promise<{ success: boolean; message: string }> {
  await dbConnect();

  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "PENDING" },
    {
      status: "CANCELLED",
      adminNote: note || "অ্যাডমিন কর্তৃক পেমেন্ট যাচাই ব্যর্থ বা বাতিল হয়েছে।",
      reviewedBy: new Types.ObjectId(adminUserId),
      reviewedAt: new Date(),
    },
    { returnDocument: "after" }
  );

  if (!order) {
    throw new Error("অর্ডারটি পাওয়া যায়নি অথবা ইতিমধ্যে প্রক্রিয়া করা হয়েছে।");
  }

  return {
    success: true,
    message: "অর্ডারটি সফলভাবে বাতিল করা হয়েছে।",
  };
}

/**
 * Request an author withdrawal after server-side balance verification.
 * Enforces single-pending-request rule per author to prevent race condition double-spending.
 */
export async function requestAuthorWithdrawal(
  authorId: string,
  amount: number,
  payoutMethod: "BKASH" | "NAGAD",
  payoutAccountNumber: string
): Promise<{ success: boolean; withdrawalId: string; message: string }> {
  await dbConnect();

  if (amount < 100) {
    throw new Error("সর্বনিম্ন উত্তোলনের পরিমাণ ১০০ টাকা।");
  }

  const aId = new Types.ObjectId(authorId);

  return runInTransaction(async (session) => {
    // 1. Prevent concurrent pending withdrawal spam
    const existingPendingQuery = Withdrawal.findOne({
      author: aId,
      status: "PENDING",
    });
    if (session) existingPendingQuery.session(session);
    const existingPending = await existingPendingQuery;

    if (existingPending) {
      throw new Error(
        "আপনার একটি উত্তোলনের অনুরোধ ইতিমধ্যে পর্যালোচনার অপেক্ষায় রয়েছে। নতুন অনুরোধ করার পূর্বে সেটি পর্যালোচিত হওয়া পর্যন্ত অপেক্ষা করুন।"
      );
    }

    // 2. Verify author available balance
    const balances = await calculateAuthorBalances(authorId);
    if (amount > balances.availableBalance) {
      throw new Error(
        `পর্যাপ্ত ব্যালেন্স নেই। আপনার বর্তমান উত্তোলনযোগ্য ব্যালেন্স ${balances.availableBalance} টাকা।`
      );
    }

    // 3. Create Withdrawal record
    const createDocs = [
      {
        author: aId,
        amount,
        currency: "BDT",
        payoutMethod,
        payoutAccountNumber: payoutAccountNumber.trim(),
        status: "PENDING" as const,
      },
    ];

    try {
      const withdrawals = session
        ? await Withdrawal.create(createDocs, { session })
        : await Withdrawal.create(createDocs);

      const withdrawal = withdrawals[0];

      return {
        success: true,
        withdrawalId: String(withdrawal._id),
        message: "উত্তোলনের অনুরোধ সফলভাবে জমা হয়েছে। অ্যাডমিন পর্যালোচনার পর অর্থ পাঠানো হবে।",
      };
    } catch (createErr: unknown) {
      if (
        createErr &&
        typeof createErr === "object" &&
        "code" in createErr &&
        (createErr as { code: number }).code === 11000
      ) {
        throw new Error(
          "আপনার একটি উত্তোলনের অনুরোধ ইতিমধ্যে পর্যালোচনার অপেক্ষায় রয়েছে। নতুন অনুরোধ করার পূর্বে সেটি পর্যালোচিত হওয়া পর্যন্ত অপেক্ষা করুন।"
        );
      }
      throw createErr;
    }
  });
}

/**
 * Admin accepts a pending withdrawal request and creates a reservation entry.
 * Atomically updates status to ACCEPTED and posts WITHDRAWAL_RESERVED ledger entry.
 */
export async function acceptWithdrawalRequest(
  withdrawalId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> {
  await dbConnect();

  return runInTransaction(async (session) => {
    const updateQuery = Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: "PENDING" },
      {
        status: "ACCEPTED",
        reviewedBy: new Types.ObjectId(adminUserId),
        reviewedAt: new Date(),
      },
      { returnDocument: "after" }
    );
    if (session) updateQuery.session(session);

    const withdrawal = await updateQuery;
    if (!withdrawal) {
      throw new Error("উত্তোলন অনুরোধটি পাওয়া যায়নি বা ইতিমধ্যে পর্যালোচিত হয়েছে।");
    }

    // Create WITHDRAWAL_RESERVED ledger entry
    const ledgerDocs = [
      {
        author: withdrawal.author,
        book: null,
        order: null,
        purchase: null,
        withdrawal: withdrawal._id,
        type: "WITHDRAWAL_RESERVED" as LedgerEntryType,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        commissionPercent: null,
        commissionAmount: null,
        authorEarningAmount: null,
        idempotencyKey: `WITHDRAWAL_RESERVED:${withdrawal._id}`,
        description: `উত্তোলন তহবিল সংরক্ষণ: ৳${withdrawal.amount} (${withdrawal.payoutMethod})`,
      },
    ];

    const createdLedgers = await FinancialLedger.create(ledgerDocs, { session });
    const ledger = createdLedgers[0];
    withdrawal.reservedLedgerEntryId = ledger._id as Types.ObjectId;

    await withdrawal.save({ session });

    return {
      success: true,
      message: "উত্তোলন অনুরোধটি গৃহীত হয়েছে এবং তহবিল সংরক্ষণ করা হয়েছে।",
    };
  });
}

/**
 * Admin rejects a withdrawal request and releases reserved funds if needed.
 * Atomically transitions status to REJECTED and creates WITHDRAWAL_RELEASED ledger entry if previously ACCEPTED.
 */
export async function rejectWithdrawalRequest(
  withdrawalId: string,
  adminUserId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  await dbConnect();

  return runInTransaction(async (session) => {
    // Atomically claim the transition to prevent race conditions
    const updateQuery = Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: { $in: ["PENDING", "ACCEPTED"] } },
      {
        status: "REJECTED",
        reviewedBy: new Types.ObjectId(adminUserId),
        reviewedAt: new Date(),
        rejectionReason: reason || "অ্যাডমিন কর্তৃক বাতিল করা হয়েছে",
      }
    );
    updateQuery.session(session);

    const previousWithdrawal = await updateQuery;
    if (!previousWithdrawal) {
      throw new Error("উত্তোলন অনুরোধটি পাওয়া যায়নি বা বাতিল করা সম্ভব নয়।");
    }

    const wasAccepted = previousWithdrawal.status === "ACCEPTED";

    if (wasAccepted) {
      // Release reserved funds via ledger
      const ledgerDocs = [
        {
          author: previousWithdrawal.author,
          book: null,
          order: null,
          purchase: null,
          withdrawal: previousWithdrawal._id,
          type: "WITHDRAWAL_RELEASED" as LedgerEntryType,
          amount: previousWithdrawal.amount,
          currency: previousWithdrawal.currency,
          commissionPercent: null,
          commissionAmount: null,
          authorEarningAmount: null,
          idempotencyKey: `WITHDRAWAL_RELEASED:${previousWithdrawal._id}`,
          description: `উত্তোলন প্রত্যাখ্যানের কারণে সংরক্ষিত তহবিল অবমুক্ত: ৳${previousWithdrawal.amount}`,
        },
      ];

      const createdLedgers = await FinancialLedger.create(ledgerDocs, { session });
      const releaseLedger = createdLedgers[0];

      await Withdrawal.updateOne(
        { _id: withdrawalId },
        { $set: { settledLedgerEntryId: releaseLedger._id } },
        { session }
      );
    }

    return {
      success: true,
      message: "উত্তোলন অনুরোধটি প্রত্যাখ্যান করা হয়েছে এবং ব্যালেন্স অবমুক্ত হয়েছে।",
    };
  });
}

/**
 * Admin marks an accepted (or pending) withdrawal as paid with the payout transaction reference.
 *
 * Atomicity & Accounting Contract:
 * ---------------------------------
 * 1. Atomically transitions withdrawal to PAID.
 * 2. If the withdrawal was previously ACCEPTED (funds reserved in ledger), liquidates
 *    the reservation by creating a WITHDRAWAL_RELEASED ledger entry.
 * 3. Creates the final WITHDRAWAL_PAID ledger debit entry.
 * 4. This guarantees that reserved encumbrance and final payout never double-count.
 */
export async function markWithdrawalAsPaid(
  withdrawalId: string,
  adminUserId: string,
  paymentTransactionId: string
): Promise<{ success: boolean; message: string }> {
  await dbConnect();

  const txId = paymentTransactionId.trim();
  if (!txId) {
    throw new Error("পেমেন্ট ট্রানজেকশন আইডি প্রদান করা আবশ্যক।");
  }

  return runInTransaction(async (session) => {
    // 1. Atomically transition to PAID
    const updateQuery = Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: { $in: ["PENDING", "ACCEPTED"] } },
      {
        status: "PAID",
        paidBy: new Types.ObjectId(adminUserId),
        paidAt: new Date(),
        paymentTransactionId: txId,
      }
    );
    updateQuery.session(session);

    const previousWithdrawal = await updateQuery;
    if (!previousWithdrawal) {
      throw new Error("উত্তোলন অনুরোধটি পাওয়া যায়নি বা ইতিমধ্যে পরিশোধিত হয়েছে।");
    }

    const wasAccepted = previousWithdrawal.status === "ACCEPTED";

    // 2. Liquidate reservation if it was previously accepted
    if (wasAccepted) {
      const releaseDocs = [
        {
          author: previousWithdrawal.author,
          book: null,
          order: null,
          purchase: null,
          withdrawal: previousWithdrawal._id,
          type: "WITHDRAWAL_RELEASED" as LedgerEntryType,
          amount: previousWithdrawal.amount,
          currency: previousWithdrawal.currency,
          commissionPercent: null,
          commissionAmount: null,
          authorEarningAmount: null,
          idempotencyKey: `WITHDRAWAL_RELEASED_PAID:${previousWithdrawal._id}`,
          description: `পরিশোধ সম্পন্ন হওয়ায় সংরক্ষিত তহবিল অবমুক্ত: ৳${previousWithdrawal.amount}`,
        },
      ];

      await FinancialLedger.create(releaseDocs, { session });
    }

    // 3. Create final WITHDRAWAL_PAID ledger entry
    const paidDocs = [
      {
        author: previousWithdrawal.author,
        book: null,
        order: null,
        purchase: null,
        withdrawal: previousWithdrawal._id,
        type: "WITHDRAWAL_PAID" as LedgerEntryType,
        amount: previousWithdrawal.amount,
        currency: previousWithdrawal.currency,
        commissionPercent: null,
        commissionAmount: null,
        authorEarningAmount: null,
        idempotencyKey: `WITHDRAWAL_PAID:${previousWithdrawal._id}`,
        description: `পরিশোধিত উত্তোলন: ৳${previousWithdrawal.amount} (${previousWithdrawal.payoutMethod} - TrxID: ${txId})`,
      },
    ];

    const createdPaidLedgers = await FinancialLedger.create(paidDocs, { session });
    const paidLedger = createdPaidLedgers[0];

    await Withdrawal.updateOne(
      { _id: withdrawalId },
      { $set: { settledLedgerEntryId: paidLedger._id } },
      { session }
    );

    return {
      success: true,
      message: "উত্তোলন সফলভাবে পরিশোধিত হিসেবে চিহ্নিত করা হয়েছে।",
    };
  });
}

/**
 * Author cancels their own PENDING withdrawal request.
 */
export async function cancelAuthorWithdrawal(
  withdrawalId: string,
  authorId: string
): Promise<{ success: boolean; message: string }> {
  await dbConnect();

  const withdrawal = await Withdrawal.findOneAndUpdate(
    {
      _id: withdrawalId,
      author: new Types.ObjectId(authorId),
      status: "PENDING",
    },
    {
      status: "CANCELLED",
      cancellationReason: "লেখক কর্তৃক প্রত্যাহার করা হয়েছে",
    },
    { returnDocument: "after" }
  );

  if (!withdrawal) {
    throw new Error("উত্তোলন অনুরোধটি পাওয়া যায়নি অথবা এটি ইতিমধ্যে পর্যালোচিত হয়েছে।");
  }

  return {
    success: true,
    message: "উত্তোলন অনুরোধটি প্রত্যাহার করা হয়েছে।",
  };
}
