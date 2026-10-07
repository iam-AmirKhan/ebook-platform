import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type ReviewStatus = "PUBLISHED" | "HIDDEN";

export interface IReview {
  user: Types.ObjectId;
  book: Types.ObjectId;
  rating: number;
  comment: string;
  status: ReviewStatus;
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
    },
    book: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
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
    },
    status: {
      type: String,
      enum: ["PUBLISHED", "HIDDEN"],
      default: "PUBLISHED",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index — enforces one review per user per book at the
// database level. A user may review many books; a book may receive
// reviews from many users. The uniqueness applies only to the pair.
ReviewSchema.index({ user: 1, book: 1 }, { unique: true });

// Prevent OverwriteModelError during Next.js hot reload
const Review: Model<IReviewDocument> =
  mongoose.models.Review ||
  mongoose.model<IReviewDocument>("Review", ReviewSchema);

export default Review;
