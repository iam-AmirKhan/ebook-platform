import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Pustoka",
  description:
    "Learn about Pustoka's mission to make reading, learning, and author publishing accessible, trusted, and digital-first in Bangladesh.",
  openGraph: {
    title: "About Us | Pustoka",
    description:
      "A trusted digital home for readers, writers, and ideas in Bangladesh.",
  },
};

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* ── 1. Hero Section ───────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-muted/20 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand">
            Pustoka • পুস্তকা
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl font-[family-name:var(--font-bengali)] leading-tight">
            ডিজিটাল যুগে বাংলা বই ও জ্ঞানচর্চার বিশ্বস্ত ঠিকানা
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed font-[family-name:var(--font-bengali)]">
            পুস্তকা একটি আধুনিক ডিজিটাল রিডিং ও ই-বুক প্ল্যাটফর্ম—যেখানে পাঠকেরা পান সহজে বই পড়ার স্বাচ্ছন্দ্য, আর লেখকেরা পান তাদের সৃষ্টিকর্ম প্রকাশের একটি সম্মানজনক ও নির্ভরযোগ্য মাধ্যম।
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/books"
              className="flex h-11 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              বই ব্রাউজ করুন (Browse Books)
            </Link>
            <Link
              href="/authors"
              className="flex h-11 items-center justify-center rounded-lg border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              লেখক তালিকা (Meet Authors)
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Our Story Section ──────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Our Story
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-[family-name:var(--font-bengali)]">
              কেন একটি নিবেদিত ডিজিটাল প্ল্যাটফর্ম প্রয়োজন?
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-5 text-sm sm:text-base leading-relaxed text-foreground/85 font-[family-name:var(--font-bengali)]">
            <p>
              মুদ্রিত বইয়ের ঐতিহ্য অপরিসীম, কিন্তু ভৌগোলিক দূরত্ব, মুদ্রণ ও সরবরাহের সীমাবদ্ধতা অনেক সময় অসাধারণ সব বই ও চিন্তাকে প্রান্তিক পাঠকদের কাছে পৌঁছাতে বাধা দেয়। তরুণ প্রজন্ম থেকে শুরু করে প্রবাসী বাঙালি—সবার জন্যই যেকোনো সময়ে, যেকোনো ডিভাইসে তাৎক্ষণিকভাবে বই পড়ার অভিজ্ঞতা প্রয়োজন।
            </p>
            <p>
              পুস্তকা গড়ে তোলা হচ্ছে সেই শূন্যস্থান পূরণ করতে। আমরা কোনো সাধারণ বাণিজ্যিক ফাইল শেয়ারিং সেবা নই; বরং বইপ্রেমীদের একটি স্থায়ী ডিজিটাল বাস্তুতন্ত্র (ecosystem) তৈরি করাই আমাদের দীর্ঘমেয়াদী লক্ষ্য। যেখানে বইয়ের স্বত্বাধিকার সুরক্ষিত থাকে, প্রিভিউ পড়ে বই নির্বাচন করা যায় এবং দেশি পেমেন্ট মাধ্যমের সাহায্যে সহজেই সংগ্রহ করা যায়।
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Mission & Vision Cards ─────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Mission */}
            <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-sm transition-all duration-200 hover:border-brand/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand mb-5">
                <MissionIcon />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                আমাদের লক্ষ্য (Our Mission)
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
                জ্ঞানচর্চা ও মানসম্মত বইপাঠে সকলের সহজ প্রবেশাধিকার নিশ্চিত করা। পাঠককে অর্থবহ ও গভীর চিন্তার বইয়ের সন্ধান দেওয়া এবং প্রযুক্তির সহায়তায় বই পড়ার অভ্যাসকে প্রাত্যহিক জীবনের অংশ করে তোলা।
              </p>
            </div>

            {/* Vision */}
            <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-sm transition-all duration-200 hover:border-brand/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand mb-5">
                <VisionIcon />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                আমাদের রূপকল্প (Our Vision)
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
                বাংলা ভাষাভাষী পাঠক ও লেখকদের জন্য একটি বিশ্বস্ত ডিজিটাল ঠিকানা গড়ে তোলা। এমন একটি প্রকাশনা মাধ্যম প্রতিষ্ঠা করা যা মেধা ও সৃজনশীলতার যথাযোগ্য সম্মান দেয় এবং ভবিষ্যৎ প্রজন্মের জন্য জ্ঞানের সঞ্চয়াগার হিসেবে কাজ করে।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. For Readers & For Authors ──────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Platform Experience
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-[family-name:var(--font-bengali)]">
            পাঠক ও লেখকদের জন্য পুস্তকা
          </h2>
          <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            আমরা উভয় পক্ষকেই সমান গুরুত্ব দিয়ে একটি স্বাস্থ্যকর সাংস্কৃতিক পরিবেশ বিনির্মাণ করছি।
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* For Readers */}
          <div className="rounded-2xl border border-border/80 bg-card p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background">
                <ReaderIcon />
              </div>
              <h3 className="text-lg font-bold text-foreground font-[family-name:var(--font-bengali)]">
                পাঠকদের জন্য (For Readers)
              </h3>
            </div>
            <ul className="space-y-3.5 text-sm text-foreground/80 font-[family-name:var(--font-bengali)] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>
                  <strong>সহজ বই অনুসন্ধান:</strong> বিভাগ (Category) এবং লেখক (Author) ভিত্তিক ফিল্টারিংয়ের মাধ্যমে দ্রুত পছন্দের বই আবিষ্কার করুন।
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>
                  <strong>অধ্যায় ভিত্তিক প্রিভিউ:</strong> কেনার আগেই বিনামূল্যে বইয়ের ভূমিকা ও প্রাথমিক অধ্যায় পড়ে দেখার সুযোগ।
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>
                  <strong>স্বচ্ছ সংগ্রহ ও লাইব্রেরি:</strong> নিজস্ব একাউন্টে ডিজিটাল বুকশেলফ এবং যেকোনো সময় নিরবচ্ছিন্ন পঠন অভিজ্ঞতা।
                </span>
              </li>
            </ul>
          </div>

          {/* For Authors */}
          <div className="rounded-2xl border border-border/80 bg-card p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-background">
                <AuthorIcon />
              </div>
              <h3 className="text-lg font-bold text-foreground font-[family-name:var(--font-bengali)]">
                লেখকদের জন্য (For Authors)
              </h3>
            </div>
            <ul className="space-y-3.5 text-sm text-foreground/80 font-[family-name:var(--font-bengali)] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>
                  <strong>পাবলিক লেখক প্রোফাইল:</strong> প্রতিটি লেখকের জন্য নিজস্ব পরিচিতি, জীবনী ও প্রকাশিত বইয়ের ডেডিকেটেড পাতা।
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>
                  <strong>স্বত্বাধিকার ও স্বাধীন মূল্য নির্ধারণ:</strong> নিজের পান্ডুলিপি, অধ্যায় ব্যবস্থাপনা এবং বইয়ের মূল্যের ওপর পূর্ণ নিয়ন্ত্রণ।
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>
                  <strong>ন্যায্য রয়্যালটি ও আর্থিক স্বচ্ছতা:</strong> রিয়েল-টাইম বিক্রয় হিসেব ও সরাসরি রয়্যালটি উত্তোলনের নির্ভরযোগ্য ব্যবস্থা।
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 5. Our Core Values ────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/20 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Core Principles
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-[family-name:var(--font-bengali)]">
              আমাদের মূল মূল্যবোধ (Our Values)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Value 1 */}
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <h4 className="font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                ১. পাঠসংস্কৃতি (Reading Culture)
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
                ক্ষুদ্র মনোযোগের যুগে গভীর ও মনোযোগী বইপড়ার সংস্কৃতিকে সমাজে পুনরুজ্জীবিত করা।
              </p>
            </div>

            {/* Value 2 */}
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <h4 className="font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                ২. জ্ঞান ও মুক্তচিন্তা (Knowledge & Ideas)
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
                নানা বিষয়ের বহুমাত্রিক জ্ঞান, মনস্তত্ত্ব, প্রযুক্তি ও সাহিত্যচিন্তাকে সাদরে গ্রহণ করা।
              </p>
            </div>

            {/* Value 3 */}
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <h4 className="font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                ৩. সহজলভ্যতা (Accessibility)
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
                স্থান বা দূরত্বের কারণে কোনো পাঠক যেন প্রিয় বই পড়া থেকে বঞ্চিত না হন।
              </p>
            </div>

            {/* Value 4 */}
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <h4 className="font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                ৪. লেখকের মর্যাদা (Author Recognition)
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
                লেখকের শ্রম ও সৃষ্টিশীলতার আর্থিক ও সামাজিক নিরাপত্তা নিশ্চিত করা।
              </p>
            </div>

            {/* Value 5 */}
            <div className="rounded-xl border border-border/80 bg-card p-5 sm:col-span-2 lg:col-span-2">
              <h4 className="font-semibold text-foreground font-[family-name:var(--font-bengali)]">
                ৫. আস্থা ও নিরাপত্তা (Trust & Integrity)
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
                নিরাপদ ডিজিটাল ট্রানজাকশন, সংরক্ষিত পাঠক ডেটা এবং স্বচ্ছ প্রকাশনা নীতি বাস্তবায়নে আমরা অঙ্গীকারবদ্ধ।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Call to Action ─────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-card px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-[family-name:var(--font-bengali)]">
            পুস্তকার সাথে আপনার পাঠযাত্রা শুরু করুন
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground font-[family-name:var(--font-bengali)] max-w-xl mx-auto leading-relaxed">
            নতুন বই আবিষ্কার করুন, প্রিয় লেখকের কাজ অনুসরণ করুন অথবা নিজেই একজন লেখক হয়ে আপনার ভাবনা প্রকাশ করুন।
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/books"
              className="flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              বই পড়ুন (Explore Books)
            </Link>
            <Link
              href="/authors"
              className="flex h-11 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              লেখকবৃন্দ (Authors)
            </Link>
            <Link
              href="/become-author"
              className="flex h-11 items-center justify-center rounded-lg border border-border/80 bg-muted/50 px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted font-[family-name:var(--font-bengali)]"
            >
              লেখক হতে আবেদন করুন
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function MissionIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 6 15 12 9 12 12 6" />
      <line x1="12" y1="12" x2="12" y2="18" />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ReaderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function AuthorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-brand mt-0.5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
