import Link from "next/link";
import type { HomepageCategory } from "@/types/homepage";

interface CategoryPillProps {
  category: HomepageCategory;
}

export function CategoryPill({ category }: CategoryPillProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition-all duration-150 hover:border-brand/50 hover:bg-brand/5 hover:text-brand"
    >
      {category.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={category.image}
          alt=""
          aria-hidden="true"
          className="h-5 w-5 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <CategoryIcon />
      )}
      {category.name}
    </Link>
  );
}

interface CategoryListProps {
  categories: HomepageCategory[];
}

export function CategoryList({ categories }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Categories coming soon. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2.5">
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
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-muted-foreground group-hover:text-brand transition-colors"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}
