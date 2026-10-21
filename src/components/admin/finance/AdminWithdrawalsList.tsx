"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  acceptWithdrawalAction,
  rejectWithdrawalAction,
  markWithdrawalPaidAction,
} from "@/actions/admin-finance";
import { Button } from "@/components/ui/button";
import type { AdminWithdrawalListItem } from "@/lib/data/admin-finance";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Lock,
} from "lucide-react";

interface AdminWithdrawalsListProps {
  withdrawals: AdminWithdrawalListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    all: number;
    pending: number;
    accepted: number;
    paid: number;
    rejected: number;
  };
}

export function AdminWithdrawalsList({
  withdrawals,
  totalCount,
  totalPages,
  currentPage,
  counts,
}: AdminWithdrawalsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "ALL";
  const currentQuery = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(currentQuery);
  const [activeModal, setActiveModal] = useState<{
    type: "accept" | "reject" | "pay";
    withdrawal: AdminWithdrawalListItem;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [payoutTxId, setPayoutTxId] = useState("");
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
    router.push(`/admin/finance/withdrawals?${params.toString()}`);
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
    router.push(`/admin/finance/withdrawals?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    router.push(`/admin/finance/withdrawals?${params.toString()}`);
  };

  const handleAcceptConfirm = async () => {
    if (!activeModal || activeModal.type !== "accept") return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await acceptWithdrawalAction(activeModal.withdrawal._id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "উত্তোলন অনুরোধ সফলভাবে গৃহীত ও সংরক্ষিত হয়েছে!",
        });
        setActiveModal(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "অনুরোধ গ্রহণ ব্যর্থ হয়েছে।",
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
      const res = await rejectWithdrawalAction(
        activeModal.withdrawal._id,
        rejectReason.trim() || undefined
      );
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "উত্তোলন অনুরোধ সফলভাবে প্রত্যাখ্যান করা হয়েছে।",
        });
        setActiveModal(null);
        setRejectReason("");
      } else {
        setFeedback({
          type: "error",
          message: res.error || "প্রত্যাখ্যান ব্যর্থ হয়েছে।",
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

  const handlePayConfirm = async () => {
    if (!activeModal || activeModal.type !== "pay") return;
    if (!payoutTxId.trim()) {
      setFeedback({
        type: "error",
        message: "পেমেন্ট ট্রানজেকশন আইডি (TrxID) দেওয়া আবশ্যক।",
      });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await markWithdrawalPaidAction(
        activeModal.withdrawal._id,
        payoutTxId.trim().toUpperCase()
      );
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "উত্তোলন সফলভাবে পরিশোধিত চিহ্নিত হয়েছে!",
        });
        setActiveModal(null);
        setPayoutTxId("");
      } else {
        setFeedback({
          type: "error",
          message: res.error || "পরিশোধ সম্পন্ন করা যায়নি।",
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
            { id: "PENDING", label: "অপেক্ষমাণ", count: counts.pending, alert: counts.pending > 0 },
            { id: "ACCEPTED", label: "গৃহীত", count: counts.accepted },
            { id: "PAID", label: "পরিশোধিত", count: counts.paid },
            { id: "REJECTED", label: "প্রত্যাখ্যাত", count: counts.rejected },
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
            placeholder="লেখক, অ্যাকাউন্ট নম্বর বা TrxID খুঁজুন..."
            className="w-full rounded-xl border border-border/80 bg-background pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-[family-name:var(--font-bengali)]"
          />
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground/60" />
        </form>
      </div>

      {/* Withdrawals Table */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xs">
        {withdrawals.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            কোনো উত্তোলন অনুরোধ পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-[family-name:var(--font-bengali)]">
              <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">তারিখ</th>
                  <th className="px-4 py-3 font-semibold">লেখক ও ইমেইল</th>
                  <th className="px-4 py-3 font-semibold">পরিমাণ</th>
                  <th className="px-4 py-3 font-semibold">পেমেন্ট মেথড ও নম্বর</th>
                  <th className="px-4 py-3 font-semibold">অবস্থা</th>
                  <th className="px-4 py-3 font-semibold">রেফারেন্স / নোট</th>
                  <th className="px-5 py-3 font-semibold text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {withdrawals.map((w) => (
                  <tr key={w._id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {new Date(w.createdAt).toLocaleDateString("bn-BD")}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{w.authorPenName}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{w.authorEmail}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                      ৳ {w.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground uppercase">
                        {w.payoutMethod}
                      </span>
                      <div className="font-mono text-xs text-muted-foreground mt-1">
                        {w.payoutAccountNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {w.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                          <Clock className="size-3" />
                          অপেক্ষমাণ
                        </span>
                      )}
                      {w.status === "ACCEPTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                          <Lock className="size-3" />
                          সংরক্ষিত
                        </span>
                      )}
                      {w.status === "PAID" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          পরিশোধিত
                        </span>
                      )}
                      {w.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                          <XCircle className="size-3" />
                          প্রত্যাখ্যাত
                        </span>
                      )}
                      {w.status === "CANCELLED" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          প্রত্যাহারকৃত
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {w.paymentTransactionId && (
                        <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          TrxID: {w.paymentTransactionId}
                        </div>
                      )}
                      {w.rejectionReason && (
                        <div className="text-destructive text-[11px]">
                          কারণ: {w.rejectionReason}
                        </div>
                      )}
                      {!w.paymentTransactionId && !w.rejectionReason && (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {w.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => setActiveModal({ type: "accept", withdrawal: w })}
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold"
                          >
                            গ্রহণ করুন
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveModal({ type: "reject", withdrawal: w })}
                            className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10 text-[11px] font-semibold"
                          >
                            প্রত্যাখ্যান
                          </Button>
                        </div>
                      )}

                      {w.status === "ACCEPTED" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => setActiveModal({ type: "pay", withdrawal: w })}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                          >
                            টাকা পাঠিয়েছি
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveModal({ type: "reject", withdrawal: w })}
                            className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10 text-[11px] font-semibold"
                          >
                            বাতিল
                          </Button>
                        </div>
                      )}

                      {w.status !== "PENDING" && w.status !== "ACCEPTED" && (
                        <span className="text-[11px] text-muted-foreground/50">—</span>
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
              মোট {totalCount}টি উত্তোলনের মধ্যে পৃষ্ঠা {currentPage} / {totalPages}
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

      {/* Accept Modal */}
      {activeModal?.type === "accept" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
              <Lock className="size-6" />
              <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
                উত্তোলন অনুরোধ গ্রহণ ও তহবিল সংরক্ষণ
              </h3>
            </div>

            <p className="mt-2 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              অনুরোধটি গ্রহণ করলে লেজারে <strong>WITHDRAWAL_RESERVED</strong> এন্ট্রি তৈরি হবে এবং লেখক এই অর্থ দ্বিতীয়বার উত্তোলন করতে পারবেন না।
            </p>

            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-[family-name:var(--font-bengali)]">লেখক:</span>
                <span className="font-bold text-foreground">{activeModal.withdrawal.authorPenName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-[family-name:var(--font-bengali)]">পরিমাণ:</span>
                <span className="font-mono font-bold text-foreground">৳ {activeModal.withdrawal.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-[family-name:var(--font-bengali)]">মাধ্যম ও নম্বর:</span>
                <span className="font-mono font-bold text-foreground">{activeModal.withdrawal.payoutMethod} - {activeModal.withdrawal.payoutAccountNumber}</span>
              </div>
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
                onClick={handleAcceptConfirm}
                className="bg-blue-600 hover:bg-blue-700 text-white font-[family-name:var(--font-bengali)]"
              >
                {isProcessing ? "প্রক্রিয়াধীন..." : "হ্যাঁ, গ্রহণ করুন"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pay / Mark as Paid Modal */}
      {activeModal?.type === "pay" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <Send className="size-6" />
              <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
                উত্তোলন পরিশোধিত হিসেবে চিহ্নিত করুন
              </h3>
            </div>

            <p className="mt-2 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              লেখকের {activeModal.withdrawal.payoutMethod} নম্বরে (<strong>{activeModal.withdrawal.payoutAccountNumber}</strong>) ৳{activeModal.withdrawal.amount.toLocaleString()} প্রেরণের পর সফল ট্রানজেকশন আইডি (TrxID) দিন।
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
                পেমেন্ট ট্রানজেকশন আইডি (TrxID) *
              </label>
              <input
                type="text"
                required
                value={payoutTxId}
                onChange={(e) => setPayoutTxId(e.target.value)}
                placeholder="যেমন: 9B7X2K4L"
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs font-mono uppercase text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
                onClick={handlePayConfirm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-[family-name:var(--font-bengali)]"
              >
                {isProcessing ? "সংরক্ষণ হচ্ছে..." : "পরিশোধ নিশ্চিত করুন"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {activeModal?.type === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-destructive">
              <XCircle className="size-6" />
              <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
                উত্তোলন অনুরোধ প্রত্যাখ্যান
              </h3>
            </div>

            <p className="mt-2 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              অনুরোধটি প্রত্যাখ্যান করলে কোনো সংরক্ষিত অর্থ অবমুক্ত হয়ে লেখকের উত্তোলনযোগ্য ব্যালেন্সে ফিরে যাবে।
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
                প্রত্যাখ্যানের কারণ (ঐচ্ছিক)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="যেমন: মোবাইল নম্বরে সমস্যা বা ভুল অ্যাকাউন্ট টাইপ..."
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
                {isProcessing ? "প্রত্যাখ্যান হচ্ছে..." : "প্রত্যাখ্যান করুন"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
