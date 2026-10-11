import Link from "next/link";
import { requireAuthor } from "@/lib/auth/authorization";
import { getAuthorByUserId, getAuthorBooks } from "@/lib/data/author-dashboard";
import { AuthorBookCard } from "@/components/author/AuthorBookCard";
import { Button } from "@/components/ui/button";

export default async function AuthorDashboardPage() {
  // requireAuthor() is also called in layout, but actions must not depend on that.
  const user = await requireAuthor();

  // Resolve the Author document for this user
  const authorProfile = await getAuthorByUserId(user.id);

  if (!authorProfile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-lg font-semibold text-foreground font-[family-name:var(--font-bengali)]">
          লেখক প্রোফাইল পাওয়া যায়নি
        </p>
        <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          আপনার অ্যাকাউন্টে কোনো লেখক প্রোফাইল নেই। অ্যাডমিনকে যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  const books = await getAuthorBooks(authorProfile._id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            লেখক ড্যাশবোর্ড
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            স্বাগতম, {authorProfile.penName}। আপনার বইগুলো এখানে পরিচালনা করুন।
          </p>
        </div>
        <Link href="/author/books/new">
          <Button className="font-[family-name:var(--font-bengali)]">
            + নতুন বই তৈরি করুন
          </Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 divide-x divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card text-center">
        {[
          {
            label: "মোট",
            count: books.length,
          },
          {
            label: "প্রকাশিত",
            count: books.filter((b) => b.status === "PUBLISHED").length,
          },
          {
            label: "ড্রাফট",
            count: books.filter((b) => b.status === "DRAFT").length,
          },
        ].map(({ label, count }) => (
          <div key={label} className="px-4 py-4">
            <p className="text-xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Book list */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card px-6 py-16 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4 text-muted-foreground/30"
            aria-hidden="true"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
            এখনো কোনো বই নেই
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            আপনার প্রথম বই তৈরি করুন এবং পাঠকদের সাথে শেয়ার করুন।
          </p>
          <Link href="/author/books/new" className="mt-6">
            <Button className="font-[family-name:var(--font-bengali)]">
              + নতুন বই তৈরি করুন
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {books.map((book) => (
            <AuthorBookCard key={book._id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
