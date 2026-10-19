import Link from "next/link";
import type { PublicAuthorCard } from "@/types/author";

interface AuthorCardProps {
  author: PublicAuthorCard;
}

export function AuthorCard({ author }: AuthorCardProps) {
  const initial = (author.penName.trim()[0] || "A").toUpperCase();

  return (
    <article
      className="group relative flex flex-col items-center rounded-2xl border border-border/70 bg-card p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
      aria-label={`Author: ${author.penName}`}
    >
      {/* Profile Image / Avatar */}
      <div className="relative mb-4 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-muted shadow-sm transition-transform duration-300 group-hover:scale-105">
        {author.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.profileImage}
            alt={author.penName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 via-brand/10 to-muted text-2xl font-bold text-brand">
            {initial}
          </div>
        )}
      </div>

      {/* Author Name */}
      <h3 className="line-clamp-1 text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-brand font-[family-name:var(--font-bengali)]">
        {author.penName}
      </h3>

      {/* Published Books Count Pill */}
      <div className="mt-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-0.5 text-xs font-medium text-brand">
          <BookCountIcon />
          <span>
            {author.publishedBooksCount}{" "}
            {author.publishedBooksCount === 1 ? "Book" : "Books"}
          </span>
        </span>
      </div>

      {/* Bio Snippet */}
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {author.bio?.trim() || "Author on Pustoka ebook platform."}
      </p>

      {/* Profile Action Link */}
      <div className="mt-5 w-full pt-2">
        <Link
          href={`/authors/${author.slug}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-semibold text-foreground transition-all duration-150 group-hover:border-brand group-hover:bg-brand group-hover:text-background"
        >
          <span>View Profile</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="transition-transform duration-150 group-hover:translate-x-0.5"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

function BookCountIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}
