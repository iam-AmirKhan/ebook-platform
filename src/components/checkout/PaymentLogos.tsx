import React from "react";

export function BkashLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="bKash"
    >
      {/* bKash Icon (Bird origami silhouette) */}
      <g transform="translate(4, 2) scale(0.92)">
        <polygon points="12,38 32,18 24,12" fill="#E2136E" />
        <polygon points="32,18 48,34 32,38" fill="#E2136E" />
        <polygon points="32,18 42,4 24,12" fill="#E2136E" />
        <polygon points="42,4 40,16 48,12" fill="#E2136E" />
        <polygon points="48,12 36,22 48,34" fill="#E2136E" />
      </g>
      {/* bKash typography */}
      <text
        x="54"
        y="33"
        fill="#E2136E"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="-0.5px"
      >
        bKash
      </text>
    </svg>
  );
}

export function NagadLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Nagad"
    >
      {/* Nagad circular flame emblem */}
      <g transform="translate(6, 6) scale(0.78)">
        <circle cx="24" cy="24" r="22" fill="#F7931E" />
        <path
          d="M24 8 C16 16, 14 26, 20 32 C26 38, 36 34, 34 24 C32 16, 26 12, 24 8 Z"
          fill="#ED1C24"
        />
        <circle cx="24" cy="24" r="6" fill="#FFFFFF" />
      </g>
      {/* Nagad typography */}
      <text
        x="52"
        y="33"
        fill="#F7931E"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="23"
        fontWeight="bold"
        letterSpacing="-0.5px"
      >
        নগদ
      </text>
    </svg>
  );
}
