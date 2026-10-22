import Link from "next/link";
import type { AuthorBookSaleItem } from "@/types/author";
import { BookOpen } from "lucide-react";

interface AuthorBookSalesTableProps {
  sales: AuthorBookSaleItem[];
}

export function AuthorBookSalesTable({ sales }: AuthorBookSalesTableProps) {
  if (sales.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center">
        <BookOpen className="mx-auto size-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          আপনার এখনো কোনো বইয়ের বিক্রয় তথ্য নেই।
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xs">
      <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
            বইভিত্তিক বিক্রয় ও রয়্যালটি আয়
          </h3>
          <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            প্রতিটি বইয়ের একক বিক্রয় সংখ্যা এবং আপনার মোট অর্জিত রয়্যালটি।
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-[family-name:var(--font-bengali)]">
          <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">বইয়ের নাম</th>
              <th className="px-4 py-3 font-semibold">অবস্থা</th>
              <th className="px-4 py-3 font-semibold text-right">মূল্য</th>
              <th className="px-4 py-3 font-semibold text-right">বিক্রিত কপি</th>
              <th className="px-4 py-3 font-semibold text-right">মোট বিক্রয় (Gross)</th>
              <th className="px-5 py-3 font-semibold text-right">লেখকের আয় (Net)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sales.map((item) => (
              <tr key={item.bookId} className="hover:bg-muted/10 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative aspect-[2/3] w-9 shrink-0 overflow-hidden rounded border border-border/40 bg-muted">
                      {item.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground">
                          বই
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/books/${item.slug}`}
                        className="font-semibold text-foreground hover:text-brand line-clamp-1"
                      >
                        {item.title}
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {item.status === "PUBLISHED" && (
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      প্রকাশিত
                    </span>
                  )}
                  {item.status === "DRAFT" && (
                    <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                      ড্রাফট
                    </span>
                  )}
                  {item.status === "ARCHIVED" && (
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      সংরক্ষিত
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-medium text-foreground">
                  ৳ {item.price.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                  {item.unitsSold.toLocaleString()} টি
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                  ৳ {item.grossSales.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ৳ {item.authorEarnings.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
