import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AuthorApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IAuthorApplicationSocialLink {
  platform: string;
  url: string;
}

export interface IAuthorApplication {
  user: Types.ObjectId;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  occupation?: string | null;
  socialLinks?: IAuthorApplicationSocialLink[];
  bio: string;
  reason: string;
  status: AuthorApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthorApplicationDocument
  extends IAuthorApplication,
    Document {}

const AuthorApplicationSocialLinkSchema =
  new Schema<IAuthorApplicationSocialLink>(
    {
      platform: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
      },
      url: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
      },
    },
    { _id: false }
  );

const AuthorApplicationSchema = new Schema<IAuthorApplicationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 320,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    socialLinks: {
      type: [AuthorApplicationSocialLinkSchema],
      default: [],
    },
    bio: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AuthorApplicationSchema.index(
  { user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PENDING" },
    name: "unique_pending_author_application_per_user",
  }
);

AuthorApplicationSchema.index({ user: 1, createdAt: -1 });

// Prevent OverwriteModelError during Next.js hot reload
const AuthorApplication: Model<IAuthorApplicationDocument> =
  mongoose.models.AuthorApplication ||
  mongoose.model<IAuthorApplicationDocument>(
    "AuthorApplication",
    AuthorApplicationSchema
  );

export default AuthorApplication;
