"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getProtectedChapter } from "@/lib/data/book-details";

export interface FetchChapterResponse {
  success: boolean;
  error?: string;
  data?: {
    order: number;
    title: string;
    teaser: string;
    content: string;
    isPreview: boolean;
    reader: {
      identifier: string;
      pustokaId: string;
    };
  };
}

/**
 * Server Action: fetchProtectedChapter
 *
 * Verifies authenticated session and active purchase permissions before
 * releasing chapter content.
 */
export async function fetchProtectedChapter(
  bookSlug: string,
  order: number
): Promise<FetchChapterResponse> {
  if (!bookSlug || typeof order !== "number" || order < 1) {
    return { success: false, error: "অবৈধ অনুরোধ।" };
  }

  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  const userDisplayName = user?.name || user?.email || null;

  const result = await getProtectedChapter(bookSlug, order, userId, userDisplayName);

  if (!result.allowed || !result.chapter) {
    return {
      success: false,
      error: result.error || "অধ্যায়টি লোড করা সম্ভব হয়নি।",
    };
  }

  return {
    success: true,
    data: {
      order: result.chapter.order,
      title: result.chapter.title,
      teaser: result.chapter.teaser,
      content: result.chapter.content,
      isPreview: result.chapter.isPreview,
      reader: result.reader || {
        identifier: "Verified Reader",
        pustokaId: "PUSTOKA",
      },
    },
  };
}
