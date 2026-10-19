import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getLatestAuthorApplicationForUser } from "@/lib/data/author-applications";
import { AuthorApplicationForm } from "@/components/become-author/AuthorApplicationForm";
import type { AuthorApplicationStatus } from "@/models/AuthorApplication";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, UserCheck, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "লেখক হোন | Pustoka",
  description: "Pustoka-তে লেখক হিসেবে আবেদন করুন। আপনার সাহিত্যকর্ম ও ভাবনা পৌঁছে দিন হাজারো পাঠকের কাছে।",
};

const STATUS_LABEL: Record<AuthorApplicationStatus, string> = {
  PENDING: "পর্যালোচনাধীন",
  APPROVED: "অনুমোদিত",
  REJECTED: "প্রত্যাখ্যাত",
};

const STATUS_CLASS: Record<AuthorApplicationStatus, string> = {
  PENDING: "border-brand/30 bg-brand/10 text-brand",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJECTED: "border-destructive/30 bg-destructive/10 text-destructive",
};

const MISSING_APPLICATION_VALUE = "দেওয়া হয়নি";

function displayApplicationValue(value?: string | null): string {
  if (!value) return MISSING_APPLICATION_VALUE;
  return value.trim() || MISSING_APPLICATION_VALUE;
}

export default async function BecomeAuthorPage() {
  const user = await getCurrentUser();

  // ── Role 1: Approved AUTHOR ──
  if (user?.role === "AUTHOR") {
    return (
      <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl border border-emerald-500/30 bg-card p-8 sm:p-12 shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
              আপনি ইতিমধ্যে একজন অনুমোদিত লেখক
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm sm:text-base text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
              স্বাগতম, <strong className="text-foreground">{user.name}</strong>। আপনার অ্যাকাউন্টটি লেখক হিসেবে অনুমোদিত রয়েছে। নতুন বই তৈরি বা প্রকাশ করতে সরাসরি লেখক ড্যাশবোর্ডে যান।
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/author/books/new">
                <Button className="font-[family-name:var(--font-bengali)] gap-2">
                  <span>নতুন বই লিখুন</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/author">
                <Button variant="outline" className="font-[family-name:var(--font-bengali)]">
                  লেখক ড্যাশবোর্ড
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Role 2: ADMIN ──
  if (user?.role === "ADMIN") {
    return (
      <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-12 shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-4">
              <ShieldCheck className="size-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
              অ্যাডমিন অ্যাকাউন্ট
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm sm:text-base text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
              আপনি প্ল্যাটফর্ম অ্যাডমিন হিসেবে লগইন আছেন। আপনি লেখক আবেদনসমূহ পর্যবেক্ষণ এবং অনুমোদন বা প্রত্যাখ্যান করতে পারেন।
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/admin/author-applications">
                <Button className="font-[family-name:var(--font-bengali)]">
                  লেখক আবেদনসমূহ
                </Button>
              </Link>
              <Link href="/admin/books">
                <Button variant="outline" className="font-[family-name:var(--font-bengali)]">
                  বই পরিচালনা করুন
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="ghost" className="font-[family-name:var(--font-bengali)]">
                  অ্যাডমিন ড্যাশবোর্ড
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Role 3: Logged-in USER or Guest ──
  const application = user ? await getLatestAuthorApplicationForUser(user.id) : null;
  const canSubmit = !application || application.status === "REJECTED";

  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-0.5 text-xs font-semibold text-brand font-[family-name:var(--font-bengali)] mb-3">
            <UserCheck className="size-3.5" />
            <span>লেখক অন্তর্ভুক্তি</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            লেখক হোন
          </h1>
          <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
            Pustoka-তে লেখক হিসেবে যুক্ত হতে আপনার তথ্য জমা দিন। আমাদের প্রকাশনা নীতি অনুযায়ী আবেদন পর্যালোচনার পর আপনি অনুমোদিত লেখক হিসেবে বই লিখতে ও প্রকাশ করতে পারবেন।
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            <span>আবেদনের আগে নিয়মাবলি জানতে চান?</span>
            <Link
              href="/publishing-policy"
              className="text-brand underline-offset-4 hover:underline font-semibold"
            >
              বই প্রকাশের নিয়মাবলি পড়ুন
            </Link>
          </div>
        </div>

        {/* Existing Application Status Card (for logged-in USER) */}
        {application && (
          <section
            aria-labelledby="application-status-heading"
            className="mb-8 rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2
                  id="application-status-heading"
                  className="text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]"
                >
                  আপনার আবেদন
                </h2>
                <p className="mt-1 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
                  জমা দেওয়া হয়েছে{" "}
                  {new Date(application.createdAt).toLocaleDateString("bn-BD", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <span
                className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold font-[family-name:var(--font-bengali)] ${STATUS_CLASS[application.status]}`}
              >
                {STATUS_LABEL[application.status]}
              </span>
            </div>

            {application.status === "PENDING" && (
              <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-3.5 text-xs sm:text-sm text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
                আপনার আবেদনটি বর্তমানে আমাদের মডারেশন দলের পর্যালোচনায় রয়েছে। সাধারণত ১–২ কার্যদিবসের মধ্যে আবেদন পর্যালোচনা সম্পন্ন হয়। অনুগ্রহ করে অপেক্ষা করুন।
              </div>
            )}

            {application.status === "REJECTED" && (
              <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs sm:text-sm text-destructive font-[family-name:var(--font-bengali)] leading-relaxed">
                আপনার পূর্ববর্তী আবেদনটি অনুমোদিত হয়নি। আপনি তথ্য সংশোধন করে নিচে পুনরায় আবেদন জমা দিতে পারেন।
              </div>
            )}

            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-foreground font-[family-name:var(--font-bengali)]">
                  লেখক নাম
                </p>
                <p className="mt-1 text-muted-foreground font-[family-name:var(--font-bengali)]">
                  {application.displayName}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground font-[family-name:var(--font-bengali)]">
                  অবস্থা
                </p>
                <p className="mt-1 text-muted-foreground font-[family-name:var(--font-bengali)]">
                  {STATUS_LABEL[application.status]}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground font-[family-name:var(--font-bengali)]">
                  ইমেইল
                </p>
                <p className="mt-1 text-muted-foreground">
                  {displayApplicationValue(application.email)}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground font-[family-name:var(--font-bengali)]">
                  ফোন নম্বর
                </p>
                <p className="mt-1 text-muted-foreground font-[family-name:var(--font-bengali)]">
                  {displayApplicationValue(application.phone)}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground font-[family-name:var(--font-bengali)]">
                  পেশা
                </p>
                <p className="mt-1 text-muted-foreground font-[family-name:var(--font-bengali)]">
                  {displayApplicationValue(application.occupation)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-medium text-foreground font-[family-name:var(--font-bengali)]">
                  ঠিকানা
                </p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground font-[family-name:var(--font-bengali)]">
                  {displayApplicationValue(application.address)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-medium text-foreground font-[family-name:var(--font-bengali)]">
                  সামাজিক মাধ্যম
                </p>
                {application.socialLinks && application.socialLinks.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {application.socialLinks.map((link) => (
                      <li key={`${link.platform}-${link.url}`}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand underline-offset-4 hover:underline"
                        >
                          {displayApplicationValue(link.platform)}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-muted-foreground font-[family-name:var(--font-bengali)]">
                    {MISSING_APPLICATION_VALUE}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Form Section */}
        {canSubmit && (
          <section
            aria-labelledby="author-application-form-heading"
            className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs"
          >
            <div className="mb-6">
              <h2
                id="author-application-form-heading"
                className="text-lg font-semibold text-foreground font-[family-name:var(--font-bengali)]"
              >
                {application?.status === "REJECTED" ? "পুনরায় আবেদন করুন" : "লেখক আবেদন ফর্ম"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
                অনুগ্রহ করে নির্ভুল তথ্য প্রদান করুন। তারকাবহুল (*) ক্ষেত্রগুলো আবশ্যক।
              </p>
            </div>

            <AuthorApplicationForm
              isAuthenticated={!!user}
              defaultDisplayName={user?.name}
              email={user?.email}
            />
          </section>
        )}
      </div>
    </div>
  );
}
