import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type BookStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

// ---------------------------------------------------------------------------
// Chapter subdocument
// ---------------------------------------------------------------------------

export interface IChapter {
  order: number;       // 1-based sort order
  title: string;       // chapter heading shown in TOC
  isPreview: boolean;  // true → full content visible to everyone
  teaser: string;      // short excerpt always shown (no unlock required)
  content: string;     // full chapter text — NEVER sent to unauthorized clients
}

const ChapterSchema = new Schema<IChapter>(
  {
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isPreview: {
      type: Boolean,
      required: true,
      default: false,
    },
    teaser: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Book document
// ---------------------------------------------------------------------------

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
  contentUrl?: string | null;  // Reserved for future full-PDF delivery via R2
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;

  // ---------------------------------------------------------------------------
  // Phase 6 additions — all optional for backward compatibility
  // ---------------------------------------------------------------------------
  /** Display language(s) of the book, e.g. "Bangla", "English", "Bilingual" */
  language?: string | null;

  /**
   * A 1–3 sentence marketing hook shown prominently on the details page.
   * Distinct from `description` which is the full "About this book" prose.
   */
  summary?: string | null;

  /** Ordered bullet-point outcomes shown as "What you'll learn" */
  learningOutcomes?: string[];

  /** Ordered chapter list. Full content is withheld from unauthorized users server-side. */
  chapters?: IChapter[];
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

    // -------------------------------------------------------------------------
    // Phase 6 additions
    // -------------------------------------------------------------------------
    language: {
      type: String,
      default: null,
      trim: true,
    },
    summary: {
      type: String,
      default: null,
      trim: true,
    },
    learningOutcomes: {
      type: [String],
      default: [],
    },
    chapters: {
      type: [ChapterSchema],
      default: [],
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
