import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type IReadingProgress = {
  user: Types.ObjectId;
  book: Types.ObjectId;
  progress: number;
  currentPage: number;
  completed: boolean;
  lastReadAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export interface IReadingProgressDocument extends IReadingProgress, Document {}

const ReadingProgressSchema = new Schema<IReadingProgressDocument>(
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
    progress: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    currentPage: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    completed: {
      type: Boolean,
      required: true,
      default: false,
    },
    lastReadAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ReadingProgressSchema.index({ user: 1, book: 1 }, { unique: true });

const ReadingProgress: Model<IReadingProgressDocument> =
  mongoose.models.ReadingProgress ||
  mongoose.model<IReadingProgressDocument>(
    "ReadingProgress",
    ReadingProgressSchema
  );

export default ReadingProgress;
