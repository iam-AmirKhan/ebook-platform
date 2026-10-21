export default function AdminCategoriesLoading() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted/60 mb-3" />
          <div className="h-8 w-64 rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-96 rounded-lg bg-muted/60" />
        </div>

        {/* Controls Skeleton */}
        <div className="mb-6 flex animate-pulse flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-9 w-60 rounded-xl bg-muted" />
          <div className="h-9 w-72 rounded-xl bg-muted" />
        </div>

        {/* Content Skeleton */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between py-3 border-b border-border/40 last:border-0"
              >
                <div className="space-y-2">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted/60" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-16 rounded bg-muted" />
                  <div className="h-7 w-20 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
