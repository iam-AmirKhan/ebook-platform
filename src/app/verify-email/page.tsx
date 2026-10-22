"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmailAction } from "@/actions/author-email";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    newEmail?: string;
    error?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!token) return;
    setIsVerifying(true);
    try {
      const res = await verifyEmailAction(token);
      setResult(res);
    } catch {
      setResult({
        success: false,
        error: "সার্ভারে সমস্যা দেখা দিয়েছে। দয়া করে আবার চেষ্টা করুন।",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // If token is missing
  if (!token) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
          অবৈধ ভেরিফিকেশন লিঙ্ক
        </h1>
        <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          কোনো ভেরিফিকেশন টোকেন পাওয়া যায়নি। অনুগ্রহ করে আপনার ইমেইলে পাঠানো সঠিক লিঙ্কটি ব্যবহার করুন।
        </p>
        <Link href="/author?tab=profile" className="mt-6 inline-block">
          <Button variant="outline" className="font-[family-name:var(--font-bengali)]">
            ড্যাশবোর্ডে ফিরে যান
          </Button>
        </Link>
      </div>
    );
  }

  // If verification completed
  if (result) {
    if (result.success) {
      return (
        <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/20 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-4">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
            ইমেইল সফলভাবে পরিবর্তিত হয়েছে!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            {result.message}
          </p>
          {result.newEmail && (
            <div className="mt-4 rounded-lg bg-muted/60 p-3 font-mono text-xs text-foreground font-semibold">
              {result.newEmail}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            পরবর্তী লগইন থেকে এই নতুন ইমেইল ঠিকানাটি ব্যবহার করুন।
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href="/author?tab=profile">
              <Button className="w-full sm:w-auto font-[family-name:var(--font-bengali)] gap-1.5">
                <span>লেখক ড্যাশবোর্ড</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
          যাচাইকরণ ব্যর্থ হয়েছে
        </h1>
        <p className="mt-2 text-sm text-destructive font-[family-name:var(--font-bengali)]">
          {result.error}
        </p>
        <p className="mt-3 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
          লিঙ্কটির মেয়াদ উত্তীর্ণ হয়ে থাকতে পারে অথবা ইতোমধ্যে ব্যবহার করা হয়েছে।
        </p>
        <Link href="/author?tab=profile" className="mt-6 inline-block">
          <Button variant="outline" className="font-[family-name:var(--font-bengali)]">
            ড্যাশবোর্ডে ফিরে যান
          </Button>
        </Link>
      </div>
    );
  }

  // Confirmation view before claiming
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand mb-4">
        <Mail className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
        নতুন ইমেইল নিশ্চিতকরণ
      </h1>
      <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
        আপনার Pustoka অ্যাকাউন্টের নতুন ইমেইল ঠিকানাটি নিশ্চিত করতে নিচের বাটনে ক্লিক করুন।
      </p>

      <div className="mt-6">
        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full font-[family-name:var(--font-bengali)] py-5 text-sm font-semibold"
        >
          {isVerifying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              যাচাই করা হচ্ছে...
            </span>
          ) : (
            "ইমেইল পরিবর্তন নিশ্চিত করুন"
          )}
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
        এই পরিবর্তনের পর আপনার পূর্বের ইমেইলটি পরিবর্তিত হয়ে নতুন ইমেইলে প্রতিস্থাপিত হবে।
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            লোড হচ্ছে...
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
