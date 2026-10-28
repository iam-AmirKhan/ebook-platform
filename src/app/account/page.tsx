import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/auth";
import { getAccountDashboardData } from "@/lib/data/account";
import { LibraryBookCard } from "@/components/account/LibraryBookCard";
import { PurchaseHistoryList } from "@/components/account/PurchaseHistoryList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "My Account | Pustoka",
  description: "Manage your digital library, reading progress, and purchases.",
};

export default async function AccountPage() {
  // 1. Require an authenticated user (redirects to /login if unauthenticated)
  const user = await requireUser();

  // 2. Fetch all dashboard data using the isolated server module
  const dashboardData = await getAccountDashboardData(user.id);
  const { library, recentReads, purchaseHistory, orders = [] } = dashboardData;

  // 3. Server Action for signing out
  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex flex-1 flex-col bg-muted/5 pb-16">

      {/* ── Account Header ──────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={`${user.name}'s profile`}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 ring-2 ring-border">
                <span className="text-xl font-bold uppercase text-brand">
                  {user.name?.charAt(0) ?? "U"}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {user.name}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {user.role}
                </span>
                {user.status !== "ACTIVE" && (
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                    {user.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign Out
            </button>
          </form>
        </div>
      </section>

      {/* ── Main Dashboard ──────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">

        {/* Continue Reading (Recent Reads) */}
        {recentReads.length > 0 && (
          <section aria-labelledby="continue-reading-heading">
            <h2
              id="continue-reading-heading"
              className="mb-4 text-lg font-bold tracking-tight text-foreground"
            >
              Continue Reading
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {recentReads.map((book) => (
                <LibraryBookCard key={book._id} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* My Library */}
        <section aria-labelledby="library-heading">
          <div className="mb-4 flex items-end justify-between">
            <h2
              id="library-heading"
              className="text-lg font-bold tracking-tight text-foreground"
            >
              My Library
            </h2>
            <span className="text-sm font-medium text-muted-foreground">
              {library.length} {library.length === 1 ? "book" : "books"}
            </span>
          </div>

          {library.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {library.map((book) => (
                <LibraryBookCard key={book._id} book={book} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card px-6 py-16 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4 text-muted-foreground/30"
                aria-hidden="true"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
              <h3 className="text-lg font-semibold text-foreground">
                Your library is empty
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                When you purchase books, they will appear here along with your reading progress.
              </p>
              <Link
                href="/books"
                className="mt-6 flex h-10 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-background transition-colors hover:bg-brand/90"
              >
                Browse Catalog
              </Link>
            </div>
          )}
        </section>

        {/* Manual Orders / Payment Verification */}
        {orders.length > 0 && (
          <section aria-labelledby="orders-heading">
            <h2
              id="orders-heading"
              className="mb-4 text-lg font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]"
            >
              আমার অর্ডার ও পেমেন্ট হিস্ট্রি (Orders & Payment Status)
            </h2>
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
              <div className="divide-y divide-border/60">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          #{order.orderNumber}
                        </span>
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          {order.paymentMethod}
                        </span>
                        {order.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 font-[family-name:var(--font-bengali)]">
                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                            যাচাইাধীন (Pending)
                          </span>
                        )}
                        {order.status === "PAID" && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 font-[family-name:var(--font-bengali)]">
                            অনুমোদিত (Verified)
                          </span>
                        )}
                        {order.status === "CANCELLED" && (
                          <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive font-[family-name:var(--font-bengali)]">
                            বাতিল (Cancelled)
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <p className="text-sm font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                          {order.bookTitle}
                        </p>
                        {order.items && order.items.length > 1 && (
                          <div className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                            {order.items.map((it, idx) => (
                              <span key={idx} className="mr-2 inline-block">
                                • {it.title} (৳{it.price.toLocaleString()})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {order.transactionId && (
                        <p className="mt-1 text-xs text-muted-foreground font-mono">
                          TrxID: {order.transactionId}
                        </p>
                      )}
                    </div>
                    <div className="text-right sm:self-center">
                      <p className="text-sm font-bold text-foreground">
                        {order.currency} {order.price.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("bn-BD")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Purchase History */}
        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="mb-4 text-lg font-bold tracking-tight text-foreground"
          >
            Purchase History
          </h2>
          <PurchaseHistoryList purchases={purchaseHistory} />
        </section>

      </div>
    </div>
  );
}
