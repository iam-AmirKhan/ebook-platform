/**
 * FinancialLedger — immutable, append-only audit trail for all financial events.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * 1. Append-only: entries are never deleted or modified post-creation.
 * 2. Commission snapshotted: commissionPercent and commissionAmount are captured
 *    at the time of the sale. Future admin changes do not alter history.
 * 3. Double-entry consistency: each SALE creates both an AUTHOR_EARNING entry
 *    and a PLATFORM_COMMISSION entry in the same operation.
 * 4. Idempotency key: the `idempotencyKey` field (unique index) prevents
 *    duplicate ledger entries for the same event.
 *
 * Entry Types
 * -----------
 * - SALE:                 Gross sale amount for a book purchase.
 * - AUTHOR_EARNING:       Net amount credited to the author (gross - commission).
 * - PLATFORM_COMMISSION:  Platform's cut retained from a sale.
 * - WITHDRAWAL_RESERVED:  Funds reserved when a withdrawal request is accepted.
 * - WITHDRAWAL_RELEASED:  Reservation liquidated on final payout, or reversed on rejection.
 * - WITHDRAWAL_PAID:      Final payout debit when admin marks as paid.
 * - REFUND:               Reversal of a previous sale (author earning reversed).
 *
 * Balance calculation:
 *   lifetimeEarnings   = SUM(AUTHOR_EARNING) - SUM(REFUND)
 *   withdrawnTotal     = SUM(WITHDRAWAL_PAID)
 *   activeReservations = SUM(WITHDRAWAL_RESERVED) - SUM(WITHDRAWAL_RELEASED)
 *   pendingBalance     = activeReservations + SUM(PENDING Withdrawals)
 *   availableBalance   = MAX(0, lifetimeEarnings - withdrawnTotal - pendingBalance)
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type LedgerEntryType =
  | "SALE"
  | "AUTHOR_EARNING"
  | "PLATFORM_COMMISSION"
  | "WITHDRAWAL_RESERVED"
  | "WITHDRAWAL_RELEASED"
  | "WITHDRAWAL_PAID"
  | "REFUND";

export interface IFinancialLedger {
  /** The author whose balance is affected (null for platform-only entries) */
  author: Types.ObjectId | null;

  /** The book involved in the transaction (null for withdrawal entries) */
  book: Types.ObjectId | null;

  /** The order this ledger entry relates to (null for withdrawal-only entries) */
  order: Types.ObjectId | null;

  /** The purchase record this ledger entry relates to (null for non-sale entries) */
  purchase: Types.ObjectId | null;

  /** The withdrawal request this entry relates to (null for sale entries) */
  withdrawal: Types.ObjectId | null;

  type: LedgerEntryType;

  /**
   * Amount in platform currency (BDT). Always positive.
   * The entry type determines whether it adds or subtracts from balance.
   */
  amount: number;

  currency: string;

  /**
   * Commission % snapshotted at time of sale (null for non-sale entries).
   * Historical entries are unaffected by future admin commission changes.
   */
  commissionPercent: number | null;

  /**
   * Platform commission amount snapshotted at time of sale.
   */
  commissionAmount: number | null;

  /**
   * Author net earning snapshotted at time of sale.
   */
  authorEarningAmount: number | null;

  /**
   * Unique key per business event to prevent duplicate processing.
   * Format: "<type>:<orderId>" for sales, "<type>:<withdrawalId>" for payouts.
   */
  idempotencyKey: string;

  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFinancialLedgerDocument extends IFinancialLedger, Document {}

const FinancialLedgerSchema = new Schema<IFinancialLedgerDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "Author",
      default: null,
      index: true,
    },
    book: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      default: null,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    purchase: {
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },
    withdrawal: {
      type: Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "SALE",
        "AUTHOR_EARNING",
        "PLATFORM_COMMISSION",
        "WITHDRAWAL_RESERVED",
        "WITHDRAWAL_RELEASED",
        "WITHDRAWAL_PAID",
        "REFUND",
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "BDT",
      uppercase: true,
      trim: true,
    },
    commissionPercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    authorEarningAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    // Prevent accidental updates to ledger entries
    strict: true,
  }
);

// Compound indexes for common queries
FinancialLedgerSchema.index({ author: 1, type: 1, createdAt: -1 });
FinancialLedgerSchema.index({ author: 1, createdAt: -1 });
FinancialLedgerSchema.index({ order: 1, type: 1 });
FinancialLedgerSchema.index({ withdrawal: 1, type: 1 });
FinancialLedgerSchema.index({ book: 1, type: 1, createdAt: -1 });
FinancialLedgerSchema.index({ createdAt: -1 });

// Prevent OverwriteModelError during Next.js hot reload
const FinancialLedger: Model<IFinancialLedgerDocument> =
  mongoose.models.FinancialLedger ||
  mongoose.model<IFinancialLedgerDocument>(
    "FinancialLedger",
    FinancialLedgerSchema
  );

export default FinancialLedger;
