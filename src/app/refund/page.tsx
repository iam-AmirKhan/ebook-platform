import type { Metadata } from "next";
import Link from "next/link";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  BookOpen,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Refund Policy | Pustoka",
  description:
    "Read Pustoka's Refund & Cancellation Policy for digital ebook purchases, duplicate payments, and access fulfillment in Bangladesh.",
  openGraph: {
    title: "Refund Policy | Pustoka",
    description:
      "Understand Pustoka's resolution guidelines for payment disputes, technical delivery issues, and digital ebook purchases.",
  },
};

interface RefundSection {
  id: string;
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  details: string[];
}

const REFUND_SECTIONS: RefundSection[] = [
  {
    id: "digital-nature",
    number: "01",
    title: "Digital Product Delivery Nature & Previews",
    icon: BookOpen,
    summary:
      "Ebooks on Pustoka are intangible digital goods made accessible immediately upon transaction verification.",
    details: [
      "Instant Reading Delivery: Once your transaction is verified by our system or admin team, access to the complete ebook is unlocked in your personal digital bookshelf and immediately readable in the Pustoka web reader.",
      "Free Sample Previews: To ensure informed purchasing decisions, every book listed on Pustoka provides free introductory chapters and preview sections prior to purchase.",
      "Delivered Content Nature: Because digital reading access cannot be physically returned or unread once delivered, fulfilled purchases are handled under specific criteria outlined below.",
    ],
  },
  {
    id: "duplicate-failed",
    number: "02",
    title: "Duplicate Charges & Payment Failures",
    icon: CreditCard,
    summary:
      "Accidental duplicate deductions or network timeout deductions are fully eligible for investigation and refund.",
    details: [
      "Duplicate Deductions: If your bKash, Nagad, or bank card is charged more than once for the same order due to a mobile network glitch or checkout refresh, the redundant transaction is eligible for a full refund.",
      "Failed Order Deduction: If funds are deducted by your payment provider but the checkout process times out or fails to record an order in your account, we will verify the transaction ID and either process a refund or credit the purchase.",
      "Required Verification Details: To verify the claim, users will be requested to provide the official transaction identifier (TrxID), payment method, sender mobile number, and payment confirmation details.",
    ],
  },
  {
    id: "unfulfilled-access",
    number: "03",
    title: "Payment Confirmed Without Reading Access",
    icon: AlertTriangle,
    summary:
      "If you paid for a book and cannot access it due to a platform delivery failure, our priority is resolution or refund.",
    details: [
      "Access Fulfillment Failure: In the rare event that a payment is verified but the system fails to unlock the purchased book chapters in your account library, our engineering team prioritizes restoring your reading access immediately.",
      "Unresolvable Technical Fault: If technical access cannot be unlocked within a reasonable period, the customer is eligible for a full refund of the purchase amount.",
      "Defective Content: If a published book is found to suffer from missing chapters or severe rendering defects that prevent reading, and the issue is not remedied promptly, you are eligible for dispute resolution or a refund.",
    ],
  },
  {
    id: "fulfilled-purchases",
    number: "04",
    title: "Successfully Fulfilled Digital Purchases",
    icon: CheckCircle2,
    summary:
      "Guidelines regarding completed, fully accessible digital ebook purchases.",
    details: [
      "Delivered Content Principle: When payment is verified and the reader has unlocked the complete book without technical defect, digital purchases are generally considered completed and non-refundable.",
      "Subjective Impressions: Because free previews are available prior to purchase, refunds are typically not granted for change of mind after reading, subjective literary preference, or device incompatibility if standard web browser standards are met.",
      "Policy Status Notice: Pustoka does not enforce an unreviewed, absolute non-refundable rule without individual consideration; genuine dispute claims are evaluated in good faith while the platform's formal commercial return terms remain subject to owner review.",
    ],
  },
  {
    id: "request-process",
    number: "05",
    title: "Dispute Submission & Investigation Procedure",
    icon: Clock,
    summary:
      "A structured, transparent procedure for reporting transaction or access issues.",
    details: [
      "Step 1 — Gather Information: Prepare your registered account email, order number (if assigned), book title, payment channel (bKash, Nagad, Card), sender mobile number, and transaction identifier (TrxID).",
      "Step 2 — Submit Claim: Submit your inquiry via platform messaging or customer support contact channels referenced in your account portal.",
      "Step 3 — Ledger Verification: Our administration cross-checks the claim against our database transaction ledger and informs you of the findings and resolution.",
    ],
  },
  {
    id: "settlement-channels",
    number: "06",
    title: "Approved Refund Settlement & Reversal Channels",
    icon: RotateCcw,
    summary:
      "How approved refunds are remitted back to customers.",
    details: [
      "Originating Payment Channel: Approved refunds are credited directly back to the originating bKash wallet, Nagad account, or bank card whenever supported by domestic provider gateway infrastructure.",
      "Payment Network Processing: The timing of fund clearance depends on domestic payment network clearance protocols and provider verification procedures.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card via-background to-muted/10 py-14 sm:py-18">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand mb-4">
            <RotateCcw className="size-3.5" />
            <span>Customer Protection &amp; Refunds</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Refund &amp; Cancellation Policy
          </h1>

          <p className="mt-3 text-xs sm:text-sm font-medium text-muted-foreground">
            Last updated: October 21, 2026 • Effective immediately
          </p>

          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            At Pustoka, we want every reader to enjoy a smooth, reliable digital book purchasing experience.
            Because our catalog consists of instantly accessible digital ebooks, this policy outlines the terms under which payment corrections, access resolutions, and refund claims are investigated and resolved in Bangladesh.
          </p>
        </div>
      </section>

      {/* ── Policy Sections ── */}
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        {REFUND_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <article
              key={sec.id}
              id={`refund-section-${sec.id}`}
              className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs transition-colors hover:border-brand/40"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand font-bold text-sm">
                    {sec.number}
                  </span>
                  <span className="hidden sm:flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                      {sec.title}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {sec.summary}
                    </p>
                  </div>

                  <ul className="mt-3 space-y-2 border-t border-border/50 pt-3">
                    {sec.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/80 leading-relaxed"
                      >
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}

        {/* ── Unresolved Business Decisions Notice (Owner Review) ── */}
        <section
          id="unresolved-business-decisions"
          aria-label="Pending Business Decisions for Owner Review"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8 space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <ClipboardList className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Policy Parameters Pending Platform Owner Confirmation
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                To ensure total transparency with readers while avoiding unverified operational claims, the following specific business parameters are marked for administrative and platform owner review:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Decision Item 1
              </span>
              <h3 className="text-sm font-bold text-foreground">
                Dispute Reporting Window
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The exact timeframe (e.g. within a specific number of days or hours from deduction) in which duplicate or access claims must be reported is pending owner confirmation.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Decision Item 2
              </span>
              <h3 className="text-sm font-bold text-foreground">
                Fulfilled Ebook Return Scope
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Whether successfully delivered digital purchases may ever qualify for store credit or refund under narrow exceptional conditions remains open for owner determination.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Decision Item 3
              </span>
              <h3 className="text-sm font-bold text-foreground">
                Provider Reversal Fee Treatment
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Whether external mobile financial service or payment gateway reversal fees are absorbed by Pustoka or deducted from processed refunds is pending owner review.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Decision Item 4
              </span>
              <h3 className="text-sm font-bold text-foreground">
                Standard Settlement Turnaround
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Formal settlement turnaround commitments for domestic payment methods will be finalized upon agreement with gateway and mobile network clearing partners.
              </p>
            </div>
          </div>
        </section>

        {/* ── Support & Inquiries Box ── */}
        <div className="mt-10 rounded-2xl border border-border/80 bg-gradient-to-r from-brand/10 via-card to-brand/5 p-6 sm:p-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Need Help with a Payment or Book Access?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                If you encountered a duplicate charge, missing access, or payment issue, our support team will review your transaction and help you resolve it quickly.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/account"
                id="refund-cta-account"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand/90"
              >
                <span>Check Purchases</span>
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/about"
                id="refund-cta-about"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                About Pustoka
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
