import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProtectedChapter } from "@/lib/data/book-details";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteProps {
  params: Promise<{ slug: string; order: string }>;
}

const SECURITY_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * GET /api/books/[slug]/chapters/[order]
 *
 * Secure chapter delivery endpoint with strict access control:
 * - Free books and preview chapters: accessible without purchase.
 * - Paid locked chapters: requires active user session and verified active purchase.
 * - Responses are NEVER cached (private, no-store headers).
 */
export async function GET(request: NextRequest, { params }: RouteProps) {
  const { slug, order: rawOrder } = await params;
  const order = parseInt(rawOrder, 10);

  if (isNaN(order) || order < 1) {
    return NextResponse.json(
      { error: "অধ্যায় নম্বর সঠিক নয়।" },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  // Derive authenticated identity from session
  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  const userDisplayName = user?.name || user?.email || null;

  const result = await getProtectedChapter(slug, order, userId, userDisplayName);

  if (!result.allowed) {
    return NextResponse.json(
      { error: result.error },
      { status: result.statusCode, headers: SECURITY_HEADERS }
    );
  }

  return NextResponse.json(
    {
      order: result.chapter?.order,
      title: result.chapter?.title,
      teaser: result.chapter?.teaser,
      content: result.chapter?.content,
      isPreview: result.chapter?.isPreview,
      reader: result.reader,
    },
    {
      status: 200,
      headers: SECURITY_HEADERS,
    }
  );
}
