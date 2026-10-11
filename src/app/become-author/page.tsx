import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/authorization";
import { getLatestAuthorApplicationForUser } from "@/lib/data/author-applications";
import { AuthorApplicationForm } from "@/components/become-author/AuthorApplicationForm";
import type { AuthorApplicationStatus } from "@/models/AuthorApplication";

export const metadata: Metadata = {
  title: "লেখক হোন | Pustoka",
  description: "Pustoka-তে লেখক হিসেবে আবেদন করুন।",
};

const STATUS_LABEL: Record<AuthorApplicationStatus, string> = {
  PENDING: "পর্যালোচনাধীন",
  APPROVED: "অনুমোদিত",
  REJECTED: "প্রত্যাখ্যাত",
};

const STATUS_CLASS: Record<AuthorApplicationStatus, string> = {
  PENDING: "border-brand/30 bg-brand/10 text-brand",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  REJECTED: "border-destructive/30 bg-destructive/10 text-destructive",
};

const MISSING_APPLICATION_VALUE = "দেওয়া হয়নি";

function displayApplicationValue(value: string): string {
  return value.trim() || MISSING_APPLICATION_VALUE;
}

export default async function BecomeAuthorPage() {
  const user = await requireRole("USER");
  const application = await getLatestAuthorApplicationForUser(user.id);
  const canSubmit =
    !application || application.status === "REJECTED";

  return (
    <div className="flex flex-1 flex-col bg-muted/5">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
            লেখক হোন
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground font-[family-name:var(--font-bengali)]">
            Pustoka-তে লেখক হিসেবে যুক্ত হতে আপনার তথ্য জমা দিন। আবেদন
            অনুমোদনের পরবর্তী ধাপ পরে চালু হবে।
          </p>
        </div>

        {application && (
          <section
            aria-labelledby="application-status-heading"
            className="mb-8 rounded-xl border border-border/60 bg-card p-5 sm:p-6"
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
                {application.socialLinks.length > 0 ? (
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

        {canSubmit && (
          <section
            aria-labelledby="author-application-form-heading"
            className="rounded-xl border border-border/60 bg-card p-5 sm:p-6"
          >
            <h2
              id="author-application-form-heading"
              className="mb-5 text-base font-semibold text-foreground font-[family-name:var(--font-bengali)]"
            >
              আবেদন ফর্ম
            </h2>
            <AuthorApplicationForm
              defaultDisplayName={user.name}
              email={user.email}
            />
          </section>
        )}
      </div>
    </div>
  );
}
