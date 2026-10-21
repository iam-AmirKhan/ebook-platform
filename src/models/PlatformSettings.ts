/**
 * PlatformSettings — singleton document for admin-configurable platform values.
 *
 * There is exactly ONE document in this collection. All access must go through
 * the server-side DAL; never expose raw commission rates to clients before
 * server-side calculation.
 *
 * Design:
 * - commissionPercent: Platform's cut per sale (0–100). Snapshotted into each
 *   ledger entry; changing this value does NOT retroactively alter past entries.
 * - bkashAccountNumber / nagadAccountNumber: Instructions shown to buyers;
 *   not API credentials — no payment gateway is integrated.
 * - bkashInstructions / nagadInstructions: Free-text shown on checkout.
 * - paymentMethodsEnabled: Which manual methods the admin has turned on.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPlatformSettings {
  /** Commission percentage the platform retains per sale (0–100, e.g. 30 = 30%) */
  commissionPercent: number;

  /** Whether each manual payment method is enabled for checkout */
  bkashEnabled: boolean;
  nagadEnabled: boolean;

  /** Displayed account number / merchant number — NOT secret API keys */
  bkashAccountNumber: string;
  nagadAccountNumber: string;

  /** Free-text checkout instructions per method */
  bkashInstructions: string;
  nagadInstructions: string;

  updatedAt: Date;
  createdAt: Date;
}

export interface IPlatformSettingsDocument extends IPlatformSettings, Document {}

const PlatformSettingsSchema = new Schema<IPlatformSettingsDocument>(
  {
    commissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 30,
    },
    bkashEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    nagadEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    bkashAccountNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 50,
    },
    nagadAccountNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 50,
    },
    bkashInstructions: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    nagadInstructions: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

// Prevent OverwriteModelError during Next.js hot reload
const PlatformSettings: Model<IPlatformSettingsDocument> =
  mongoose.models.PlatformSettings ||
  mongoose.model<IPlatformSettingsDocument>(
    "PlatformSettings",
    PlatformSettingsSchema
  );

export default PlatformSettings;
