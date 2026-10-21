export default function CheckoutLoading() {
  return (
    <div className="flex flex-1 flex-col bg-muted/10 py-10 min-h-[calc(100vh-4rem)] animate-pulse">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="grid gap-8 md:grid-cols-12">
          <div className="md:col-span-5 h-80 rounded-2xl border border-border/40 bg-card p-6" />
          <div className="md:col-span-7 h-96 rounded-2xl border border-border/40 bg-card p-8" />
        </div>
      </div>
    </div>
  );
}
