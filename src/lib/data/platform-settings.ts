import dbConnect from "@/lib/db/mongoose";
import PlatformSettings, {
  type IPlatformSettingsDocument,
} from "@/models/PlatformSettings";

export interface PublicPaymentSettings {
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  bkashAccountNumber: string;
  nagadAccountNumber: string;
  bkashInstructions: string;
  nagadInstructions: string;
}

export interface AdminPlatformSettings extends PublicPaymentSettings {
  _id: string;
  commissionPercent: number;
  updatedAt: string;
}

export const DEFAULT_SETTINGS = {
  commissionPercent: 30,
  bkashEnabled: false,
  nagadEnabled: false,
  bkashAccountNumber: "",
  nagadAccountNumber: "",
  bkashInstructions:
    "bKash অ্যাপ বা *247# ডায়াল করে উপরের নম্বরে 'Send Money' করুন। রেফারেন্সে আপনার মোবাইল নম্বর দিন এবং সফল লেনদেনের পর ট্রানজেকশন আইডি (TrxID) নিচে দিন।",
  nagadInstructions:
    "Nagad অ্যাপ বা *167# ডায়াল করে উপরের নম্বরে 'Send Money' করুন। রেফারেন্সে আপনার মোবাইল নম্বর দিন এবং সফল লেনদেনের পর ট্রানজেকশন আইডি (TrxID) নিচে দিন।",
};

/**
 * Retrieve or initialize the singleton PlatformSettings document.
 * Safe for internal and admin data access.
 */
export async function getPlatformSettings(): Promise<AdminPlatformSettings> {
  await dbConnect();

  let settings = await PlatformSettings.findOne().lean<IPlatformSettingsDocument | null>();

  if (!settings) {
    // Initialize default document
    const created = await PlatformSettings.create(DEFAULT_SETTINGS);
    settings = created.toObject();
  }

  const rawBkashNumber =
    typeof settings.bkashAccountNumber === "string"
      ? settings.bkashAccountNumber.trim()
      : "";
  const rawNagadNumber =
    typeof settings.nagadAccountNumber === "string"
      ? settings.nagadAccountNumber.trim()
      : "";

  // Do not enable a payment method unless it has a valid configured account number
  const bkashEnabled = Boolean(settings.bkashEnabled) && rawBkashNumber.length > 0;
  const nagadEnabled = Boolean(settings.nagadEnabled) && rawNagadNumber.length > 0;

  return {
    _id: String(settings._id),
    commissionPercent: settings.commissionPercent ?? 30,
    bkashEnabled,
    nagadEnabled,
    bkashAccountNumber: rawBkashNumber,
    nagadAccountNumber: rawNagadNumber,
    bkashInstructions: settings.bkashInstructions || DEFAULT_SETTINGS.bkashInstructions,
    nagadInstructions: settings.nagadInstructions || DEFAULT_SETTINGS.nagadInstructions,
    updatedAt:
      settings.updatedAt instanceof Date
        ? settings.updatedAt.toISOString()
        : String(settings.updatedAt ?? new Date().toISOString()),
  };
}

/**
 * Public payment settings for checkout display.
 * Never exposes platform commission rate or internal credentials.
 */
export async function getPublicPaymentSettings(): Promise<PublicPaymentSettings> {
  const settings = await getPlatformSettings();
  return {
    bkashEnabled: settings.bkashEnabled,
    nagadEnabled: settings.nagadEnabled,
    bkashAccountNumber: settings.bkashAccountNumber,
    nagadAccountNumber: settings.nagadAccountNumber,
    bkashInstructions: settings.bkashInstructions,
    nagadInstructions: settings.nagadInstructions,
  };
}
