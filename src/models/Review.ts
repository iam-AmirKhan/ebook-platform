import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED" | "HIDDEN";

export interface IReview {
  user: Types.ObjectId;
  book: Types.ObjectId;
  rating: number;
  comment: string;
  status: ReviewStatus;
  moderatedBy?: Types.ObjectId | null;
  moderatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewDocument extends IReview, Document {}

const ReviewSchema = new Schema<IReviewDocument>(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "PUBLISHED", "HIDDEN"],
      default: "PENDING",
      required: true,
      index: true,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce one review per user per book
ReviewSchema.index({ user: 1, book: 1 }, { unique: true });
// Compound indexes for high-throughput public rating lookups and admin moderation filtering
ReviewSchema.index({ book: 1, status: 1 });
ReviewSchema.index({ status: 1, createdAt: -1 });

// Prevent OverwriteModelError during Next.js hot reload
const Review: Model<IReviewDocument> =
  mongoose.models.Review ||
  mongoose.model<IReviewDocument>("Review", ReviewSchema);

export default Review;
