import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  getAdminAuthorApplications,
  getAdminAuthorApplicationCounts,
} from "@/lib/data/author-applications";
import { AdminApplicationsList } from "@/components/admin/author-applications/AdminApplicationsList";

export const metadata: Metadata = {
  title: "লেখক আবেদন পর্যালোচনা | অ্যাডমিন | Pustoka",
  description: "লেখক হওয়ার আবেদন পর্যালোচনা ও অনুমোদন করুন।",
};

interface AdminAuthorApplicationsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function AdminAuthorApplicationsPage({
  searchParams,
}: AdminAuthorApplicationsPageProps) {
  // Server-side authorization check: throws/redirects if unauthenticated or not ADMIN
  const admin = await requireAdmin();

  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status?.toUpperCase() || "ALL";
  const searchQuery = resolvedParams.q?.trim() || "";
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10) || 1);

  const [data, counts] = await Promise.all([
    getAdminAuthorApplications({
      status: statusFilter,
      q: searchQuery,
      page,
      limit: 10,
    }),
    getAdminAuthorApplicationCounts(),
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
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                লেখক আবেদন পর্যালোচনা
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
                নতুন লেখকদের আবেদন যাচাই করুন এবং অনুমোদন বা প্রত্যাখ্যান করুন।
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3.5 py-1.5 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              লগইনকৃত অ্যাডমিন:{" "}
              <strong className="text-foreground">{admin.name}</strong>
            </div>
          </div>
        </div>

        {/* Applications List with Filtering, Search & Pagination */}
        <AdminApplicationsList
          applications={data.applications}
          totalCount={data.totalCount}
          totalPages={data.totalPages}
          currentPage={data.currentPage}
          searchQuery={searchQuery}
          counts={counts}
          currentAdminId={admin.id}
          activeFilter={statusFilter}
        />
      </div>
    </div>
  );
}
