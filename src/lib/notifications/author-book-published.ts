/**
 * Author Confirmation Email Notification Dispatcher
 *
 * Dispatches a confirmation email to the author when their book is published for the first time.
 * Uses Resend REST API via native server-side fetch with zero extra dependencies.
 *
 * Safety requirements:
 * - Never log secrets or credentials.
 * - Missing environment variables or API errors must fail gracefully and never crash calling code.
 * - Sent to verified email from authenticated / database user record.
 * - Excludes internal database IDs or sensitive information.
 */

export interface AuthorBookPublishedNotificationParams {
  recipientEmail: string;
  recipientName?: string | null;
  bookTitle: string;
  bookSlug: string;
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

export async function sendAuthorBookPublishedEmail(
  params: AuthorBookPublishedNotificationParams
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  // If environment variables are missing, skip gracefully without throwing
  if (!apiKey || !fromEmail) {
    console.warn(
      "[Notification] Skipped author confirmation email: RESEND_API_KEY or RESEND_FROM_EMAIL is not set in environment."
    );
    return { success: false, skipped: true, error: "CREDENTIALS_NOT_CONFIGURED" };
  }

  const recipientEmail = params.recipientEmail?.trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn(
      "[Notification] Skipped author confirmation email: Invalid recipient email."
    );
    return { success: false, skipped: true, error: "INVALID_RECIPIENT_EMAIL" };
  }

  const authorDisplay = params.recipientName?.trim() || "লেখক";
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/+$/, "");
  const bookUrl = baseUrl
    ? `${baseUrl}/books/${params.bookSlug}`
    : `/books/${params.bookSlug}`;

  const subject = `[Pustoka] আপনার বই সফলভাবে প্রকাশিত হয়েছে: ${params.bookTitle}`;

  const textContent = [
    `প্রিয় ${authorDisplay},`,
    ``,
    `অভিনন্দন! Pustoka প্ল্যাটফর্মে আপনার বইটি সফলভাবে প্রকাশিত হয়েছে।`,
    ``,
    `বইয়ের বিবরণ:`,
    `- বইয়ের নাম: ${params.bookTitle}`,
    `- স্ট্যাটাস: প্রকাশিত (Published)`,
    `- বইয়ের লিংক: ${bookUrl}`,
    ``,
    `পাঠকরা এখন আপনার বইটি দেখতে ও পড়তে পারবেন।`,
    ``,
    `ধন্যবাদ,`,
    `পুস্তোকা (Pustoka) টিম`,
  ].join("\n");

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 28px; background-color: #ffffff;">
      <h2 style="color: #111827; margin-top: 0; font-size: 22px;">অভিনন্দন, ${escapeHtml(authorDisplay)}!</h2>
      <p style="font-size: 15px; color: #4b5563; margin-top: 8px;">
        Pustoka প্ল্যাটফর্মে আপনার বইটি সফলভাবে প্রকাশিত হয়েছে। পাঠকরা এখন আপনার বইটি দেখতে ও পড়তে পারবেন।
      </p>

      <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 16px 20px; margin: 24px 0; border-radius: 6px;">
        <p style="margin: 6px 0; font-size: 15px;"><strong>বইয়ের নাম:</strong> ${escapeHtml(params.bookTitle)}</p>
        <p style="margin: 6px 0; font-size: 15px;">
          <strong>প্রকাশনার স্ট্যাটাস:</strong> 
          <span style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 13px; font-weight: 600; padding: 2px 8px; border-radius: 4px;">
            প্রকাশিত (Published)
          </span>
        </p>
        <p style="margin: 6px 0; font-size: 15px;">
          <strong>বইয়ের লিংক:</strong> 
          <a href="${bookUrl}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${bookUrl}</a>
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${bookUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
          বইটি দেখুন
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 20px 0;" />
      <p style="font-size: 13px; color: #6b7280; margin: 0;">
        এটি একটি স্বয়ংক্রিয় কনফার্মেশন বার্তা। আপনার লেখক ড্যাশবোর্ড থেকে আপনি যেকোনো সময় আপনার বই পরিচালনা করতে পারেন।
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
        `[Notification] Resend API error: Failed to send author confirmation email (HTTP ${response.status}).`
      );
      return { success: false, error: `API_STATUS_${response.status}` };
    }

    console.log(
      `[Notification] Successfully dispatched author confirmation email for "${params.bookTitle}".`
    );
    return { success: true };
  } catch (error) {
    const safeErrorMessage =
      error instanceof Error ? error.message : "Network/fetch error";
    console.error(
      `[Notification] Error sending author confirmation email: ${safeErrorMessage}`
    );
    return { success: false, error: safeErrorMessage };
  }
}
