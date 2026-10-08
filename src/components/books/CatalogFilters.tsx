"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { HomepageCategory } from "@/types/homepage";
import { cn } from "@/lib/utils";

interface CatalogFiltersProps {
  categories: HomepageCategory[];
  currentQuery?: string;
  currentCategory?: string;
  currentSort?: string;
}

export function CatalogFilters({
  categories,
  currentQuery = "",
  currentCategory = "",
  currentSort = "latest",
}: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Local state for the search input to allow smooth typing without debouncing the whole URL update
  const [prevQuery, setPrevQuery] = useState(currentQuery);
  const [searchValue, setSearchValue] = useState(currentQuery);

  // Sync local state if URL changes externally (render-phase update)
  if (currentQuery !== prevQuery) {
    setPrevQuery(currentQuery);
    setSearchValue(currentQuery);
  }

  // Helper to create a new URL string with updated query params
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      // Reset to page 1 whenever filters/sort change
      if (name !== "page") {
        params.delete("page");
      }
      return `?${params.toString()}`;
    },
    [searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/books${createQueryString("q", searchValue)}`);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/books${createQueryString("sort", e.target.value)}`);
  };

  const handleCategoryClick = (slug: string) => {
    // Toggle category off if clicking the currently active one
    const newValue = currentCategory === slug ? "" : slug;
    router.push(`/books${createQueryString("category", newValue)}`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          name="q"
          placeholder="Search books by title..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </form>

      {/* Mobile/Desktop Layout for Sort & Categories */}
      <div className="flex flex-col gap-6 md:flex-col-reverse">
        {/* Sort Options */}
        <div className="flex flex-col gap-2">
          <label htmlFor="sort-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sort By
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={handleSortChange}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="latest">Latest Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="title-asc">Title: A to Z</option>
          </select>
        </div>

        {/* Category List */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </h3>
          <div className="flex flex-wrap gap-2 md:flex-col">
            <button
              onClick={() => handleCategoryClick("")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors md:rounded-md md:border-transparent md:px-3 md:py-2 md:text-left md:hover:bg-muted",
                currentCategory === ""
                  ? "border-brand bg-brand/10 text-brand md:bg-brand/10"
                  : "border-border bg-card text-foreground/80 md:bg-transparent"
              )}
            >
              All Books
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors md:rounded-md md:border-transparent md:px-3 md:py-2 md:text-left md:hover:bg-muted",
                  currentCategory === cat.slug
                    ? "border-brand bg-brand/10 text-brand md:bg-brand/10"
                    : "border-border bg-card text-foreground/80 md:bg-transparent"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
