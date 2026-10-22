/**
 * Password Reset Email Notification Dispatcher
 *
 * Dispatches a password reset link to the user's registered email address.
 * Uses Resend REST API via native server-side fetch with zero extra dependencies.
 *
 * Safety requirements:
 * - Never log secrets, passwords, or raw reset tokens.
 * - Missing environment variables or API errors fail gracefully without crashing calling code.
 * - Single-use token link with expiration.
 */

export interface PasswordResetParams {
  recipientEmail: string;
  userName?: string | null;
  resetUrl: string;
}

export interface NotificationResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPasswordResetEmail(
  params: PasswordResetParams
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  // If environment variables are missing, skip gracefully without throwing
  if (!apiKey || !fromEmail) {
    console.warn(
      "[Notification] Skipped password reset email: RESEND_API_KEY or RESEND_FROM_EMAIL is not set in environment."
    );
    return { success: false, skipped: true, error: "CREDENTIALS_NOT_CONFIGURED" };
  }

  const recipientEmail = params.recipientEmail?.trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn(
      "[Notification] Skipped password reset email: Invalid recipient email."
    );
    return { success: false, skipped: true, error: "INVALID_RECIPIENT_EMAIL" };
  }

  const userDisplay = escapeHtml(params.userName?.trim() || "সম্মানিত পাঠক");
  const resetUrl = params.resetUrl;

  const subject = `[Pustoka] পাসওয়ার্ড রিসেট করার নির্দেশাবলী`;

  const textContent = [
    `প্রিয় ${params.userName?.trim() || "সম্মানিত পাঠক"},`,
    ``,
    `আপনার Pustoka অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার একটি অনুরোধ পাওয়া গেছে।`,
    `নতুন পাসওয়ার্ড সেট করতে নিচের লিঙ্কে ক্লিক করুন:`,
    ``,
    resetUrl,
    ``,
    `এই লিঙ্কটি আগামী ১ ঘণ্টার জন্য কার্যকর থাকবে এবং শুধুমাত্র একবার ব্যবহার করা যাবে।`,
    `আপনি যদি পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন, তবে কোনো চিন্তার কারণ নেই; আপনার পাসওয়ার্ড পরিবর্তন হবে না এবং আপনার অ্যাকাউন্ট সুরক্ষিত থাকবে।`,
    ``,
    `ধন্যবাদ,`,
    `Pustoka টীম`,
  ].join("\n");

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #111827; margin-top: 0; font-size: 20px;">পাসওয়ার্ড রিসেট অনুরোধ</h2>
      <p style="font-size: 15px; color: #4b5563;">প্রিয় <strong>${userDisplay}</strong>,</p>
      <p style="font-size: 15px; color: #4b5563;">
        আপনার Pustoka অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার একটি অনুরোধ পাওয়া গেছে। একটি নতুন পাসওয়ার্ড সেট করতে নিচের বাটনে ক্লিক করুন:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 15px;">
          পাসওয়ার্ড রিসেট করুন
        </a>
      </div>

      <p style="font-size: 13px; color: #6b7280;">
        বাটনটিতে ক্লিক করতে সমস্যা হলে নিচের লিঙ্কটি কপি করে ব্রাউজারে পেস্ট করুন:<br />
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>

      <div style="background-color: #f9fafb; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 24px 0; border-radius: 4px; font-size: 13px; color: #4b5563;">
        নিরাপত্তা দ্রষ্টব্য: এই রিসেট লিঙ্কটি আগামী <strong>১ ঘণ্টার</strong> জন্য কার্যকর এবং একবার ব্যবহারের পর বাতিল হয়ে যাবে। আপনি যদি পাসওয়ার্ড রিসেট করতে না চেয়ে থাকেন, তবে কোনো পদক্ষেপের প্রয়োজন নেই।
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        Pustoka Platform • বাংলা ইবুক ও লেখক মঞ্চ
      </p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject,
        text: textContent,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      console.error(
        `[Notification] Resend API error: Failed to send password reset email (HTTP ${response.status}).`
      );
      return { success: false, error: `API_STATUS_${response.status}` };
    }

    return { success: true };
  } catch (error) {
    const safeErrorMessage =
      error instanceof Error ? error.message : "Network/fetch error";
    console.error(
      `[Notification] Error sending password reset email: ${safeErrorMessage}`
    );
    return { success: false, error: safeErrorMessage };
  }
}
