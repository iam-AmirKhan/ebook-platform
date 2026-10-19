export default function AdminReviewsLoading() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted/60 mb-3" />
          <div className="h-8 w-64 rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-96 rounded-lg bg-muted/60" />
        </div>

        {/* Tabs & Search Skeleton */}
        <div className="mb-6 space-y-4 animate-pulse">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-28 rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-10 w-full rounded-lg bg-muted" />
        </div>

        {/* Content Cards Skeleton */}
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-muted" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted/60" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded-full bg-muted" />
              </div>
              <div className="h-4 w-28 rounded bg-muted/70" />
              <div className="h-16 w-full rounded-lg bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
