import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentMethod = "MOCK" | "SSLCOMMERZ" | "BKASH" | "NAGAD";

export interface IOrderItem {
  book: Types.ObjectId;
  title: string;
  price: number;
  quantity: number;
}

export interface IOrder {
  user: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionId?: string | null;
  senderNumber?: string | null;
  adminNote?: string | null;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDocument extends IOrder, Document {}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    book: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length >= 1,
        message: "An order must contain at least one item.",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
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
    paymentMethod: {
      type: String,
      enum: ["MOCK", "SSLCOMMERZ", "BKASH", "NAGAD"],
      required: true,
    },
    transactionId: {
      type: String,
      default: null,
      trim: true,
    },
    senderNumber: {
      type: String,
      default: null,
      trim: true,
    },
    adminNote: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
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
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user order history queries
OrderSchema.index({ user: 1, createdAt: -1 });

// Database-level enforcement of unique transaction ID across active/pending orders
OrderSchema.index(
  { transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      transactionId: { $type: "string" },
      status: { $in: ["PENDING", "PAID"] },
    },
  }
);

// Prevent OverwriteModelError during Next.js hot reload
const Order: Model<IOrderDocument> =
  mongoose.models.Order ||
  mongoose.model<IOrderDocument>("Order", OrderSchema);

export default Order;
