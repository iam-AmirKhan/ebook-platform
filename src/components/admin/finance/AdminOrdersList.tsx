"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { approveOrderAction, rejectOrderAction } from "@/actions/admin-finance";
import { Button } from "@/components/ui/button";
import type { AdminOrderItem } from "@/lib/data/admin-finance";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface AdminOrdersListProps {
  orders: AdminOrderItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    all: number;
    pending: number;
    paid: number;
    cancelled: number;
  };
  commissionPercent: number;
}

export function AdminOrdersList({
  orders,
  totalCount,
  totalPages,
  currentPage,
  counts,
  commissionPercent,
}: AdminOrdersListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "ALL";
  const currentQuery = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(currentQuery);
  const [activeModal, setActiveModal] = useState<{
    type: "approve" | "reject";
    order: AdminOrderItem;
  } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.delete("page");
    router.push(`/admin/finance/orders?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/admin/finance/orders?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    router.push(`/admin/finance/orders?${params.toString()}`);
  };

  const handleApproveConfirm = async () => {
    if (!activeModal || activeModal.type !== "approve") return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await approveOrderAction(activeModal.order._id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "অর্ডার সফলভাবে অনুমোদিত হয়েছে!",
        });
        setActiveModal(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "অনুমোদন ব্যর্থ হয়েছে।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "সার্ভারে ত্রুটি দেখা দিয়েছে।",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!activeModal || activeModal.type !== "reject") return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await rejectOrderAction(activeModal.order._id, rejectNote.trim() || undefined);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "অর্ডার সফলভাবে বাতিল করা হয়েছে।",
        });
        setActiveModal(null);
        setRejectNote("");
      } else {
        setFeedback({
          type: "error",
          message: res.error || "বাতিলকরণ ব্যর্থ হয়েছে।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "সার্ভারে ত্রুটি দেখা দিয়েছে।",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-4 text-xs font-[family-name:var(--font-bengali)] ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs and Search Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-card p-1">
          {[
            { id: "ALL", label: "সব", count: counts.all },
            { id: "PENDING", label: "যাচাইাধীন", count: counts.pending, alert: counts.pending > 0 },
            { id: "PAID", label: "অনুমোদিত", count: counts.paid },
            { id: "CANCELLED", label: "বাতিলকৃত", count: counts.cancelled },
          ].map((tab) => {
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleStatusChange(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all font-[family-name:var(--font-bengali)] ${
                  isActive
                    ? "bg-foreground text-background shadow-2xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive
                      ? "bg-background/20 text-background"
                      : tab.alert
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="TrxID, ফোন নম্বর, বই বা ক্রেতা খুঁজুন..."
            className="w-full rounded-xl border border-border/80 bg-background pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)]"
          />
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground/60" />
        </form>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xs">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            কোনো অর্ডার পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-[family-name:var(--font-bengali)]">
              <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">অর্ডার নং</th>
                  <th className="px-4 py-3 font-semibold">ক্রেতা ও তারিখ</th>
                  <th className="px-4 py-3 font-semibold">বই ও মূল্য</th>
                  <th className="px-4 py-3 font-semibold">পেমেন্ট মেথড ও প্রেরক</th>
                  <th className="px-4 py-3 font-semibold">ট্রানজেকশন আইডি (TrxID)</th>
                  <th className="px-4 py-3 font-semibold">অবস্থা</th>
                  <th className="px-5 py-3 font-semibold text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                      #{o.orderNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{o.userName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{o.userEmail}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(o.createdAt).toLocaleString("bn-BD")}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {o.items && o.items.length > 1 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                              {o.items.length}টি বই
                            </span>
                            <span className="line-clamp-1">{o.items[0]?.title}</span>
                          </div>
                          <div className="max-h-20 overflow-y-auto space-y-0.5 pr-1">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-[11px] text-muted-foreground">
                                <span className="truncate max-w-[150px]">• {item.title}</span>
                                <span className="font-mono text-foreground/80 shrink-0">৳{item.price.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="font-semibold text-foreground line-clamp-1">{o.bookTitle}</div>
                      )}
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        মোট: ৳ {o.total.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded bg-muted px-2 py-0.5 font-bold uppercase text-[10px] text-foreground">
                        {o.paymentMethod}
                      </span>
                      {o.senderNumber && (
                        <div className="font-mono text-xs text-muted-foreground mt-1">
                          {o.senderNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {o.transactionId ? (
                        <span className="rounded bg-muted/60 px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                          {o.transactionId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {o.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                          <Clock className="size-3" />
                          যাচাইাধীন
                        </span>
                      )}
                      {o.status === "PAID" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          অনুমোদিত
                        </span>
                      )}
                      {o.status === "CANCELLED" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                          <XCircle className="size-3" />
                          বাতিলকৃত
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {o.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => setActiveModal({ type: "approve", order: o })}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                          >
                            অনুমোদন
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveModal({ type: "reject", order: o })}
                            className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10 text-[11px] font-semibold"
                          >
                            বাতিল
                          </Button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground">
                          {o.adminNote ? (
                            <span title={o.adminNote} className="line-clamp-1 italic max-w-[120px]">
                              {o.adminNote}
                            </span>
                          ) : (
                            <span>সম্পন্ন</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/40 px-5 py-3 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            <span>
              মোট {totalCount}টি অর্ডারের মধ্যে পৃষ্ঠা {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="size-3.5" />
                পূর্ববর্তী
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="h-8 px-2.5"
              >
                পরবর্তী
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Confirmation Modal */}
      {activeModal?.type === "approve" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-6" />
              <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
                অর্ডার ও পেমেন্ট অনুমোদন নিশ্চিতকরণ
              </h3>
            </div>

            <p className="mt-2 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              অর্ডারটি অনুমোদন করলে ক্রেতার লাইব্রেরিতে বইটি উন্মুক্ত হবে এবং প্ল্যাটফর্ম কমিশন ও লেখকের রয়্যালটি আর্থিক লেজারে স্ন্যাপশট হিসেবে সংরক্ষিত হবে।
            </p>

            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-[family-name:var(--font-bengali)]">অর্ডার নম্বর:</span>
                <span className="font-mono font-bold text-foreground">#{activeModal.order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-[family-name:var(--font-bengali)]">ক্রেতা:</span>
                <span className="font-semibold text-foreground">{activeModal.order.userName} ({activeModal.order.userEmail})</span>
              </div>

              {/* Multi-book list or single book */}
              <div className="border-t border-border/40 pt-2 space-y-1">
                <span className="text-muted-foreground font-[family-name:var(--font-bengali)] font-semibold block">
                  {activeModal.order.items && activeModal.order.items.length > 1
                    ? `অর্ডারের বইসমূহ (${activeModal.order.items.length}টি):`
                    : "বইয়ের নাম:"}
                </span>
                {activeModal.order.items && activeModal.order.items.length > 1 ? (
                  <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg bg-background p-2 border border-border/50">
                    {activeModal.order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground truncate pr-2">
                          {idx + 1}. {item.title}
                        </span>
                        <span className="font-mono font-bold text-foreground shrink-0">
                          ৳ {item.price.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="font-semibold text-foreground line-clamp-1">
                    {activeModal.order.bookTitle}
                  </span>
                )}
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground font-[family-name:var(--font-bengali)]">পেমেন্ট মেথড ও TrxID:</span>
                <span className="font-mono font-bold text-foreground">{activeModal.order.paymentMethod} - {activeModal.order.transactionId}</span>
              </div>
              {activeModal.order.senderNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-[family-name:var(--font-bengali)]">প্রেরক নম্বর:</span>
                  <span className="font-mono text-foreground">{activeModal.order.senderNumber}</span>
                </div>
              )}
              <div className="border-t border-border/40 pt-2 flex justify-between font-bold text-foreground">
                <span className="font-[family-name:var(--font-bengali)]">মোট বিক্রয় (Gross):</span>
                <span>৳ {activeModal.order.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="font-[family-name:var(--font-bengali)]">প্ল্যাটফর্ম কমিশন ({commissionPercent}%):</span>
                <span className="font-mono">৳ {Math.round((activeModal.order.total * commissionPercent) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="font-[family-name:var(--font-bengali)]">লেখকের রয়্যালটি আয়:</span>
                <span className="font-mono">৳ {(activeModal.order.total - Math.round((activeModal.order.total * commissionPercent) / 100)).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                disabled={isProcessing}
                onClick={() => setActiveModal(null)}
                className="font-[family-name:var(--font-bengali)]"
              >
                বাতিল
              </Button>
              <Button
                disabled={isProcessing}
                onClick={handleApproveConfirm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-[family-name:var(--font-bengali)]"
              >
                {isProcessing ? "প্রক্রিয়াধীন..." : "হ্যাঁ, অনুমোদন করুন"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {activeModal?.type === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-destructive">
              <XCircle className="size-6" />
              <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
                অর্ডার বাতিলকরণ নিশ্চিতকরণ
              </h3>
            </div>

            <p className="mt-2 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              অর্ডারটি বাতিল করলে কোনো বই এক্সেস বা লেখক আয় পোস্ট হবে না। অডিট ট্রেইলের জন্য একটি কারণ উল্লেখ করুন।
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
                বাতিলের কারণ (ঐচ্ছিক)
              </label>
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="যেমন: ভুল ট্রানজেকশন আইডি বা পর্যাপ্ত ব্যালেন্স পাওয়া যায়নি..."
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                disabled={isProcessing}
                onClick={() => setActiveModal(null)}
                className="font-[family-name:var(--font-bengali)]"
              >
                ফিরে যান
              </Button>
              <Button
                disabled={isProcessing}
                onClick={handleRejectConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-[family-name:var(--font-bengali)]"
              >
                {isProcessing ? "বাতিল হচ্ছে..." : "অর্ডার বাতিল করুন"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
