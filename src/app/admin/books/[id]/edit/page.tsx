import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminBookForEdit } from "@/lib/data/admin-books";
import { getActiveCategories } from "@/lib/data/author-dashboard";
import { BookForm } from "@/components/author/BookForm";
import { adminUpdateBook } from "@/actions/admin-books";
import { BookStatusBadge } from "@/components/author/BookStatusBadge";

interface AdminEditBookPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "বই সম্পাদনা | অ্যাডমিন | Pustoka",
};

export default async function AdminEditBookPage({
  params,
}: AdminEditBookPageProps) {
  // 1. Server-side authorization check before fetching data
  const admin = await requireAdmin();

  const { id } = await params;

  // 2. Fetch book and active categories concurrently
  const [book, categories] = await Promise.all([
    getAdminBookForEdit(id),
    getActiveCategories(),
  ]);

  if (!book) {
    notFound();
  }

  // 3. Ensure current book category remains selectable even if inactive
  const categoryOptions = [...categories];
  if (
    book.categoryId &&
    !categoryOptions.some((cat) => cat._id === book.categoryId)
  ) {
    categoryOptions.push({
      _id: book.categoryId,
      name: `${book.category.name || "বর্তমান বিভাগ"} (নিষ্ক্রিয়)`,
      slug: book.category.slug || "",
    });
  }

  // 4. Bind adminUpdateBook with the bookId
  const updateBookWithId = adminUpdateBook.bind(null, id);

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div className="mb-6">
          <Link
            href="/admin/books"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand font-[family-name:var(--font-bengali)] transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            বই তালিকায় ফিরুন
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Shield className="size-4" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                  বই সম্পাদনা (অ্যাডমিন)
                </h1>
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                মূল লেখক: <strong className="text-foreground">{book.author.penName}</strong> &bull; স্ট্যাটাস:{" "}
                <BookStatusBadge status={book.status} />
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              লগইনকৃত অ্যাডমিন: <strong className="text-foreground">{admin.name}</strong>
            </div>
          </div>
        </div>

        {/* BookForm Card */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
          <BookForm
            action={updateBookWithId}
            defaultValues={book}
            categories={categoryOptions}
          />
        </div>
      </div>
    </div>
  );
}
