"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

export default function AuthorDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Author Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <h2 className="text-lg font-bold text-foreground font-[family-name:var(--font-bengali)]">
        বইয়ের তালিকা লোড করতে সমস্যা হয়েছে
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
        ডাটাবেজ বা সার্ভারে কোনো সমস্যার কারণে বইয়ের তালিকা লোড করা সম্ভব হয়নি।
        অনুগ্রহ করে আবার চেষ্টা করুন।
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          size="sm"
          className="font-[family-name:var(--font-bengali)] cursor-pointer"
        >
          <RefreshCw className="size-3.5 mr-1" />
          আবার চেষ্টা করুন
        </Button>
        <Link
          href="/author"
          className={`${buttonVariants({ variant: "outline", size: "sm" })} font-[family-name:var(--font-bengali)]`}
        >
          <ArrowLeft className="size-3.5 mr-1" />
          লেখক ড্যাশবোর্ডে ফিরুন
        </Link>
      </div>
    </div>
  );
}

