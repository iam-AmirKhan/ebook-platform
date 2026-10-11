import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuthor } from "@/lib/auth/authorization";
import {
  getActiveCategories,
  getAuthorByUserId,
  getBookForEdit,
} from "@/lib/data/author-dashboard";
import { BookForm } from "@/components/author/BookForm";
import { updateBook } from "@/actions/books";

interface EditBookPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export async function generateMetadata({ params }: EditBookPageProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id } = await params;
  return { title: `বই সম্পাদনা | Pustoka` };
}

export default async function EditBookPage({
  params,
  searchParams,
}: EditBookPageProps) {
  const { id } = await params;
  const { created } = await searchParams;
  const user = await requireAuthor();

  // Validate ObjectId format before hitting the DB
  if (!OBJECT_ID_REGEX.test(id)) {
    notFound();
  }

  const authorProfile = await getAuthorByUserId(user.id);
  if (!authorProfile) {
    notFound();
  }

  const [book, categories] = await Promise.all([
    getBookForEdit(id, authorProfile._id),
    getActiveCategories(),
  ]);

  if (!book) {
    notFound();
  }

  // Bind updateBook with the bookId so the form submits with the correct ID
  const updateBookWithId = updateBook.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/author"
          className="hover:text-foreground transition-colors font-[family-name:var(--font-bengali)]"
        >
          ড্যাশবোর্ড
        </Link>
        <span>/</span>
        <span
          className="max-w-[200px] truncate text-foreground font-[family-name:var(--font-bengali)]"
          title={book.title}
        >
          {book.title}
        </span>
      </nav>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            বই সম্পাদনা
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            পরিবর্তন করুন এবং সংরক্ষণ করুন।{" "}
            {book.status === "PUBLISHED" && (
              <span className="text-brand">
                বইটি বর্তমানে প্রকাশিত আছে।
              </span>
            )}
          </p>
        </div>

        {book.status === "PUBLISHED" && (
          <Link
            href={`/books/${book.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 shrink-0 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground font-[family-name:var(--font-bengali)]"
          >
            পাবলিক পেজ দেখুন ↗
          </Link>
        )}
      </div>

      <BookForm
        action={updateBookWithId}
        categories={categories}
        defaultValues={book}
        justCreated={created === "1"}
      />
    </div>
  );
}
