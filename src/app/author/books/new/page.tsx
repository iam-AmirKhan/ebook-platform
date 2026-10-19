import Link from "next/link";
import { requireAuthor } from "@/lib/auth/authorization";
import { getActiveCategories, getAuthorByUserId } from "@/lib/data/author-dashboard";
import { BookForm } from "@/components/author/BookForm";
import { createBookAndRedirect } from "@/actions/books";

export const metadata = {
  title: "নতুন বই | Pustoka",
};

export default async function NewBookPage() {
  const user = await requireAuthor();

  // Verify the user has an author profile before showing the form
  const authorProfile = await getAuthorByUserId(user.id);
  if (!authorProfile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]">
          লেখক প্রোফাইল পাওয়া যায়নি
        </p>
        <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          বই তৈরি করতে আপনার একটি সক্রিয় লেখক প্রোফাইল প্রয়োজন।
        </p>
      </div>
    );
  }

  const categories = await getActiveCategories();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/author" className="hover:text-foreground transition-colors font-[family-name:var(--font-bengali)]">
          ড্যাশবোর্ড
        </Link>
        <span>/</span>
        <span className="text-foreground font-[family-name:var(--font-bengali)]">নতুন বই</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
          নতুন বই তৈরি করুন
        </h1>
        <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          বইটি প্রথমে ড্রাফট হিসেবে সংরক্ষিত হবে। পরে ড্যাশবোর্ড থেকে প্রকাশ করতে পারবেন।
        </p>
      </div>

      <BookForm
        action={createBookAndRedirect}
        categories={categories}
        defaultValues={{ language: "বাংলা", price: 100 }}
      />
    </div>
  );
}
