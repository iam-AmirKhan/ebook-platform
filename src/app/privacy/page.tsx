import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Database,
  CreditCard,
  Mail,
  UserCheck,
  EyeOff,
  Clock,
  ArrowRight,
  HelpCircle,
  KeyRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Pustoka",
  description:
    "Read Pustoka's Privacy Policy to understand how we collect, use, and protect your personal information on Bangladesh's digital ebook marketplace.",
  openGraph: {
    title: "Privacy Policy | Pustoka",
    description:
      "Learn how Pustoka protects user privacy, reader data, payment records, and account credentials.",
  },
};

interface PrivacySection {
  id: string;
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  details: string[];
}

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "info-collected",
    number: "01",
    title: "Categories of Information Collected",
    icon: Database,
    summary:
      "We collect only the essential personal and technical details required to provide, manage, and secure our digital reading services.",
    details: [
      "Account Profile Details: When you register, we collect your full name, email address, and a securely hashed password. Passwords are never stored in readable plain text and are hashed with salted bcrypt encryption.",
      "Author Application Details: For users applying to publish books, we collect submitted pen names, biographical statements, contact phone numbers, and writing portfolios for editorial review.",
      "Reading Activity & Library State: We record your unlocked ebook orders, reading progression, reading lists, book ratings, and approved reviews to synchronize your personal bookshelf across devices.",
      "Technical & Session Metadata: Standard server and device telemetry, including IP addresses, browser types, and session tokens, collected to maintain platform security and defend against abusive requests.",
    ],
  },
  {
    id: "account-auth",
    number: "02",
    title: "Account Registration & Authentication",
    icon: KeyRound,
    summary:
      "Your credentials and active browsing sessions are protected using industry-standard authentication safeguards.",
    details: [
      "Session Management: We use secure, HTTP-only session cookies managed by our authentication framework to keep you safely logged in without exposing session tokens to client-side scripts.",
      "Local Browser State: A client-side shopping cart identifier is stored locally in your browser to preserve your book selections between page visits and is isolated to your profile once logged in.",
      "No Third-Party Ad Trackers: Pustoka does not deploy third-party advertising tracking pixels, behavioural broker tags, or cross-site monitoring beacons.",
    ],
  },
  {
    id: "payments-records",
    number: "03",
    title: "Order & Payment Records",
    icon: CreditCard,
    summary:
      "All transactions are conducted in Bangladeshi Taka (BDT) and managed with a strict separation between marketplace ordering and financial credentials.",
    details: [
      "Recorded Transaction Metadata: When you place an order, we log the order identifier, purchased book titles, payment method (such as bKash, Nagad, or domestic bank cards), customer-submitted transaction identifier (TrxID), and payment sender phone number.",
      "No Card or PIN Storage: Pustoka does not collect, process, or store credit/debit card numbers, CVV codes, or mobile financial service PINs. Payment authorizations take place directly through official provider channels.",
      "Ledger & Accounting Records: We maintain an immutable financial ledger of verified book purchases to credit author royalties accurately and support payment dispute investigations.",
    ],
  },
  {
    id: "email-comm",
    number: "04",
    title: "Email Communications & Notifications",
    icon: Mail,
    summary:
      "We use your registered email address exclusively for functional platform notifications, account security, and transaction notices.",
    details: [
      "Transactional Notices: We send essential account notifications, including registration confirmations, password reset links, order fulfillment receipts, and author application status updates.",
      "Service & Policy Updates: Important administrative messages concerning security notices, updates to these legal policies, or critical system maintenance.",
      "No Spam or Third-Party Sale: We do not sell, rent, or trade your email address to advertisers, nor do we send unsolicited promotional spam.",
    ],
  },
  {
    id: "data-use",
    number: "05",
    title: "How We Use Your Data",
    icon: UserCheck,
    summary:
      "Personal data is processed strictly to deliver our digital reading ecosystem, calculate author earnings, and maintain platform integrity.",
    details: [
      "Reading Access & Reader Delivery: Authenticating your identity and unlocking authorized ebook chapters in the Pustoka web reader.",
      "Order Fulfillment: Verifying submitted payment transaction IDs against platform checkout requests to unlock your digital book access.",
      "Author Royalty Accounting: Calculating legitimate sales volume and net royalties for author earnings reports and withdrawal management.",
      "Abuse Prevention & Moderation: Protecting published authors and readers against fraud, unauthorized manuscript scraping, and platform misuse.",
    ],
  },
  {
    id: "service-providers",
    number: "06",
    title: "Data Sharing & Service Providers",
    icon: EyeOff,
    summary:
      "We do not monetize your personal information. Limited data sharing occurs only with essential infrastructure and payment service partners.",
    details: [
      "Cloud Infrastructure & Hosting: Secure, encrypted cloud database hosting and application infrastructure that adhere to modern security protocols.",
      "Payment Verification Networks: Domestic mobile financial service channels or merchant processors solely for the purpose of validating submitted transaction records.",
      "Legal Compliance: Disclosures made only when strictly required to comply with applicable laws of Bangladesh, court orders, or legitimate regulatory inquiries.",
    ],
  },
  {
    id: "security-limits",
    number: "07",
    title: "Security Safeguards & Limitations",
    icon: ShieldCheck,
    summary:
      "We maintain rigorous safeguards while acknowledging the inherent technical limits of internet data transmission.",
    details: [
      "Encryption in Transit: All data transferred between your web browser and Pustoka servers is encrypted using modern Transport Layer Security (TLS/HTTPS).",
      "Administrative Access Boundaries: Access to operational database records is strictly restricted to authorized administrative roles.",
      "Inherent Security Limits: While we apply strict security controls, no internet transmission or electronic data storage method can guarantee absolute 100% security. Users remain responsible for maintaining strong passwords and keeping their login credentials confidential.",
    ],
  },
  {
    id: "retention",
    number: "08",
    title: "Data Retention & Storage Lifecycle",
    icon: Clock,
    summary:
      "Information is retained only as long as necessary to provide reading access to your purchased library and meet statutory obligations.",
    details: [
      "Active Account Library: Account profiles and purchased book entitlements are retained for the lifetime of your active account so you can access your digital books at any time.",
      "Financial Ledger Entries: Order history, transaction identifiers (TrxIDs), and royalty payout records are retained for auditing, dispute verification, and accounting purposes.",
      "Account Dormancy: Accounts with no verified purchases or activity may be archived after extended dormancy following reasonable notice.",
    ],
  },
  {
    id: "user-rights",
    number: "09",
    title: "User Rights & Privacy Requests",
    icon: HelpCircle,
    summary:
      "You have the right to review, update, or request the closure of your personal platform account.",
    details: [
      "Profile Updates: You can inspect and update your account name and credentials directly through your Account settings page.",
      "Privacy Requests & Account Closure: To request account closure, inquire about your stored information, or report a privacy issue, contact our platform support team.",
      "Effect of Closure: Closing an account deactivates your credentials. Note that historical payment ledger records are retained in compliance with applicable accounting and audit standards.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card via-background to-muted/10 py-14 sm:py-18">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand mb-4">
            <ShieldCheck className="size-3.5" />
            <span>Privacy &amp; Data Protection</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Privacy Policy
          </h1>

          <p className="mt-3 text-xs sm:text-sm font-medium text-muted-foreground">
            Last updated: October 21, 2026 • Effective immediately
          </p>

          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            At Pustoka, we believe digital reading should be accessible, safe, and transparent.
            This Privacy Policy explains how Pustoka (&quot;we&quot;, &quot;our&quot;, or &quot;the platform&quot;) collects, uses, protects, and handles your personal information when you browse our catalog, purchase digital ebooks, or publish your writing in Bangladesh.
          </p>
        </div>
      </section>

      {/* ── Policy Sections ── */}
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        {PRIVACY_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <article
              key={sec.id}
              id={`privacy-section-${sec.id}`}
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

        {/* ── Support & Inquiries Box ── */}
        <div className="mt-10 rounded-2xl border border-border/80 bg-gradient-to-r from-brand/10 via-card to-brand/5 p-6 sm:p-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Questions or Privacy Inquiries?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                If you have questions regarding this Privacy Policy, wish to request clarification about your data, or want to submit an account inquiry, our team is here to assist.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/about"
                id="privacy-cta-about"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand/90"
              >
                <span>About Pustoka</span>
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/account"
                id="privacy-cta-account"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                My Account
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
