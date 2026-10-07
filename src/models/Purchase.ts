import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type PurchaseStatus = "ACTIVE" | "REFUNDED" | "CANCELLED";

export interface IPurchase {
  user: Types.ObjectId;
  book: Types.ObjectId;
  order: Types.ObjectId;
  price: number;
  currency: string;
  status: PurchaseStatus;
  purchasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPurchaseDocument extends IPurchase, Document {}

const PurchaseSchema = new Schema<IPurchaseDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    book: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    price: {
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
    status: {
      type: String,
      enum: ["ACTIVE", "REFUNDED", "CANCELLED"],
      default: "ACTIVE",
      required: true,
    },
    purchasedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on user + book for efficient ownership queries.
// NOT unique — a refunded/cancelled purchase may exist historically,
// and a future repurchase must be possible. The application/service
// layer enforces the one-ACTIVE-purchase-per-user/book business rule.
PurchaseSchema.index({ user: 1, book: 1 });

// Prevent OverwriteModelError during Next.js hot reload
const Purchase: Model<IPurchaseDocument> =
  mongoose.models.Purchase ||
  mongoose.model<IPurchaseDocument>("Purchase", PurchaseSchema);

export default Purchase;
