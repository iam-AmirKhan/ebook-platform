export default function AdminEditBookLoading() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation & Header Skeleton */}
        <div className="mb-6 animate-pulse">
          <div className="h-4 w-28 rounded bg-muted/60 mb-3" />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-muted" />
                <div className="h-8 w-56 rounded-lg bg-muted" />
              </div>
              <div className="h-3.5 w-64 rounded bg-muted/60" />
            </div>
            <div className="h-7 w-36 rounded-lg bg-muted" />
          </div>
        </div>

        {/* Form Card Skeleton */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs animate-pulse space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-10 w-full rounded-lg bg-muted/40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-10 w-full rounded-lg bg-muted/40" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-10 w-full rounded-lg bg-muted/40" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-28 w-full rounded-lg bg-muted/40" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-40 w-full rounded-lg bg-muted/40" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <div className="h-9 w-24 rounded-lg bg-muted/60" />
            <div className="h-9 w-32 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
