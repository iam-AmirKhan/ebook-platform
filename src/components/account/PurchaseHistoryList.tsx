import type { PurchaseHistoryItem } from "@/types/account";

interface PurchaseHistoryListProps {
  purchases: PurchaseHistoryItem[];
}

export function PurchaseHistoryList({ purchases }: PurchaseHistoryListProps) {
  if (purchases.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <p className="text-sm font-medium text-foreground">No purchase history</p>
        <p className="mt-1 text-xs text-muted-foreground">
          You haven&apos;t bought any books yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-3 font-semibold text-foreground">Book</th>
              <th className="px-4 py-3 font-semibold text-foreground">Date</th>
              <th className="px-4 py-3 font-semibold text-foreground">Price</th>
              <th className="px-4 py-3 font-semibold text-foreground text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {purchases.map((purchase) => (
              <tr key={purchase._id} className="transition-colors hover:bg-muted/10">
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {purchase.bookTitle}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(purchase.purchasedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">
                  {purchase.currency} {purchase.price.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      purchase.status === "ACTIVE"
                        ? "bg-brand/10 text-brand"
                        : purchase.status === "REFUNDED"
                        ? "bg-muted text-muted-foreground"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {purchase.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
