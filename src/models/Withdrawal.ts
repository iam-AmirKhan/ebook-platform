/**
 * Withdrawal — author payout request lifecycle.
 *
 * STATE MACHINE
 * -------------
 * PENDING   → ACCEPTED (admin accepts, funds reserved in ledger)
 * PENDING   → REJECTED (admin rejects, no ledger change)
 * ACCEPTED  → PAID     (admin marks paid, ledger WITHDRAWAL_PAID entry created)
 * ACCEPTED  → REJECTED (admin rejects after acceptance, WITHDRAWAL_RELEASED entry created)
 * PENDING   → CANCELLED (author cancels before admin acts)
 *
 * SECURITY
 * --------
 * - Amount is validated server-side against available balance before creation.
 * - Funds are reserved atomically via FinancialLedger WITHDRAWAL_RESERVED entry.
 * - Concurrent requests cannot spend the same balance twice because balance
 *   is calculated from immutable ledger entries, not a mutable field.
 * - Payout details (account number) are never calculated/trusted from client input.
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type WithdrawalStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PAID"
  | "REJECTED"
  | "CANCELLED";

export type PayoutMethod = "BKASH" | "NAGAD";

export interface IWithdrawal {
  author: Types.ObjectId;

  /** Amount requested by the author (validated server-side) */
  amount: number;
  currency: string;

  payoutMethod: PayoutMethod;

  /** Author's account number for the payout — collected at request time */
  payoutAccountNumber: string;

  status: WithdrawalStatus;

  /** Admin who reviewed this request */
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;

  /** Admin who marked the payout as completed */
  paidBy: Types.ObjectId | null;
  paidAt: Date | null;

  /** External payment transaction reference provided by admin when paying out */
  paymentTransactionId: string | null;

  rejectionReason: string | null;

  /** Author-initiated cancellation reason */
  cancellationReason: string | null;

  /** Reference to the FinancialLedger WITHDRAWAL_RESERVED entry */
  reservedLedgerEntryId: Types.ObjectId | null;

  /** Reference to the FinancialLedger WITHDRAWAL_PAID or WITHDRAWAL_RELEASED entry */
  settledLedgerEntryId: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface IWithdrawalDocument extends IWithdrawal, Document {}

const WithdrawalSchema = new Schema<IWithdrawalDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "Author",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      default: "BDT",
      uppercase: true,
      trim: true,
    },
    payoutMethod: {
      type: String,
      enum: ["BKASH", "NAGAD"],
      required: true,
    },
    payoutAccountNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "PAID", "REJECTED", "CANCELLED"],
      default: "PENDING",
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paymentTransactionId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    cancellationReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    reservedLedgerEntryId: {
      type: Schema.Types.ObjectId,
      ref: "FinancialLedger",
      default: null,
    },
    settledLedgerEntryId: {
      type: Schema.Types.ObjectId,
      ref: "FinancialLedger",
      default: null,
    },
  },
  { timestamps: true }
);

WithdrawalSchema.index({ author: 1, status: 1, createdAt: -1 });
WithdrawalSchema.index({ status: 1, createdAt: -1 });
WithdrawalSchema.index({ createdAt: -1 });
// Enforce at most one PENDING withdrawal per author at the database engine level
WithdrawalSchema.index(
  { author: 1, status: 1 },
  {
    name: "unique_author_pending_withdrawal",
    unique: true,
    partialFilterExpression: { status: "PENDING" },
  }
);

// Prevent OverwriteModelError during Next.js hot reload
const Withdrawal: Model<IWithdrawalDocument> =
  mongoose.models.Withdrawal ||
  mongoose.model<IWithdrawalDocument>("Withdrawal", WithdrawalSchema);

export default Withdrawal;
