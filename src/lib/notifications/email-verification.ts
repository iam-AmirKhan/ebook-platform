/**
 * Author Email Change Verification Email Dispatcher
 *
 * Dispatches a secure verification email to the author's new email address.
 * Uses Resend REST API via native server-side fetch with zero extra dependencies.
 *
 * Safety requirements:
 * - Never log secrets or credentials.
 * - Missing environment variables or API errors must fail gracefully and never crash calling code.
 * - Verification link contains the one-time token.
 */

export interface EmailVerificationParams {
  recipientEmail: string;
  authorName?: string | null;
  verificationUrl: string;
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

export async function sendEmailChangeVerificationEmail(
  params: EmailVerificationParams
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  // If environment variables are missing, skip gracefully without throwing
  if (!apiKey || !fromEmail) {
    console.warn(
      "[Notification] Skipped email verification: RESEND_API_KEY or RESEND_FROM_EMAIL is not set in environment."
    );
    return { success: false, skipped: true, error: "CREDENTIALS_NOT_CONFIGURED" };
  }

  const recipientEmail = params.recipientEmail?.trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn(
      "[Notification] Skipped email verification: Invalid recipient email."
    );
    return { success: false, skipped: true, error: "INVALID_RECIPIENT_EMAIL" };
  }

  const authorDisplay = escapeHtml(params.authorName?.trim() || "লেখক");
  const verificationUrl = params.verificationUrl;

  const subject = `[Pustoka] আপনার নতুন ইমেইল ঠিকানা যাচাই করুন`;

  const textContent = [
    `প্রিয় ${params.authorName?.trim() || "লেখক"},`,
    ``,
    `আপনার Pustoka লেখক অ্যাকাউন্টের ইমেইল ঠিকানা পরিবর্তন করার জন্য একটি অনুরোধ পাওয়া গেছে।`,
    `এই ইমেইলটি আপনার নতুন লগইন ইমেইল হিসেবে সক্রিয় করতে নিচের লিঙ্কে ক্লিক করুন:`,
    ``,
    verificationUrl,
    ``,
    `এই লিঙ্কটি আগামী ২৪ ঘণ্টার জন্য কার্যকর থাকবে।`,
    `আপনি যদি এই পরিবর্তনের জন্য আবেদন না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন। আপনার বর্তমান অ্যাকাউন্ট নিরাপদ থাকবে।`,
    ``,
    `ধন্যবাদ,`,
    `Pustoka টীম`,
  ].join("\n");

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #111827; margin-top: 0; font-size: 20px;">নতুন ইমেইল ঠিকানা যাচাই করুন</h2>
      <p style="font-size: 15px; color: #4b5563;">প্রিয় <strong>${authorDisplay}</strong>,</p>
      <p style="font-size: 15px; color: #4b5563;">
        আপনার Pustoka লেখক অ্যাকাউন্টের ইমেইল ঠিকানা পরিবর্তন করার অনুরোধ পাওয়া গেছে। নতুন ইমেইলটি নিশ্চিত করতে নিচের বাটনে ক্লিক করুন:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 15px;">
          ইমেইল ঠিকানা যাচাই করুন
        </a>
      </div>

      <p style="font-size: 13px; color: #6b7280;">
        বাটনটি কাজ না করলে নিচের লিঙ্কটি কপি করে ব্রাউজারে পেস্ট করুন:<br />
        <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
      </p>

      <div style="background-color: #f9fafb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 4px; font-size: 13px; color: #4b5563;">
        নিরাপত্তা দ্রষ্টব্য: এই ভেরিফিকেশন লিঙ্কটি আগামী <strong>২৪ ঘণ্টা</strong> কার্যকর থাকবে। আপনি যদি এই অনুরোধ না করে থাকেন, তবে কোনো ব্যবস্থা নেওয়ার প্রয়োজন নেই; আপনার অ্যাকাউন্ট অপরিবর্তিত থাকবে।
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
        `[Notification] Resend API error: Failed to send verification email (HTTP ${response.status}).`
      );
      return { success: false, error: `API_STATUS_${response.status}` };
    }

    return { success: true };
  } catch (error) {
    const safeErrorMessage =
      error instanceof Error ? error.message : "Network/fetch error";
    console.error(
      `[Notification] Error sending verification email: ${safeErrorMessage}`
    );
    return { success: false, error: safeErrorMessage };
  }
}
