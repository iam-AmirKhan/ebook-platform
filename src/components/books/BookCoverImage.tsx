"use client";

import { useState } from "react";

interface BookCoverImageProps {
  src?: string | null;
  title: string;
  alt?: string;
  aspectRatio?: string; // Default: "aspect-[2/3]"
  className?: string;
  imgClassName?: string;
  showSpineShadow?: boolean;
}

export function BookCoverImage({
  src,
  title,
  alt,
  aspectRatio = "aspect-[2/3]",
  className = "",
  imgClassName = "",
  showSpineShadow = true,
}: BookCoverImageProps) {
  const [hasError, setHasError] = useState(false);

  // Derive a consistent hue from the title string for visual variety on placeholder
  const hue = title
    ? title.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
    : 200;

  const showImage = Boolean(src && !hasError);

  return (
    <div
      className={`relative ${aspectRatio} w-full overflow-hidden bg-muted/30 select-none ${className}`}
    >
      {/* Subtle realistic book spine shadow */}
      {showSpineShadow && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/25 via-black/10 to-transparent z-10" />
      )}

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt || `Cover of ${title}`}
          onError={() => setHasError(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center"
          style={{ background: `oklch(0.92 0.04 ${hue})` }}
        >
          <div
            className="flex size-10 sm:size-12 items-center justify-center rounded-2xl shadow-xs"
            style={{
              background: `oklch(0.85 0.07 ${hue})`,
              color: `oklch(0.35 0.09 ${hue})`,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <span
            className="line-clamp-3 text-xs sm:text-sm font-semibold leading-relaxed px-1 font-[family-name:var(--font-bengali)]"
            style={{ color: `oklch(0.30 0.09 ${hue})` }}
          >
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
