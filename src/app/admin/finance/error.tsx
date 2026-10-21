"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";

export default function AdminFinanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Finance Error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center font-[family-name:var(--font-bengali)]">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="size-8" />
      </div>
      <h2 className="text-xl font-bold text-foreground">
        আর্থিক তথ্য লোড করতে সমস্যা হয়েছে
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        আর্থিক ডাটাবেস বা লেজার রেকর্ডে সংযোগের সময় একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে।
      </p>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          variant="outline"
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          আবার চেষ্টা করুন
        </Button>
        <Link href="/admin">
          <Button className="gap-2">
            <ArrowLeft className="size-4" />
            অ্যাডমিন ড্যাশবোর্ডে ফিরুন
          </Button>
        </Link>
      </div>
    </div>
  );
}
