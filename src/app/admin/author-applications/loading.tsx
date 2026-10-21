export default function AdminAuthorApplicationsLoading() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted/60 mb-3" />
          <div className="h-8 w-64 rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-96 rounded-lg bg-muted/60" />
        </div>

        {/* Filters Skeleton */}
        <div className="mb-6 flex animate-pulse items-center justify-between">
          <div className="h-9 w-80 rounded-xl bg-muted" />
          <div className="h-9 w-60 rounded-xl bg-muted" />
        </div>

        {/* Cards Skeletons */}
        <div className="grid gap-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-xl border border-border/60 bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-muted" />
                    <div className="h-3 w-52 rounded bg-muted/60" />
                  </div>
                </div>
                <div className="h-6 w-24 rounded-full bg-muted" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-8 rounded bg-muted/40" />
                <div className="h-8 rounded bg-muted/40" />
                <div className="h-8 rounded bg-muted/40" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                <div className="h-6 w-32 rounded bg-muted/50" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded bg-muted" />
                  <div className="h-8 w-20 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
