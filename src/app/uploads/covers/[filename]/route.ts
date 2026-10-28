import { NextRequest, NextResponse } from "next/server";
import { getCoverFromGridFS } from "@/lib/storage/gridfs";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  if (!filename) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const cover = await getCoverFromGridFS(filename);
    if (!cover) {
      return new NextResponse("Cover Not Found", { status: 404 });
    }

    return new Response(new Uint8Array(cover.buffer), {
      status: 200,
      headers: {
        "Content-Type": cover.contentType || "image/jpeg",
        "Content-Length": cover.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[GET /uploads/covers/[filename]] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
