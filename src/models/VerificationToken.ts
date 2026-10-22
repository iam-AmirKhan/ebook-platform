import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type TokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export interface IVerificationToken {
  userId: Types.ObjectId;
  email: string;
  tokenHash: string;
  type: TokenType;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVerificationTokenDocument
  extends IVerificationToken,
    Document {}

const VerificationTokenSchema = new Schema<IVerificationTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prune expired tokens after 7 days
VerificationTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

const VerificationToken: Model<IVerificationTokenDocument> =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationTokenDocument>(
    "VerificationToken",
    VerificationTokenSchema
  );

export default VerificationToken;
