import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FolderTree } from "lucide-react";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminCategories } from "@/lib/data/admin-categories";
import { AdminCategoriesManager } from "@/components/admin/categories/AdminCategoriesManager";

export const metadata: Metadata = {
  title: "বিভাগ পরিচালনা | অ্যাডমিন | Pustoka",
  description: "Pustoka প্ল্যাটফর্মের সকল বইয়ের বিভাগ তৈরি, সম্পাদনা ও তদারকি করুন।",
};

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const data = await getAdminCategories();

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground font-[family-name:var(--font-bengali)]"
          >
            <ArrowLeft className="size-3.5" />
            <span>অ্যাডমিন ড্যাশবোর্ডে ফিরুন</span>
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <FolderTree className="size-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                  বিভাগ পরিচালনা (Category Management)
                </h1>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
                প্ল্যাটফর্মের সকল বইয়ের বিভাগ তৈরি, সম্পাদনা, সক্রিয় বা নিষ্ক্রিয় করুন।
              </p>
            </div>
          </div>
        </div>

        {/* Manager Component */}
        <AdminCategoriesManager
          categories={data.categories}
          counts={data.counts}
        />
      </div>
    </div>
  );
}
