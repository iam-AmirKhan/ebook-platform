export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-muted" />
            <div className="h-8 w-48 rounded-lg bg-muted" />
          </div>
          <div className="mt-2 h-4 w-80 rounded-lg bg-muted/60" />
        </div>

        {/* Quick Stats Grid Skeleton */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="size-4 rounded bg-muted" />
              </div>
              <div className="mt-3 h-7 w-12 rounded bg-muted" />
              <div className="mt-2 h-3 w-20 rounded bg-muted/60" />
            </div>
          ))}
        </div>

        {/* Modules Grid Skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-32 rounded bg-muted/60" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-border/60 bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="size-11 rounded-xl bg-muted" />
                  <div className="h-5 w-24 rounded-full bg-muted" />
                </div>
                <div className="mt-4 h-5 w-48 rounded bg-muted" />
                <div className="mt-2 h-3.5 w-full rounded bg-muted/60" />
                <div className="mt-6 border-t border-border/40 pt-4">
                  <div className="h-4 w-28 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
