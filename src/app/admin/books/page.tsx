import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  getAdminBooks,
  getAdminBookCounts,
  getAdminPublishedBooksForReorder,
} from "@/lib/data/admin-books";
import { AdminBooksList } from "@/components/admin/books/AdminBooksList";

export const metadata: Metadata = {
  title: "বই ও কন্টেন্ট ব্যবস্থাপনা | অ্যাডমিন | Pustoka",
  description: "প্ল্যাটফর্মের সকল লেখকের বই ও কন্টেন্ট তদারকি করুন।",
};

interface AdminBooksPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function AdminBooksPage({
  searchParams,
}: AdminBooksPageProps) {
  // 1. Server-side authorization check before fetching data
  const admin = await requireAdmin();

  // 2. Parse searchParams
  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status?.toUpperCase() || "ALL";
  const searchQuery = resolvedParams.q?.trim() || "";
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10) || 1);

  // 3. Fetch books, counts, and published books for ordering concurrently
  const [data, counts, publishedBooksForReorder] = await Promise.all([
    getAdminBooks({
      status: statusFilter,
      q: searchQuery,
      page,
      limit: 15,
    }),
    getAdminBookCounts(),
    getAdminPublishedBooksForReorder(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand font-[family-name:var(--font-bengali)] transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            অ্যাডমিন ড্যাশবোর্ডে ফিরুন
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <BookOpen className="size-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                  বই ও কন্টেন্ট ব্যবস্থাপনা
                </h1>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
                প্ল্যাটফর্মের সকল লেখকের প্রকাশিত, ড্রাফট ও সংরক্ষিত বই পর্যবেক্ষণ করুন।
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3.5 py-1.5 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              লগইনকৃত অ্যাডমিন:{" "}
              <strong className="text-foreground">{admin.name}</strong>
            </div>
          </div>
        </div>

        {/* Books List & Controls */}
        <AdminBooksList
          books={data.books}
          counts={counts}
          totalCount={data.totalCount}
          totalPages={data.totalPages}
          currentPage={data.currentPage}
          activeFilter={statusFilter}
          searchQuery={searchQuery}
          publishedBooksForReorder={publishedBooksForReorder}
        />
      </div>
    </div>
  );
}
