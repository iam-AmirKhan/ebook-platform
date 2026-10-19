import type { Metadata } from "next";
import Link from "next/link";
import { requireAuthor } from "@/lib/auth/authorization";
import {
  getAuthorByUserId,
  getAuthorFullProfile,
  getAuthorFinancialSummary,
  getAuthorBookSales,
  getAuthorWithdrawalHistory,
  getAuthorBooks,
} from "@/lib/data/author-dashboard";
import { AuthorDashboardTabs } from "@/components/author/AuthorDashboardTabs";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "লেখক ড্যাশবোর্ড ও আর্থিক হিসাব | Pustoka",
  description: "আপনার প্রকাশিত বই, বিক্রয়, রয়্যালটি আয় এবং অর্থ উত্তোলন পরিচালনা করুন।",
};

interface AuthorDashboardPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function AuthorDashboardPage({
  searchParams,
}: AuthorDashboardPageProps) {
  const user = await requireAuthor();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTab = resolvedSearchParams?.tab || "overview";

  // Resolve author profile
  const authorProfile = await getAuthorByUserId(user.id);

  if (!authorProfile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-lg font-semibold text-foreground font-[family-name:var(--font-bengali)]">
          লেখক প্রোফাইল পাওয়া যায়নি
        </p>
        <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          আপনার অ্যাকাউন্টে কোনো সক্রিয় লেখক প্রোফাইল নেই। লেখক হতে আবেদন করুন অথবা অ্যাডমিনকে যোগাযোগ করুন।
        </p>
        <Link href="/become-author" className="mt-4">
          <Button className="font-[family-name:var(--font-bengali)]">
            লেখক হতে আবেদন করুন
          </Button>
        </Link>
      </div>
    );
  }

  // Fetch all author dashboard data in parallel
  const [fullProfile, summary, bookSales, withdrawals, books] =
    await Promise.all([
      getAuthorFullProfile(user.id),
      getAuthorFinancialSummary(authorProfile._id),
      getAuthorBookSales(authorProfile._id),
      getAuthorWithdrawalHistory(authorProfile._id),
      getAuthorBooks(authorProfile._id),
    ]);

  const defaultProfile = fullProfile ?? {
    _id: authorProfile._id,
    userId: user.id,
    penName: authorProfile.penName,
    slug: "",
    bio: null,
    profileImage: null,
    email: user.email || "",
    name: user.name || "",
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            লেখক ড্যাশবোর্ড ও আর্থিক ব্যবস্থাপনা
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            স্বাগতম, <strong className="text-foreground">{authorProfile.penName}</strong>। আপনার বিক্রয়, রয়্যালটি আয় এবং বইসমূহ এখান থেকে পরিচালনা করুন।
          </p>
        </div>
        <Link href="/author/books/new">
          <Button className="font-[family-name:var(--font-bengali)]">
            + নতুন বই লিখুন
          </Button>
        </Link>
      </div>

      {/* Main Tabbed Interface */}
      <AuthorDashboardTabs
        summary={summary}
        bookSales={bookSales}
        withdrawals={withdrawals}
        profile={defaultProfile}
        books={books}
        initialTab={initialTab}
      />
    </div>
  );
}
