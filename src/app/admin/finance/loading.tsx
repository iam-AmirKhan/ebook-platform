export default function AdminFinanceLoading() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        {/* Navigation placeholder */}
        <div className="h-12 w-full rounded-xl bg-card border border-border/40" />

        {/* Header placeholder */}
        <div className="space-y-2">
          <div className="h-8 w-72 rounded-lg bg-muted" />
          <div className="h-4 w-96 rounded-lg bg-muted/60" />
        </div>

        {/* KPI Grid placeholder */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-border/40 bg-card p-5"
            />
          ))}
        </div>

        {/* Content table placeholder */}
        <div className="h-64 rounded-2xl border border-border/40 bg-card p-6" />
      </div>
    </div>
  );
}
