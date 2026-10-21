"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  recordVerifiedSale,
  rejectPendingOrder,
  acceptWithdrawalRequest,
  rejectWithdrawalRequest,
  markWithdrawalAsPaid,
} from "@/lib/services/finance";
import dbConnect from "@/lib/db/mongoose";
import PlatformSettings from "@/models/PlatformSettings";

export interface AdminFinanceActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Approve a pending manual payment order.
 * Atomically creates reader Purchase, snapshot-records sale and author royalty in FinancialLedger.
 */
export async function approveOrderAction(
  orderId: string
): Promise<AdminFinanceActionResult> {
  const admin = await requireAdmin();

  try {
    const result = await recordVerifiedSale(orderId, admin.id);
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/orders");
    revalidatePath("/author");
    revalidatePath("/account");
    return {
      success: true,
      message: result.message,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "অর্ডার অনুমোদন ব্যর্থ হয়েছে।";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Reject a pending manual payment order with an audit note.
 */
export async function rejectOrderAction(
  orderId: string,
  note?: string
): Promise<AdminFinanceActionResult> {
  const admin = await requireAdmin();

  try {
    const result = await rejectPendingOrder(orderId, admin.id, note);
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/orders");
    revalidatePath("/account");
    return {
      success: true,
      message: result.message,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "অর্ডার বাতিলকরণ ব্যর্থ হয়েছে।";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Accept an author's withdrawal request and reserve funds in the ledger.
 */
export async function acceptWithdrawalAction(
  withdrawalId: string
): Promise<AdminFinanceActionResult> {
  const admin = await requireAdmin();

  try {
    const result = await acceptWithdrawalRequest(withdrawalId, admin.id);
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/withdrawals");
    revalidatePath("/author");
    return {
      success: true,
      message: result.message,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "উত্তোলন অনুরোধ গ্রহণ করা যায়নি।";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Reject an author's withdrawal request and release any reserved funds.
 */
export async function rejectWithdrawalAction(
  withdrawalId: string,
  reason?: string
): Promise<AdminFinanceActionResult> {
  const admin = await requireAdmin();

  try {
    const result = await rejectWithdrawalRequest(withdrawalId, admin.id, reason);
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/withdrawals");
    revalidatePath("/author");
    return {
      success: true,
      message: result.message,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "উত্তোলন প্রত্যাখ্যান করা যায়নি।";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Mark a withdrawal as completed/paid with the payout reference transaction ID.
 */
export async function markWithdrawalPaidAction(
  withdrawalId: string,
  paymentTransactionId: string
): Promise<AdminFinanceActionResult> {
  const admin = await requireAdmin();

  if (!paymentTransactionId || !paymentTransactionId.trim()) {
    return {
      success: false,
      error: "পেমেন্ট ট্রানজেকশন আইডি (TrxID) প্রদান করা আবশ্যক।",
    };
  }

  try {
    const result = await markWithdrawalAsPaid(
      withdrawalId,
      admin.id,
      paymentTransactionId
    );
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/withdrawals");
    revalidatePath("/author");
    return {
      success: true,
      message: result.message,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "উত্তোলন পরিশোধ সম্পন্ন করা যায়নি।";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Update platform commission percentage and manual payment settings.
 */
export async function updatePlatformSettingsAction(
  _prev: AdminFinanceActionResult | null,
  formData: FormData
): Promise<AdminFinanceActionResult> {
  await requireAdmin();

  const commissionPercentRaw = formData.get("commissionPercent");
  const bkashEnabled = formData.get("bkashEnabled") === "on" || formData.get("bkashEnabled") === "true";
  const nagadEnabled = formData.get("nagadEnabled") === "on" || formData.get("nagadEnabled") === "true";
  const bkashAccountNumber = (formData.get("bkashAccountNumber") as string)?.trim() ?? "";
  const nagadAccountNumber = (formData.get("nagadAccountNumber") as string)?.trim() ?? "";
  const bkashInstructions = (formData.get("bkashInstructions") as string)?.trim() ?? "";
  const nagadInstructions = (formData.get("nagadInstructions") as string)?.trim() ?? "";

  const commissionPercent = Number(commissionPercentRaw);

  if (isNaN(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    return {
      success: false,
      error: "কমিশন শতকরা হার ০ থেকে ১০০ এর মধ্যে হতে হবে।",
    };
  }

  await dbConnect();

  const updated = await PlatformSettings.findOneAndUpdate(
    {},
    {
      commissionPercent,
      bkashEnabled,
      nagadEnabled,
      bkashAccountNumber,
      nagadAccountNumber,
      bkashInstructions,
      nagadInstructions,
    },
    { new: true, upsert: true }
  );

  if (!updated) {
    return {
      success: false,
      error: "সেটিংস সংরক্ষণ করা যায়নি।",
    };
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/settings");

  return {
    success: true,
    message: "প্ল্যাটফর্মের আর্থিক সেটিংস সফলভাবে আপডেট করা হয়েছে।",
  };
}
