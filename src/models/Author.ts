import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AuthorStatus = "ACTIVE" | "INACTIVE" | "REJECTED";

export interface IAuthor {
  user: Types.ObjectId;
  penName: string;
  slug: string;
  bio?: string | null;
  profileImage?: string | null;
  status: AuthorStatus;
  hiddenAt?: Date | null;
  hiddenBy?: Types.ObjectId | null;
  rejectedAt?: Date | null;
  rejectedBy?: Types.ObjectId | null;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthorDocument extends IAuthor, Document {}

const AuthorSchema = new Schema<IAuthorDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    penName: {
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
    bio: {
      type: String,
      default: null,
      trim: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "REJECTED"],
      default: "ACTIVE",
      required: true,
    },
    hiddenAt: {
      type: Date,
      default: null,
    },
    hiddenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent OverwriteModelError during Next.js hot reload
const Author: Model<IAuthorDocument> =
  mongoose.models.Author ||
  mongoose.model<IAuthorDocument>("Author", AuthorSchema);

export default Author;
