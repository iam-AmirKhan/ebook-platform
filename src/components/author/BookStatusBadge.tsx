interface BookStatusBadgeProps {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

const STATUS_CONFIG = {
  DRAFT: {
    label: "ড্রাফট",
    className: "bg-muted text-muted-foreground",
  },
  PUBLISHED: {
    label: "প্রকাশিত",
    className: "bg-brand/10 text-brand",
  },
  ARCHIVED: {
    label: "সংরক্ষিত",
    className: "bg-destructive/10 text-destructive",
  },
} as const;

export function BookStatusBadge({ status }: BookStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className} font-[family-name:var(--font-bengali)]`}
    >
      {config.label}
    </span>
  );
}
