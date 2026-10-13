/**
 * Admin Email Notification Dispatcher
 *
 * Dispatches notification emails to admin accounts when an author publishes a book for the first time.
 * Uses Resend REST API via native server-side fetch with zero extra dependencies.
 *
 * Safety requirements:
 * - Never log secrets or credentials.
 * - Missing environment variables or API errors must fail gracefully and never crash calling code.
 * - Targets only the designated admin email accounts.
 */

export const ADMIN_NOTIFICATION_EMAILS = [
  "khansourav119@gmail.com",
  "khan.amirofc@gmail.com",
] as const;

export interface BookPublishedNotificationParams {
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  authorName?: string | null;
  price?: number | null;
  currency?: string | null;
}

export interface NotificationResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendAdminBookPublishedEmail(
  params: BookPublishedNotificationParams
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  // If environment variables are missing, skip gracefully without throwing
  if (!apiKey || !fromEmail) {
    console.warn(
      "[Notification] Skipped book publication email to admins: RESEND_API_KEY or RESEND_FROM_EMAIL is not set in environment."
    );
    return { success: false, skipped: true, error: "CREDENTIALS_NOT_CONFIGURED" };
  }

  const authorDisplay = params.authorName?.trim() || "একজন লেখক";
  const priceDisplay =
    typeof params.price === "number"
      ? `${params.currency || "BDT"} ${params.price}`
      : "মূল্য নির্ধারিত হয়নি";

  const subject = `[Pustoka Admin] নতুন বই প্রকাশিত হয়েছে: ${params.bookTitle}`;

  const textContent = [
    `Pustoka প্ল্যাটফর্মে একটি নতুন বই প্রকাশিত হয়েছে।`,
    ``,
    `বইয়ের শিরোনাম: ${params.bookTitle}`,
    `লেখক: ${authorDisplay}`,
    `মূল্য: ${priceDisplay}`,
    `বই আইডি: ${params.bookId}`,
    `স্লাগ: ${params.bookSlug}`,
    ``,
    `বইটি দেখতে ভিজিট করুন: /books/${params.bookSlug}`,
    `অ্যাডমিন ড্যাশবোর্ড: /admin`,
  ].join("\n");

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
      <h2 style="color: #111827; margin-top: 0;">Pustoka Admin Notification</h2>
      <p style="font-size: 15px; color: #4b5563;">প্ল্যাটফর্মে একটি নতুন বই সফলভাবে প্রকাশিত হয়েছে:</p>
      
      <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 4px 0;"><strong>বইয়ের নাম:</strong> ${params.bookTitle}</p>
        <p style="margin: 4px 0;"><strong>লেখক:</strong> ${authorDisplay}</p>
        <p style="margin: 4px 0;"><strong>মূল্য:</strong> ${priceDisplay}</p>
        <p style="margin: 4px 0;"><strong>স্লাগ:</strong> <code>${params.bookSlug}</code></p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
        এটি একটি স্বয়ংক্রিয় অ্যাডমিন নোটিফিকেশন।
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
        to: [...ADMIN_NOTIFICATION_EMAILS],
        subject,
        text: textContent,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      console.error(
        `[Notification] Resend API error: Failed to send publication email (HTTP ${response.status}).`
      );
      return { success: false, error: `API_STATUS_${response.status}` };
    }

    console.log(
      `[Notification] Successfully dispatched book publication email for "${params.bookTitle}".`
    );
    return { success: true };
  } catch (error) {
    const safeErrorMessage =
      error instanceof Error ? error.message : "Network/fetch error";
    console.error(
      `[Notification] Error sending book publication email: ${safeErrorMessage}`
    );
    return { success: false, error: safeErrorMessage };
  }
}
