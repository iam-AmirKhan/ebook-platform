"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AuthorsSearchProps {
  initialSearch?: string;
}

export function AuthorsSearch({ initialSearch = "" }: AuthorsSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      // Reset to page 1 on search change
      params.delete("page");
      const qs = params.toString();
      return qs ? `?${qs}` : "";
    },
    [searchParams]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/authors${createQueryString("q", searchValue.trim())}`);
  };

  const handleClear = () => {
    setSearchValue("");
    router.push(`/authors${createQueryString("q", "")}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3.5 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search authors by name..."
          aria-label="Search authors"
          className="h-10 w-full rounded-xl border border-border/80 bg-background pl-10 pr-16 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />

        {searchValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-12 text-muted-foreground hover:text-foreground text-xs font-medium p-1"
            aria-label="Clear search"
          >
            Clear
          </button>
        )}

        <button
          type="submit"
          className="absolute right-1.5 h-7 rounded-lg bg-brand px-2.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
        >
          Search
        </button>
      </div>
    </form>
  );
}
