"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ChevronDown, ChevronUp, Filter, Search, X } from "lucide-react";
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
  currentSort = "featured",
}: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for the search input
  const [prevQuery, setPrevQuery] = useState(currentQuery);
  const [searchValue, setSearchValue] = useState(currentQuery);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  // Sync local state if URL changes externally
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
    router.push(`/books${createQueryString("q", searchValue.trim())}`);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    router.push(`/books${createQueryString("q", "")}`);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/books${createQueryString("sort", e.target.value)}`);
  };

  const handleCategoryClick = (slug: string) => {
    // Toggle category off if clicking the currently active one
    const newValue = currentCategory === slug ? "" : slug;
    router.push(`/books${createQueryString("category", newValue)}`);
  };

  const activeCategoryDoc = categories.find((c) => c.slug === currentCategory);

  return (
    <div className="flex flex-col gap-5">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="search"
          name="q"
          placeholder="বইয়ের শিরোনাম খুঁজুন..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-11 w-full rounded-xl border border-border/80 bg-background pl-10 pr-9 text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)]"
        />
        {searchValue && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="অনুসন্ধান মুছুন"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>

      {/* Mobile Control Row: Sort + Collapsible Categories Button */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center gap-2">
          {/* Mobile Sort Dropdown */}
          <div className="flex-1">
            <select
              id="mobile-sort-select"
              value={currentSort}
              onChange={handleSortChange}
              className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground outline-none transition-colors focus:border-brand font-[family-name:var(--font-bengali)]"
            >
              <option value="featured">প্রস্তাবিত ক্রম (Featured)</option>
              <option value="latest">নতুন প্রকাশিত (Latest)</option>
              <option value="price-asc">মূল্য: কম থেকে বেশি</option>
              <option value="price-desc">মূল্য: বেশি থেকে কম</option>
              <option value="title-asc">শিরোনাম: ক থেকে ঁ</option>
            </select>
          </div>

          {/* Mobile Categories Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileCategoriesOpen((prev) => !prev)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors shrink-0 font-[family-name:var(--font-bengali)]",
              mobileCategoriesOpen || currentCategory
                ? "border-brand bg-brand/10 text-brand"
                : "border-border/80 bg-background text-foreground"
            )}
          >
            <Filter className="size-3.5" />
            <span>ফিল্টার</span>
            {currentCategory && (
              <span className="flex size-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-brand-foreground">
                1
              </span>
            )}
            {mobileCategoriesOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </div>

        {/* Collapsible Category Pills on Mobile */}
        {mobileCategoriesOpen && (
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground font-[family-name:var(--font-bengali)]">
              <span>ক্যাটাগরি নির্বাচন করুন:</span>
              {currentCategory && (
                <button
                  type="button"
                  onClick={() => handleCategoryClick("")}
                  className="text-brand hover:underline"
                >
                  রিসেট
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  handleCategoryClick("");
                  setMobileCategoriesOpen(false);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors font-[family-name:var(--font-bengali)]",
                  currentCategory === ""
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                সব বই
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => {
                    handleCategoryClick(cat.slug);
                    setMobileCategoriesOpen(false);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors font-[family-name:var(--font-bengali)]",
                    currentCategory === cat.slug
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Filter Indicator on Mobile when collapsed */}
        {!mobileCategoriesOpen && currentCategory && activeCategoryDoc && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            <span>সক্রিয় ক্যাটাগরি:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 font-semibold text-brand">
              {activeCategoryDoc.name}
              <button
                type="button"
                onClick={() => handleCategoryClick("")}
                className="hover:text-destructive"
                aria-label="ফিল্টার মুছুন"
              >
                ✕
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Desktop Sticky Sidebar Controls */}
      <div className="hidden md:flex md:flex-col gap-6">
        {/* Sort Options */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="sort-select"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]"
          >
            ক্রম বিন্যাস (Sort By)
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={handleSortChange}
            className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground outline-none transition-colors focus:border-brand font-[family-name:var(--font-bengali)]"
          >
            <option value="featured">প্রস্তাবিত ক্রম (Featured)</option>
            <option value="latest">নতুন প্রকাশিত (Latest Arrivals)</option>
            <option value="price-asc">মূল্য: কম থেকে বেশি (Price: Low to High)</option>
            <option value="price-desc">মূল্য: বেশি থেকে কম (Price: High to Low)</option>
            <option value="title-asc">শিরোনাম: ক থেকে ঁ (Title: A to Z)</option>
          </select>
        </div>

        {/* Category List */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)] mb-1">
            ক্যাটাগরি
          </h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleCategoryClick("")}
              className={cn(
                "w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors font-[family-name:var(--font-bengali)] flex items-center justify-between",
                currentCategory === ""
                  ? "bg-brand/10 text-brand"
                  : "text-foreground/80 hover:bg-muted"
              )}
            >
              <span>সব বই</span>
              {currentCategory === "" && (
                <span className="size-1.5 rounded-full bg-brand" />
              )}
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors font-[family-name:var(--font-bengali)] flex items-center justify-between",
                  currentCategory === cat.slug
                    ? "bg-brand/10 text-brand"
                    : "text-foreground/80 hover:bg-muted"
                )}
              >
                <span>{cat.name}</span>
                {currentCategory === cat.slug && (
                  <span className="size-1.5 rounded-full bg-brand" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
