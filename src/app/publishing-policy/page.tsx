import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  Coins,
  Clock,
  ShieldAlert,
  Copyright,
  CheckCircle2,
  FileCheck,
  ArrowRight,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pustoka-তে বই প্রকাশের নিয়মাবলি | Pustoka",
  description:
    "Pustoka প্ল্যাটফর্মে বই প্রকাশের নিয়মাবলি, মৌলিকতা, মূল্যসীমা ও নির্দেশিকা। মানব-রচিত পাণ্ডুলিপি, ন্যূনতম ৫টি অধ্যায় ও ৳১০০-৳৩০০ মূল্যসীমা সংক্রান্ত নীতিমালা।",
};

interface PolicyRule {
  id: string;
  number: string;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  highlights?: string[];
  note?: string;
}

const POLICY_RULES: PolicyRule[] = [
  {
    id: "original-ai",
    number: "০১",
    title: "মৌলিক রচনা ও কৃত্রিম বুদ্ধিমত্তার (AI) দায়িত্বশীল ব্যবহার",
    tagline: "বই অবশ্যই লেখকের নিজস্ব, মৌলিক ও মানব-রচিত সৃষ্টি হতে হবে",
    icon: Sparkles,
    description:
      "পুস্তোকা-তে প্রকাশিত প্রতিটি বই অবশ্যই লেখকের নিজস্ব চিন্তাপ্রসূত, মানব-রচিত মৌলিক সাহিত্যকর্ম হতে হবে। সম্পূর্ণ AI দ্বারা জেনারেট করা টেক্সট কপি করা কিংবা AI-জেনারেটেড কোনো পাণ্ডুলিপি নিজের রচনা হিসেবে দাবি করে জমা দেওয়া সম্পূর্ণরূপে নিষিদ্ধ।",
    highlights: [
      "অনুমোদিত: গবেষণায় সহায়তা, তথ্য অনুসন্ধান, আইডিয়া ব্রেইনস্টর্মিং, ব্যাকরণ ও বানান যাচাই এবং বিষয়ভিত্তিক রূপরেখা তৈরিতে AI-এর দায়িত্বশীল ব্যবহার।",
      "নিষিদ্ধ: AI দিয়ে পুরো বই বা অধ্যায় লিখে নেওয়া, স্বয়ংক্রিয় টেক্সট কপি-পেস্ট করা এবং অন্যের বা মেশিনের বুদ্ধিবৃত্তিক কাজ নিজের নামে প্রচার করা।",
      "চূড়ান্ত পাণ্ডুলিপির প্রতিটি শব্দ, বাক্যগঠন, পরিমার্জন এবং সাহিত্যিক নৈতিকতার সম্পূর্ণ দায়ভার লেখককেই বহন করতে হবে।",
    ],
  },
  {
    id: "minimum-chapters",
    number: "০২",
    title: "ন্যূনতম ৫টি অর্থপূর্ণ অধ্যায়ের বাধ্যবাধকতা",
    tagline: "প্রকাশের আগে কমপক্ষে ৫টি পূর্ণাঙ্গ ও অর্থপূর্ণ অধ্যায় আবশ্যক",
    icon: BookOpen,
    description:
      "একটি বইকে পূর্ণাঙ্গ ও পাঠযোগ্য সাহিত্যকর্ম হিসেবে বিবেচনা করতে প্রকাশের পূর্বে তাতে অবশ্যই ন্যূনতম ৫টি সারগর্ভ ও অর্থপূর্ণ অধ্যায় সম্পন্ন থাকতে হবে।",
    highlights: [
      "ন্যূনতম অধ্যায় সংখ্যা: কমপক্ষে ৫টি পূর্ণাঙ্গ অধ্যায় (প্রতিটিতে সুস্পষ্ট বিষয়বস্তু ও বিবরণ থাকতে হবে)।",
      "খালি অধ্যায়, স্থানপূরণকারী টেক্সট (Placeholder), অপ্রাসঙ্গিক বিচ্ছিন্ন ২-১ লাইনের বাক্য কিংবা অর্থহীন কৃত্রিম অধ্যায় বিভাজন এই ন্যূনতম গণনায় গ্রহণযোগ্য নয়।",
      "সিস্টেমের ব্যাকএন্ড স্বয়ংক্রিয়ভাবে অধ্যায়ের সংখ্যা ও বিষয়বস্তুর পূর্ণাঙ্গতা যাচাই করে প্রকাশনা প্রক্রিয়ায় অনুমতি প্রদান করে।",
    ],
  },
  {
    id: "book-pricing",
    number: "০৩",
    title: "বইয়ের অনুমোদিত মূল্যসীমা (৳১০০ – ৳৩০০)",
    tagline: "বইয়ের মূল্য সর্বনিম্ন ৳১০০ এবং সর্বোচ্চ ৳৩০০ (অন্তর্ভুক্ত)",
    icon: Coins,
    description:
      "পুস্তোকা প্ল্যাটফর্মে পাঠক ও লেখকের মাঝে ভারসাম্য বজায় রাখতে একটি সুলভ, নির্ভরযোগ্য ও ন্যায্য মূল্যসীমা নির্ধারণ করা হয়েছে।",
    highlights: [
      "সর্বনিম্ন অনুমোদিত মূল্য: ৳১০০ (একশত টাকা)।",
      "সর্বোচ্চ অনুমোদিত মূল্য: ৳৩০০ (তিনশত টাকা)।",
      "লেখককে এই নির্ধারিত সীমার (৳১০০ থেকে ৳৩০০) ভেতরেই বইয়ের নিয়মিত মূল্য নির্ধারণ করতে হবে।",
      "প্ল্যাটফর্মের ব্যাকএন্ড ভ্যালিডেশন প্রতিটি নতুন বইয়ের ক্ষেত্রে এই নির্ধারিত সীমা কঠোরভাবে কার্যকর করে।",
    ],
  },
  {
    id: "publication-review",
    number: "০৪",
    title: "প্রকাশনা পর্যালোচনা ও যাচাই প্রক্রিয়া",
    tagline: "জমা দেওয়ার পর আনুমানিক ১–২ কার্যদিবসের মধ্যে সম্পাদনা দল পর্যালোচনা করে",
    icon: Clock,
    description:
      "পুস্তোকা-তে একটি বই জমা দেওয়ার সাথে সাথেই তা স্বয়ংক্রিয়ভাবে সরাসরি প্রকাশিত হয় না। প্ল্যাটফর্মের গুণমান এবং নীতিমালা রক্ষা করতে প্রতিটি বই সম্পাদনা প্যানেলের নিরীক্ষার মধ্য দিয়ে যায়।",
    highlights: [
      "পর্যালোচনা সময়কাল: বই জমা দেওয়ার পর যাচাই-বাছাই ও গুণগত মূল্যায়নের জন্য আনুমানিক ১–২ কার্যদিবস সময় প্রয়োজন হতে পারে।",
      "এটি একটি আনুমানিক নিরীক্ষা সময়সীমা, কোনো অপরিবর্তনীয় ডেডলাইন নয়।",
      "যথাযথ পর্যবেক্ষণ ও অনুমোদন সম্পন্ন হওয়ার পরেই বইটি প্ল্যাটফর্মে সর্বসাধারণের পাঠের জন্য উন্মুক্ত হয়।",
    ],
  },
  {
    id: "harmful-content",
    number: "০৫",
    title: "সহিংসতা, ক্ষতিকর ও বেআইনি বিষয়বস্তু নিষিদ্ধকরণ",
    tagline: "বাস্তব ক্ষতিকর কর্মকাণ্ডের প্ররোচনা নিষিদ্ধ; সাহিত্যিক ও ঐতিহাসিক দ্বন্দ্ব গ্রহণযোগ্য",
    icon: ShieldAlert,
    description:
      "বাস্তব জীবনে সহিংসতাকে উৎসাহিত করে, শারীরিক বা মানসিক ক্ষতির প্ররোচনা দেয়, কোনো অপরাধমূলক কর্মকাণ্ডের সুনির্দিষ্ট কার্যপ্রণালী শেখায় কিংবা দেশের প্রচলিত আইনে অবৈধ—এমন কোনো কন্টেন্ট প্রকাশ করা যাবে না।",
    highlights: [
      "নিষিদ্ধ: বাস্তব সহিংসতার প্রচার, চরমপন্থা, আত্মঘাতী প্ররোচনা, সাইবার অপরাধ ও জালিয়াতির নির্দেশিকা এবং বেআইনি সামগ্রী।",
      "অনুমোদিত: সাহিত্যিক কথাসাহিত্যের সংঘাত (Fictional conflict), ঐতিহাসিক যুদ্ধের ঘটনাপ্রবাহ, শিক্ষামূলক বিশ্লেষণ, সামাজিক সমস্যা নিয়ে গঠনমূলক আলোচনা এবং সমালোচনামূলক সাহিত্য।",
    ],
  },
  {
    id: "plagiarism-copyright",
    number: "০৬",
    title: "চৌর্যবৃত্তি ও মেধাভিত্তিক কপিরাইট সুরক্ষা",
    tagline: "লেখকের নিজস্ব স্বত্বাধিকার অথবা বৈধ প্রকাশের অনুমতি থাকা বাধ্যতামূলক",
    icon: Copyright,
    description:
      "পুস্তোকা প্ল্যাটফর্মে কপিরাইট ও লেখকস্বত্বের সুরক্ষা সর্বাগ্রে অগ্রাধিকার পায়। অন্যের মেধা বা সৃষ্টিকর্মের প্রতি সম্মান প্রদর্শন প্রত্যেক লেখকের মৌলিক দায়িত্ব।",
    highlights: [
      "লেখককে অবশ্যই তার জমা দেওয়া রচনার কপিরাইট মালিক হতে হবে অথবা এটি প্রকাশের বৈধ আইনগত লাইসেন্স বা অনুমতি থাকতে হবে।",
      "চৌর্যবৃত্তি (Plagiarism), অনুমতিবিহীন অনুবাদ বা পুনর্মুদ্রণ, ছদ্মনামে অন্যের কাজ চুরি কিংবা লেখক সেজে জালিয়াতি সম্পূর্ণ নিষিদ্ধ।",
      "কপিরাইট লঙ্ঘনের অভিযোগ প্রমাণিত হলে বইটি অবিলম্বে প্ল্যাটফর্ম থেকে অপসারণ করা হবে এবং সংশ্লিষ্ট অ্যাকাউন্ট স্থগিত করা হতে পারে।",
    ],
  },
  {
    id: "accuracy-responsibility",
    number: "০৭",
    title: "তথ্যের নির্ভুলতা ও লেখকের সামগ্রিক দায়বদ্ধতা",
    tagline: "ঐতিহাসিক ও বাস্তব তথ্যের যথার্থতা নিশ্চিত করার পূর্ণ দায় লেখকের",
    icon: CheckCircle2,
    description:
      "অ-কাল্পনিক (Non-fiction), তথ্যবহুল কিংবা ঐতিহাসিক বিষয়ে লেখার ক্ষেত্রে তথ্যের নির্ভুলতা নিশ্চিত করা লেখকের প্রধান কর্তব্য।",
    highlights: [
      "বইয়ে ব্যবহৃত পরিসংখ্যান, ঐতিহাসিক ঘটনা, উদ্ধৃতি ও তথ্যের সূত্র লেখককে নিজ দায়িত্বে যাচাই করতে হবে।",
      "AI বা তৃতীয় পক্ষের সূত্র থেকে সংগৃহীত যেকোনো তথ্যকে বিশ্বাসযোগ্য প্রাথমিক সূত্র থেকে নিশ্চিত করা লেখকের আবশ্যিক দায়িত্ব।",
      "তথ্যে ইচ্ছাকৃত বিভ্রম বা গুরুতর বিভ্রান্তি পাওয়া গেলে পুস্তোকা পাণ্ডুলিপি সংশোধন চাইতে পারে বা প্রকাশ বাতিল করতে পারে।",
    ],
  },
  {
    id: "review-moderation",
    number: "০৮",
    title: "পর্যালোচনা, পরিমার্জন ও প্ল্যাটফর্মের মডারেশন অধিকার",
    tagline: "পাণ্ডুলিপি জমা দেওয়া মানেই অবধারিত প্রকাশ নয়; নীতি ভঙ্গে সংশোধন বা বাতিলের অধিকার সংরক্ষিত",
    icon: FileCheck,
    description:
      "পুস্তোকা প্ল্যাটফর্ম তার পাঠকদের জন্য একটি নিরাপদ, বিশ্বস্ত ও উচ্চমানের সাহিত্যিক পরিবেশ বজায় রাখতে প্রয়োজনীয় প্রশাসনিক পদক্ষেপ গ্রহণের অধিকার সংরক্ষণ করে।",
    highlights: [
      "নীতিমালা বা মানদণ্ডে ঘাটতি থাকলে পুস্তোকা লেখককে পাণ্ডুলিপি পরিমার্জন বা সংশোধন করার অনুরোধ করতে পারে।",
      "নীতিমালা পরিপন্থী কোনো রচনা প্রকাশে অস্বীকৃতি জানানো বা পূর্বে প্রকাশিত বই প্ল্যাটফর্ম থেকে অপসারণের এখতিয়ার পুস্তোকা-র রয়েছে।",
      "পাণ্ডুলিপি জমা দেওয়া প্রকাশনার কোনো নিশ্চয়তা বহন করে না; নীতিমালা সন্তোষজনকভাবে পূরণ করলেই কেবল বই অনুমোদন লাভ করে।",
    ],
  },
];

export default function PublishingPolicyPage() {
  return (
    <div className="flex flex-1 flex-col bg-muted/5 min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card via-background to-muted/10 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand font-[family-name:var(--font-bengali)] mb-4">
            <Sparkles className="size-3.5" />
            <span>প্রকাশনা নীতিমালা ও নির্দেশিকা</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl font-[family-name:var(--font-bengali)]">
            Pustoka-তে বই প্রকাশের নিয়মাবলি
          </h1>

          <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
            পুস্তোকা (Pustoka) লেখক ও পাঠকদের মাঝে একটি নির্ভরযোগ্য, সমৃদ্ধ ও মানসম্মত ডিজিটাল সাহিত্যিক ইকোসিস্টেম গড়ে তুলতে প্রতিশ্রুতিবদ্ধ। আমাদের প্ল্যাটফর্মে বই প্রকাশের ক্ষেত্রে সততা, সাহিত্যিক মান এবং মেধাভিত্তিক মৌলিকতা বজায় রাখা অপরিহার্য। আপনি যদি আপনার বই প্রকাশের কথা ভাবছেন, তবে প্রকাশের আগে অনুগ্রহ করে নিচের নিয়মাবলি ও নির্দেশিকাগুলো মনোযোগ দিয়ে পড়ুন।
          </p>

          {/* Quick Stats Grid */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">অধ্যায় সংখ্যা</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
                কমপক্ষে ৫টি
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">পূর্ণাঙ্গ অধ্যায়</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">অনুমোদিত মূল্য</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-brand font-[family-name:var(--font-bengali)]">
                ৳১০০ – ৳৩০০
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">সুলভ মূল্যসীমা</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">পর্যালোচনা সময়</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
                ১–২ দিন
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">আনুমানিক নিরীক্ষা</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">রচনার ধরন</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
                ১০০% মৌলিক
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground font-[family-name:var(--font-bengali)]">মানব-রচিত</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Author Application Requirement Banner ── */}
      <section className="mx-auto -mt-6 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-brand/30 bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brand">
                <UserCheck className="size-5 shrink-0" />
                <span className="text-xs font-bold tracking-wide uppercase font-[family-name:var(--font-bengali)]">
                  বই জমা দেওয়ার পূর্বশর্ত
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
                বই লেখার বা জমা দেওয়ার পূর্বে লেখক হিসেবে অনুমোদিত হোন
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)] max-w-2xl">
                পুস্তোকা-তে নতুন বই তৈরি ও জমা দেওয়ার সুবিধাটি অনুমোদিত লেখকদের জন্য উন্মুক্ত। আপনি যদি লেখক হতে চান, তবে প্রথমে আমাদের সহজ লেখক আবেদন ফর্মটি পূরণ করুন। আবেদন অনুমোদিত হলেই আপনি সরাসরি বই তৈরি করতে পারবেন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/become-author"
                id="policy-cta-become-author"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-xs transition-all hover:bg-brand/90 hover:shadow-sm font-[family-name:var(--font-bengali)]"
              >
                <span>লেখক হোন</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/books"
                id="policy-cta-explore-books"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted font-[family-name:var(--font-bengali)]"
              >
                বই দেখুন
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── The 8 Rules Section ── */}
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
            ৮টি মূল প্রকাশনা বিধিমালা
          </h2>
          <p className="mt-2 text-sm text-muted-foreground font-[family-name:var(--font-bengali)]">
            প্রতিটি লেখককে বই জমা দেওয়ার পূর্বে এই শর্তাবলি কঠোরভাবে অনুসরণ করতে হবে।
          </p>
        </div>

        <div className="space-y-6">
          {POLICY_RULES.map((rule) => {
            const Icon = rule.icon;
            return (
              <article
                key={rule.id}
                id={`rule-${rule.id}`}
                className="group rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                  {/* Badge & Icon */}
                  <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand font-bold text-base font-[family-name:var(--font-bengali)]">
                      {rule.number}
                    </span>
                    <span className="hidden sm:flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:text-brand transition-colors">
                      <Icon className="size-4.5" />
                    </span>
                  </div>

                  {/* Rule Content */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden text-brand">
                          <Icon className="size-4" />
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-foreground font-[family-name:var(--font-bengali)] group-hover:text-brand transition-colors">
                          {rule.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm font-medium text-brand/90 font-[family-name:var(--font-bengali)]">
                        {rule.tagline}
                      </p>
                    </div>

                    <p className="text-sm sm:text-base leading-relaxed text-muted-foreground font-[family-name:var(--font-bengali)]">
                      {rule.description}
                    </p>

                    {rule.highlights && rule.highlights.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-border/50 pt-3">
                        {rule.highlights.map((highlight, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs sm:text-sm text-foreground/80 font-[family-name:var(--font-bengali)] leading-relaxed"
                          >
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ── Bottom Callout & FAQ Guidance ── */}
        <div className="mt-12 rounded-2xl border border-border/80 bg-gradient-to-r from-brand/10 via-card to-brand/5 p-8 text-center sm:p-12">
          <h3 className="text-2xl font-bold text-foreground font-[family-name:var(--font-bengali)]">
            আপনি কি পুস্তোকা-তে আপনার বই প্রকাশ করতে প্রস্তুত?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-muted-foreground font-[family-name:var(--font-bengali)] leading-relaxed">
            আজই পুস্তোকা পরিবারের সাথে যুক্ত হোন। আপনার সাহিত্যকর্ম ও ভাবনা পৌঁছে দিন বাংলাদেশের আনাচে-কানাচে ছড়িয়ে থাকা বইপ্রেমীদের কাছে।
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/become-author"
              id="policy-bottom-cta-become-author"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-xs transition-all hover:bg-brand/90 hover:shadow-sm font-[family-name:var(--font-bengali)]"
            >
              <span>লেখক হোন</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/books"
              id="policy-bottom-cta-explore-books"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted font-[family-name:var(--font-bengali)]"
            >
              বই দেখুন
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
