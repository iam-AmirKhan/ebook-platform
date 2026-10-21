import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  UserCheck,
  BookOpen,
  PenTool,
  CreditCard,
  Ban,
  ShieldAlert,
  Scale,
  ArrowRight,
  HelpCircle,
  ShieldX,
  Layers,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Pustoka",
  description:
    "Read Pustoka's Terms of Service governing user accounts, author publishing, digital ebook licenses, and platform usage in Bangladesh.",
  openGraph: {
    title: "Terms of Service | Pustoka",
    description:
      "Review the terms, licenses, and conditions for reading and publishing on Pustoka.",
  },
};

interface TermsSection {
  id: string;
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  details: string[];
}

const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "acceptance",
    number: "01",
    title: "Acceptance of Terms & Eligibility",
    icon: FileText,
    summary:
      "By creating an account, browsing books, or purchasing digital content on Pustoka, you agree to comply with and be bound by these Terms of Service.",
    details: [
      "Binding Agreement: These Terms constitute a binding legal agreement between you and Pustoka regarding your access to and use of our digital platform.",
      "Legal Eligibility: You represent that you have the legal capacity to enter into binding agreements under the applicable laws of Bangladesh and that all registration details you submit are accurate and complete.",
      "Periodic Updates: Pustoka may revise these Terms as the platform evolves. Continued use of the platform following published revisions constitutes acceptance of the updated terms.",
    ],
  },
  {
    id: "accounts",
    number: "02",
    title: "User Accounts & Credential Security",
    icon: UserCheck,
    summary:
      "Users are responsible for safeguarding their login credentials and maintaining accurate account details.",
    details: [
      "Credential Confidentiality: You are solely responsible for maintaining the confidentiality of your password and account session credentials, and for all activities that occur under your account.",
      "Accurate Profile Information: You agree to provide a valid email address and genuine profile information to ensure delivery of order receipts, password resets, and critical account communications.",
      "Unauthorized Access Notice: You agree to notify Pustoka support immediately if you suspect or discover any unauthorized access to or compromise of your account.",
    ],
  },
  {
    id: "digital-license",
    number: "03",
    title: "Ebook Purchases & Digital Reading License",
    icon: BookOpen,
    summary:
      "Purchasing an ebook grants you a personal digital reading license, not ownership of the underlying literary copyright.",
    details: [
      "Personal Reading License: Upon verified payment, Pustoka grants you a personal, non-exclusive, non-transferable, and revocable license to access and read the ebook through the Pustoka web reader.",
      "No Redistribution or Resale: Digital book purchases do not convey reproduction, redistribution, broadcasting, resale, or sublicensing rights. You may not extract, resell, or publicly circulate ebook files or text.",
      "Library Delivery: Purchased titles are linked to your registered Pustoka account library and accessible as long as your account remains in good standing and the service is operational.",
    ],
  },
  {
    id: "author-rights",
    number: "04",
    title: "Author Publishing & Intellectual Rights",
    icon: PenTool,
    summary:
      "Authors retain full ownership of their original manuscripts while granting Pustoka a non-exclusive license to format, display, and distribute them.",
    details: [
      "Author Copyright Retention: Authors retain all copyright, moral rights, and proprietary interests in their original published manuscripts.",
      "Non-Exclusive Distribution License: By submitting a manuscript for publication, authors grant Pustoka a non-exclusive digital license to host, format, index, display, and distribute the work to readers through the platform.",
      "Publishing Policy Adherence: Authors must adhere strictly to the Pustoka Publishing Policy, including the requirements for original human authorship, a minimum of 5 substantive chapters, and approved price limits (৳100–৳300).",
      "Author Representations: Authors warrant that their submitted works are original, do not infringe upon any third-party intellectual property or privacy rights, and comply with the applicable laws of Bangladesh.",
    ],
  },
  {
    id: "payments-pricing",
    number: "05",
    title: "Pricing, Payments & Transaction Integrity",
    icon: CreditCard,
    summary:
      "All book prices are set in Bangladeshi Taka (BDT) and payments are verified through domestic payment channels.",
    details: [
      "Currency & Pricing: Book prices are specified in Bangladeshi Taka (BDT). Authors set book pricing within platform-enforced boundaries (৳100 to ৳300).",
      "Payment Channels: Purchases are facilitated via domestic payment options, including bKash, Nagad, and supported bank cards.",
      "Transaction Honesty: Submitting fabricated transaction identifiers (TrxIDs), false sender telephone numbers, or engaging in payment deception is strictly prohibited and results in immediate order cancellation and account action.",
    ],
  },
  {
    id: "content-protection",
    number: "06",
    title: "Content Protection & Technical Safeguards",
    icon: ShieldAlert,
    summary:
      "Pustoka enforces technical content protections to defend author manuscripts against piracy and unauthorized automated extraction.",
    details: [
      "Prohibited Automated Extraction: You may not use automated scrapers, bots, crawlers, harvest scripts, or browser extensions to systematically copy, download, or index literary text or reader assets.",
      "Circumvention Prohibited: Attempting to bypass chapter access controls, alter verification tokens, reverse-engineer reader software, or disable security headers is strictly forbidden.",
      "Enforcement: Unauthorized access or content extraction will result in immediate account termination, revocation of reading entitlements, and potential legal remedies under the applicable laws of Bangladesh.",
    ],
  },
  {
    id: "prohibited-misuse",
    number: "07",
    title: "Prohibited Misuse & Community Standards",
    icon: Ban,
    summary:
      "We maintain a constructive, respectful, and safe reading and publishing environment for all community members.",
    details: [
      "Abusive Conduct: Users may not harass, defame, impersonate, intimidate, or threaten authors, readers, or platform administration.",
      "Review & Rating Integrity: Book reviews and ratings must reflect genuine reading impressions. Coordinated review manipulation, extortion, deceptive testimonials, or spam reviews are strictly forbidden.",
      "Infrastructure Protection: Attempting denial-of-service disruptions, injecting malicious code, probing vulnerabilities, or interfering with server operations is strictly prohibited.",
    ],
  },
  {
    id: "intellectual-property",
    number: "08",
    title: "Platform Intellectual Property",
    icon: Layers,
    summary:
      "The Pustoka platform, branding, user interface design, and proprietary code are owned exclusively by Pustoka.",
    details: [
      "Platform Assets: The Pustoka name, brand identity, visual layout, web reader interface, logos, and software codebase are protected by copyright, trademark, and intellectual property laws.",
      "Author Assets: Individual book covers, manuscript prose, author pen names, and biographical descriptions remain the intellectual property of their respective copyright holders.",
    ],
  },
  {
    id: "account-suspension",
    number: "09",
    title: "Account Suspension & Termination",
    icon: ShieldX,
    summary:
      "Pustoka reserves the right to suspend or terminate accounts that breach platform rules, commit fraud, or infringe on intellectual property.",
    details: [
      "Grounds for Administrative Action: Accounts may be suspended or terminated for submitting fraudulent transaction IDs, plagiarizing or infringing copyrights, scraping reader content, engaging in harassment, or violating publishing rules.",
      "Consequences of Termination: Upon account termination, your login access is immediately revoked, published books may be withdrawn from public discovery, and access to reader content may be discontinued.",
      "Right of Review: Users whose accounts are placed under administrative review or suspension may contact platform support to provide clarification or request an evaluation of the action.",
    ],
  },
  {
    id: "service-availability",
    number: "10",
    title: "Service Availability & Limitation of Liability",
    icon: Scale,
    summary:
      "We strive for high reliability and smooth reading, but services are provided on an 'as is' and 'as available' basis.",
    details: [
      "Maintenance & Interruption: Scheduled maintenance, hosting updates, or external telecommunication outages may occasionally cause temporary service interruptions.",
      "Disclaimer: To the maximum extent permitted under the laws of Bangladesh, Pustoka disclaims all express or implied warranties concerning uninterrupted platform availability or fitness for a particular purpose.",
      "Limitation of Liability: Pustoka shall not be held liable for indirect, incidental, or consequential damages resulting from the use of or inability to access the platform.",
    ],
  },
  {
    id: "disputes",
    number: "11",
    title: "Contact, Dispute Handling & Governing Principles",
    icon: HelpCircle,
    summary:
      "We believe in resolving questions, billing inquiries, and author concerns amicably and in good faith.",
    details: [
      "Good-Faith Communication: Before initiating formal disputes, you agree to contact Pustoka support with relevant transaction and account details so we can work towards a fair resolution.",
      "Governing Context: These Terms are governed by and construed in accordance with the applicable laws of Bangladesh.",
      "Support Inquiries: For questions regarding these Terms or to report an issue, users may reach out via the official contact links provided on the platform.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card via-background to-muted/10 py-14 sm:py-18">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand mb-4">
            <Scale className="size-3.5" />
            <span>Platform Agreement &amp; Rules</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Terms of Service
          </h1>

          <p className="mt-3 text-xs sm:text-sm font-medium text-muted-foreground">
            Last updated: October 21, 2026 • Effective immediately
          </p>

          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            Welcome to Pustoka. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Pustoka digital ebook platform, including purchasing digital books, participating as a reader or author, and interacting with our reading ecosystem in Bangladesh.
          </p>
        </div>
      </section>

      {/* ── Terms Sections ── */}
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        {TERMS_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <article
              key={sec.id}
              id={`terms-section-${sec.id}`}
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

        {/* ── Related Policies & Assistance ── */}
        <div className="mt-10 rounded-2xl border border-border/80 bg-gradient-to-r from-brand/10 via-card to-brand/5 p-6 sm:p-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Looking for Author Guidelines or Refund Details?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Learn more about our manuscript publishing standards, pricing rules, and refund resolution procedures.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/publishing-policy"
                id="terms-cta-publishing-policy"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand/90"
              >
                <span>Publishing Policy</span>
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/refund"
                id="terms-cta-refund-policy"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
