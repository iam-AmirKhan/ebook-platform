"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminCategoriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin categories error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
          <AlertCircle className="size-7" />
        </div>

        <h1 className="mt-5 text-xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
          বিভাগ তথ্য লোড করতে সমস্যা হয়েছে
        </h1>

        <p className="mt-2 max-w-md text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
          বিভাগ ব্যবস্থাপনা পেজ লোড করার সময় একটি সমস্যা দেখা দিয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="flex items-center gap-2 font-[family-name:var(--font-bengali)]"
          >
            <RotateCcw className="size-4" />
            <span>আবার চেষ্টা করুন</span>
          </Button>

          <Link
            href="/admin"
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted font-[family-name:var(--font-bengali)]"
          >
            <ArrowLeft className="size-4" />
            <span>অ্যাডমিন ড্যাশবোর্ডে ফিরুন</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
