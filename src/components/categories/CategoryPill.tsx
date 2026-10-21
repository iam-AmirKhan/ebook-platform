import Link from "next/link";
import type { HomepageCategory } from "@/types/homepage";

interface CategoryPillProps {
  category: HomepageCategory;
}

export function CategoryPill({ category }: CategoryPillProps) {
  return (
    <Link
      href={`/books?category=${category.slug}`}
      className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4.5 py-2.5 text-sm font-semibold text-foreground/85 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-brand/5 hover:text-brand hover:shadow-md hover:shadow-brand/5 font-[family-name:var(--font-bengali)]"
    >
      <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-brand/10 group-hover:text-brand transition-colors">
        {category.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image}
            alt=""
            aria-hidden="true"
            className="size-5 rounded object-cover"
            loading="lazy"
          />
        ) : (
          <CategoryIcon />
        )}
      </div>
      <span>{category.name}</span>
    </Link>
  );
}

interface CategoryListProps {
  categories: HomepageCategory[];
}

export function CategoryList({ categories }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          বর্তমানে কোনো সক্রিয় ক্যাটাগরি নেই।
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 sm:gap-3.5">
      {categories.map((cat) => (
        <CategoryPill key={cat._id} category={cat} />
      ))}
    </div>
  );
}

function CategoryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}
