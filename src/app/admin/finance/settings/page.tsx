import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPlatformSettings } from "@/lib/data/platform-settings";
import { AdminFinanceNav } from "@/components/admin/finance/AdminFinanceNav";
import { AdminSettingsForm } from "@/components/admin/finance/AdminSettingsForm";

export const metadata: Metadata = {
  title: "আর্থিক ও পেমেন্ট সেটিংস | অ্যাডমিন | Pustoka",
  description: "প্ল্যাটফর্ম কমিশন শতকরা হার ও bKash/Nagad ম্যানুয়াল পেমেন্ট সেটিংস।",
};

export default async function AdminFinanceSettingsPage() {
  await requireAdmin();

  const settings = await getPlatformSettings();

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <AdminFinanceNav />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            আর্থিক ও পেমেন্ট সেটিংস (Platform Financial Settings)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            প্ল্যাটফর্মের বিক্রয় কমিশন শতকরা হার এবং bKash ও Nagad পেমেন্ট নির্দেশনা ও নম্বরসমূহ পরিচালনা করুন।
          </p>
        </div>

        <AdminSettingsForm settings={settings} />
      </div>
    </div>
  );
}
