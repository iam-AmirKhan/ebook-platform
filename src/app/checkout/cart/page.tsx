import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicPaymentSettings } from "@/lib/data/platform-settings";
import { MultiBookCheckoutForm } from "@/components/checkout/MultiBookCheckoutForm";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "কার্ট চেকআউট | Pustoka",
  description: "একাধিক বইয়ের জন্য একক bKash / Nagad ম্যানুয়াল পেমেন্ট",
};

export default async function MultiBookCheckoutPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?next=/checkout/cart");
  }

  const settings = await getPublicPaymentSettings();

  return (
    <div className="flex flex-1 flex-col bg-muted/10 py-10 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Navigation back to cart */}
        <div className="mb-6">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground font-[family-name:var(--font-bengali)]"
          >
            <ArrowLeft className="size-3.5" />
            <span>শপিং কার্টে ফিরে যান</span>
          </Link>
        </div>

        {/* Multi-Book Checkout Form */}
        <MultiBookCheckoutForm
          settings={settings}
          userEmail={user.email || ""}
        />
      </div>
    </div>
  );
}
