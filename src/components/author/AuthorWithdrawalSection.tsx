"use client";

import { useState } from "react";
import { requestWithdrawalAction, cancelWithdrawalAction } from "@/actions/author-finance";
import { Button } from "@/components/ui/button";
import type { AuthorFinancialSummary, AuthorWithdrawalItem } from "@/types/author";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface AuthorWithdrawalSectionProps {
  summary: AuthorFinancialSummary;
  withdrawals: AuthorWithdrawalItem[];
}

export function AuthorWithdrawalSection({
  summary,
  withdrawals,
}: AuthorWithdrawalSectionProps) {
  const [amount, setAmount] = useState<string>("");
  const [payoutMethod, setPayoutMethod] = useState<"BKASH" | "NAGAD">("BKASH");
  const [payoutAccountNumber, setPayoutAccountNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const canWithdraw = summary.availableBalance >= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      setFeedback({
        type: "error",
        message: "ন্যূনতম উত্তোলনের পরিমাণ ১০০ টাকা।",
      });
      return;
    }

    if (numAmount > summary.availableBalance) {
      setFeedback({
        type: "error",
        message: `আপনার উত্তোলনযোগ্য ব্যালেন্স (৳${summary.availableBalance.toLocaleString()}) এর চেয়ে বেশি অনুরোধ করা যাবে না।`,
      });
      return;
    }

    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(payoutAccountNumber.trim())) {
      setFeedback({
        type: "error",
        message: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)।",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("amount", String(numAmount));
      formData.set("payoutMethod", payoutMethod);
      formData.set("payoutAccountNumber", payoutAccountNumber.trim());

      const res = await requestWithdrawalAction(null, formData);

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "উত্তোলন অনুরোধ সফলভাবে জমা হয়েছে!",
        });
        setAmount("");
        setPayoutAccountNumber("");
      } else {
        setFeedback({
          type: "error",
          message: res.error || "উত্তোলন অনুরোধ ব্যর্থ হয়েছে।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "সার্ভারে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই উত্তোলন অনুরোধটি প্রত্যাহার করতে চান?")) {
      return;
    }

    setCancellingId(id);
    setFeedback(null);

    try {
      const res = await cancelWithdrawalAction(id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "উত্তোলন প্রত্যাহার করা হয়েছে।",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "উত্তোলন প্রত্যাহার করা যায়নি।",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "সার্ভারে ত্রুটি দেখা দিয়েছে।",
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Payout Request Card */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
          <div>
            <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
              অর্থ উত্তোলনের অনুরোধ (Withdrawal Request)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
              আপনার অর্জিত রয়্যালটি bKash অথবা Nagad অ্যাকাউন্টে স্থানান্তর করুন।
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-2 text-right">
            <span className="text-[11px] font-medium text-muted-foreground font-[family-name:var(--font-bengali)]">
              উত্তোলনযোগ্য ব্যালেন্স
            </span>
            <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ৳ {summary.availableBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-5 flex items-start gap-2.5 rounded-xl border p-4 text-xs font-[family-name:var(--font-bengali)] ${
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

        {canWithdraw ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
                  উত্তোলনের পরিমাণ (টাকা) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    max={summary.availableBalance}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="যেমন: ৫০০"
                    className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(String(summary.availableBalance))}
                    className="absolute right-2 top-2 rounded bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground font-[family-name:var(--font-bengali)]"
                  >
                    সর্বোচ্চ
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground font-[family-name:var(--font-bengali)]">
                  ন্যূনতম ১০০ টাকা
                </span>
              </div>

              {/* Method */}
              <div>
                <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
                  উত্তোলনের মাধ্যম *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("BKASH")}
                    className={`rounded-lg border px-3 py-2.5 text-center text-xs font-bold transition-all ${
                      payoutMethod === "BKASH"
                        ? "border-pink-500 bg-pink-50/50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-300 ring-1 ring-pink-500"
                        : "border-border/80 bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    bKash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("NAGAD")}
                    className={`rounded-lg border px-3 py-2.5 text-center text-xs font-bold transition-all ${
                      payoutMethod === "NAGAD"
                        ? "border-orange-500 bg-orange-50/50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 ring-1 ring-orange-500"
                        : "border-border/80 bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    Nagad
                  </button>
                </div>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-semibold text-foreground font-[family-name:var(--font-bengali)] mb-1.5">
                  মোবাইল নম্বর ({payoutMethod === "BKASH" ? "বিকাশ" : "নগদ"}) *
                </label>
                <input
                  type="text"
                  required
                  value={payoutAccountNumber}
                  onChange={(e) => setPayoutAccountNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-[family-name:var(--font-bengali)]"
              >
                {isSubmitting ? "অনুরোধ পাঠানো হচ্ছে..." : "উত্তোলন অনুরোধ পাঠান"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-5 rounded-xl border border-muted bg-muted/20 p-4 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            উত্তোলন অনুরোধ করার জন্য আপনার অ্যাকাউন্টে ন্যূনতম ১০০ টাকা উত্তোলনযোগ্য ব্যালেন্স থাকতে হবে। আপনার বই বিক্রি হলে এখানে ব্যালেন্স জমা হবে।
          </div>
        )}
      </div>

      {/* Withdrawal History Table */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xs">
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)]">
            উত্তোলন ইতিহাস ও স্ট্যাটাস
          </h3>
          <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            আপনার সকল উত্তোলনের অনুরোধ এবং পেমেন্টের ট্র্যাকিং।
          </p>
        </div>

        {withdrawals.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            এখনো কোনো উত্তোলন অনুরোধ করা হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-[family-name:var(--font-bengali)]">
              <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">তারিখ</th>
                  <th className="px-4 py-3 font-semibold">পরিমাণ</th>
                  <th className="px-4 py-3 font-semibold">মাধ্যম ও নম্বর</th>
                  <th className="px-4 py-3 font-semibold">অবস্থা (Status)</th>
                  <th className="px-4 py-3 font-semibold">ট্রানজেকশন / মন্তব্য</th>
                  <th className="px-5 py-3 font-semibold text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {withdrawals.map((w) => (
                  <tr key={w._id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {new Date(w.createdAt).toLocaleDateString("bn-BD")}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                      ৳ {w.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{w.payoutMethod}</div>
                      <div className="font-mono text-muted-foreground">{w.payoutAccountNumber}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {w.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                          <Clock className="size-3" />
                          অপেক্ষমাণ (Pending)
                        </span>
                      )}
                      {w.status === "ACCEPTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                          <CheckCircle2 className="size-3" />
                          গৃহীত ও সংরক্ষিত (Accepted)
                        </span>
                      )}
                      {w.status === "PAID" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          পরিশোধিত (Paid)
                        </span>
                      )}
                      {w.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                          <XCircle className="size-3" />
                          প্রত্যাখ্যাত (Rejected)
                        </span>
                      )}
                      {w.status === "CANCELLED" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          প্রত্যাহারকৃত (Cancelled)
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
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {w.status === "PENDING" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancellingId === w._id}
                          onClick={() => handleCancel(w._id)}
                          className="h-8 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          {cancellingId === w._id ? "প্রত্যাহার হচ্ছে..." : "প্রত্যাহার করুন"}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
