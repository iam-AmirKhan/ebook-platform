import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type BookStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface IBook {
  title: string;
  slug: string;
  description: string;
  coverImage?: string | null;
  author: Types.ObjectId;
  category: Types.ObjectId;
  price: number;
  discountPrice?: number | null;
  currency: string;
  contentUrl?: string | null;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookDocument extends IBook, Document {}

const BookSchema = new Schema<IBookDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
      default: null,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "Author",
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "BDT",
      uppercase: true,
      trim: true,
    },
    contentUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent OverwriteModelError during Next.js hot reload
const Book: Model<IBookDocument> =
  mongoose.models.Book ||
  mongoose.model<IBookDocument>("Book", BookSchema);

export default Book;
