/**
 * scripts/seed-demo-book.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Development-only seed script for Pustoka's Bengali demo book.
 *
 * IDEMPOTENT — safe to rerun as many times as needed.
 * Every record is UPSERTED, so reruns update existing documents instead of
 * creating duplicates. This means content changes in this file are reflected
 * in the database on the next run.
 *
 * HOW TO RUN (development only):
 *   npx tsx scripts/seed-demo-book.ts
 *
 * REQUIREMENTS:
 *   - MONGODB_URI must be set in .env.local (project root)
 *   - tsx is available via npx (no install needed)
 *
 * WHAT IT CREATES / UPDATES:
 *   1. Category    — আত্ম-উন্নয়ন ও মনস্তত্ত্ব
 *   2. User        — demo-author@pustoka.dev  (AUTHOR role)
 *   3. Author      — আরিফ মাহমুদ
 *   4. Book        — নিজেকে বোঝার সহজ পাঠ
 *                    Language: বাংলা · 3 chapters (2 preview, 1 locked)
 *
 * NOTE: This is a FICTIONAL demo book for development and testing.
 *       It is NOT a published real book. All content is illustrative.
 *
 * NEVER RUN AGAINST PRODUCTION.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Load .env.local using the same mechanism Next.js uses at runtime.
// Must be called before any process.env access.
import { loadEnvConfig } from "@next/env";
import path from "path";
loadEnvConfig(path.resolve(__dirname, ".."));

import mongoose from "mongoose";
import Category from "../src/models/Category";
import User from "../src/models/User";
import Author from "../src/models/Author";
import Book from "../src/models/Book";
import { hashPassword } from "../src/lib/auth/password";

// ---------------------------------------------------------------------------
// Guard: refuse to run against production
// ---------------------------------------------------------------------------
const uri = process.env.MONGODB_URI ?? "";
if (!uri) {
  console.error("MONGODB_URI is not set. Aborting.");
  process.exit(1);
}

const BLOCKED_PATTERNS = ["cluster0.mongodb.net", "production", "prod"];
for (const pattern of BLOCKED_PATTERNS) {
  if (uri.toLowerCase().includes(pattern.toLowerCase())) {
    console.error(
      'MONGODB_URI looks like a production URI (matched "' +
        pattern +
        '"). Aborting. Use your dev cluster.'
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Stable slug/email identifiers — never change these between reruns
// ---------------------------------------------------------------------------
const DEMO_CATEGORY_SLUG = "atmo-unnayan-o-monostottwo";
const DEMO_AUTHOR_EMAIL = "demo-author@pustoka.dev";
const DEMO_AUTHOR_SLUG = "arif-mahmud";
const DEMO_BOOK_SLUG = "nijeke-bojhar-shohoj-path";

// ---------------------------------------------------------------------------
// Bengali chapter content
// All content is original fictional prose for demonstration purposes only.
// ---------------------------------------------------------------------------

// অধ্যায় ১ — বিনামূল্যে পড়া যাবে
const CHAPTER_1_CONTENT = [
  "নিজেকে চেনা — শুনতে সহজ মনে হয়, কিন্তু করতে বসলে অনেকেই থমকে যান।",
  "",
  "আমরা প্রতিদিন অসংখ্য সিদ্ধান্ত নিই। কখন ঘুমাব, কী খাব, কার সাথে কথা বলব, কোন কাজটা আজ করব আর কোনটা পরে রাখব — এই ছোট ছোট পছন্দগুলো মিলিয়েই আমাদের দিন তৈরি হয়। কিন্তু আমরা কি কখনো থেমে ভাবি — এই পছন্দগুলো আমি আসলে কেন করছি?",
  "",
  "বেশিরভাগ মানুষ নিজের সম্পর্কে ভাবে বাইরের দৃষ্টিতে। 'মানুষ আমাকে কী মনে করছে?' 'আমি কি যথেষ্ট ভালো দেখাচ্ছি?' 'আমার সিদ্ধান্ত কি অন্যরা মেনে নেবে?' — এই প্রশ্নগুলো আমাদের নিজের সত্যিকারের পরিচয় থেকে ক্রমশ দূরে সরিয়ে দেয়।",
  "",
  "নিজেকে চেনার প্রথম ধাপ হলো এই বাইরের মানদণ্ড থেকে একটু সরে এসে ভেতরে তাকানো। সেই তাকানো আয়নার সামনে দাঁড়ানোর মতো নয় — এটা অনেকটা নিজের সাথে একটি শান্ত, সৎ কথোপকথনের মতো।",
  "",
  "একটা ছোট অনুশীলন করে দেখুন:",
  "",
  "আজকে যে কাজটা করতে সবচেয়ে বেশি মন চেয়েছিল, সেটা কি আপনি করেছেন? যদি না করে থাকেন, তাহলে কেন করেননি — ভয়ের কারণে, অলসতার কারণে, নাকি 'লোকে কী বলবে' এই ভাবনায়?",
  "",
  "এই প্রশ্নের সৎ উত্তর খোঁজাটাই নিজেকে চেনার শুরু।",
  "",
  "নিজের সম্পর্কে সচেতনতা একদিনে আসে না। এটা একটি অভ্যাস — দিনের পর দিন চর্চায় গড়ে ওঠে। কিন্তু শুরু করতে হয় এখনই, এই মুহূর্তে, এই একটি ছোট প্রশ্নের মধ্য দিয়ে।",
  "",
  "নিজের সাথে সৎ থাকার সাহস থাকলে, বাকি পথটা অনেক সহজ হয়ে যায়।",
  "",
  "এই বইয়ের প্রতিটি অধ্যায় সেই যাত্রারই একটি পদক্ষেপ।",
].join("\n");

// অধ্যায় ২ — বিনামূল্যে পড়া যাবে
const CHAPTER_2_CONTENT = [
  "আমরা যা করি তার বেশিরভাগই আসলে সচেতন সিদ্ধান্তের ফল নয় — অভ্যাসের ফল।",
  "",
  "সকালে উঠে প্রথমেই ফোন হাতে নেওয়া, খাওয়ার পর চায়ের কাপ খোঁজা, কাজের চাপ বাড়লে মিষ্টি কিছু খেতে ইচ্ছে করা — এগুলো আমরা ঠিক করে করি না, এগুলো হয়ে যায়। কারণ এগুলো আমাদের মস্তিষ্কে গেঁথে যাওয়া ছাঁচ।",
  "",
  "অভ্যাস গড়ে ওঠে পুনরাবৃত্তির মাধ্যমে। কোনো একটি কাজ বারবার করলে মস্তিষ্ক সেটিকে 'স্বয়ংক্রিয়' করে নেয় — যাতে প্রতিবার নতুন করে ভাবতে না হয়। এটা মস্তিষ্কের একটি বিশেষ দক্ষতা, শক্তি বাঁচানোর কৌশল।",
  "",
  "সমস্যা হয় যখন ক্ষতিকর কাজগুলোও এই একই প্রক্রিয়ায় স্থায়ী হয়ে বসে।",
  "",
  "অভ্যাসের চক্র",
  "",
  "মনোবিজ্ঞানীরা বলেন, প্রতিটি অভ্যাসের পেছনে একটি তিন-ধাপের চক্র কাজ করে: ইঙ্গিত, আচরণ, পুরস্কার।",
  "",
  "একটু ভেবে দেখুন: বিরক্ত লাগলেই (ইঙ্গিত) ফোন তুলে নিই (আচরণ), আর কিছুটা মনোযোগ সরে যায়, সাময়িক স্বস্তি পাই (পুরস্কার)। সময়ের সাথে এই চক্র এতটাই শক্ত হয়ে যায় যে ইঙ্গিতটা পেলেই হাত স্বয়ংক্রিয়ভাবে ফোনের দিকে চলে যায় — মাথা জিজ্ঞেস না করেই।",
  "",
  "নিজের অভ্যাস বুঝতে চাইলে প্রথমে এই চক্রটি চেনা দরকার। কোন পরিস্থিতিতে আমি এই কাজটা করি? কোন অনুভূতি থেকে বাঁচতে করি? কী পাওয়ার আশায় করি?",
  "",
  "এই প্রশ্নগুলোর উত্তর খুঁজলে বোঝা যাবে — আমাদের অনেক 'সিদ্ধান্ত' আসলে সিদ্ধান্ত নয়, পুরনো অভ্যাসের ছায়ামাত্র।",
  "",
  "একটু সচেতন হলেই দেখা যায়, কোথায় আমরা নিজেই নিজেকে আটকে রেখেছি।",
].join("\n");

// অধ্যায় ৩ — লক করা (শুধু ক্রেতারা পড়তে পারবেন)
const CHAPTER_3_CONTENT = [
  "তৃতীয় অধ্যায়: নিজের সিদ্ধান্ত, নিজের জীবন",
  "",
  "এই অধ্যায়ে আলোচনা করা হয়েছে সচেতন সিদ্ধান্ত নেওয়ার অনুশীলন নিয়ে।",
  "কীভাবে অন্যের প্রত্যাশা ও সামাজিক চাপ থেকে মুক্ত হয়ে নিজের জীবন",
  "নিজেই পরিচালনা করা যায় — সেই পথটি একসাথে খোঁজার চেষ্টা।",
  "",
  "[এটি একটি কাল্পনিক ডেমো বই। পুরো অধ্যায়টি পড়তে বইটি কিনতে হবে।]",
].join("\n");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri, { bufferCommands: false });
  console.log("Connected.\n");

  // ── 1. Category — upsert by slug ─────────────────────────────────────────
  await Category.findOneAndUpdate(
    { slug: DEMO_CATEGORY_SLUG },
    {
      $set: {
        name: "আত্ম-উন্নয়ন ও মনস্তত্ত্ব",
        slug: DEMO_CATEGORY_SLUG,
        description: "ব্যক্তিগত উন্নয়ন, মনোবিজ্ঞান ও সচেতন জীবনযাপন বিষয়ক বই।",
        status: "ACTIVE",
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  const category = await Category.findOne({ slug: DEMO_CATEGORY_SLUG }).lean();
  if (!category) throw new Error("Category upsert failed");
  console.log("Category ready: আত্ম-উন্নয়ন ও মনস্তত্ত্ব");

  // ── 2. User — upsert by email ─────────────────────────────────────────────
  // passwordHash is only set on creation; findOneAndUpdate with $setOnInsert
  // avoids overwriting an existing hash on subsequent runs.
  const passwordHash = await hashPassword("DemoAuthor@2026!");
  await User.findOneAndUpdate(
    { email: DEMO_AUTHOR_EMAIL },
    {
      $set: {
        name: "আরিফ মাহমুদ",
        role: "AUTHOR",
        status: "ACTIVE",
      },
      $setOnInsert: {
        email: DEMO_AUTHOR_EMAIL,
        passwordHash,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  const user = await User.findOne({ email: DEMO_AUTHOR_EMAIL }).lean();
  if (!user) throw new Error("User upsert failed");
  console.log("User ready: " + DEMO_AUTHOR_EMAIL);

  // ── 3. Author profile — upsert by user id ────────────────────────────────
  await Author.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        penName: "আরিফ মাহমুদ",
        slug: DEMO_AUTHOR_SLUG,
        bio: "লেখক ও মনোবিজ্ঞান বিষয়ক গবেষক। ব্যক্তিগত উন্নয়ন এবং আত্ম-সচেতনতা নিয়ে লেখালেখি করেন।",
        status: "ACTIVE",
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  const author = await Author.findOne({ user: user._id }).lean();
  if (!author) throw new Error("Author upsert failed");
  console.log("Author ready: আরিফ মাহমুদ");

  // ── 4. Book — upsert by slug ──────────────────────────────────────────────
  // Every field is set on both create and update so reruns pick up content edits.
  const bookData = {
    title: "নিজেকে বোঝার সহজ পাঠ",
    slug: DEMO_BOOK_SLUG,
    description:
      "নিজেকে বোঝা মানে শুধু নিজের পছন্দ-অপছন্দ জানা নয়। এর মানে হলো নিজের চিন্তার ধরন, আবেগের উৎস এবং অভ্যাসের শিকড় বোঝা — যাতে সচেতনভাবে, অন্যের প্রত্যাশার চাপমুক্ত হয়ে নিজের জীবন পরিচালনা করা যায়।\n\n" +
      "এই বইটি কোনো জটিল তাত্ত্বিক বই নয়। এটি একটি ব্যবহারিক পাঠ — যেখানে ছোট ছোট প্রশ্ন, সহজ অনুশীলন এবং বাস্তব উদাহরণের মাধ্যমে নিজেকে আরও ভালোভাবে জানার চেষ্টা করা হয়েছে। বইটি পড়তে মনোবিজ্ঞানের পূর্বজ্ঞান লাগবে না — শুধু নিজের সম্পর্কে একটু কৌতূহল থাকলেই যথেষ্ট।\n\n" +
      "প্রতিটি অধ্যায়ের শেষে একটি ছোট অনুশীলন আছে। সেগুলো করলে পাঠকের নিজের সম্পর্কে নতুন কিছু জানার সুযোগ হবে।\n\n" +
      "পাঠক যদি এই বই পড়ে একটিও নতুন প্রশ্ন নিজেকে করতে পারেন, তাহলে এই বইয়ের উদ্দেশ্য পূরণ হবে।\n\n" +
      "বিশেষ দ্রষ্টব্য: এটি একটি কাল্পনিক ডেমো বই, পুস্তকা প্ল্যাটফর্মের পরীক্ষামূলক ব্যবহারের জন্য তৈরি।",
    summary:
      "নিজের চিন্তা, অভ্যাস, ভয় ও সিদ্ধান্তকে বুঝে আরও সচেতনভাবে জীবন পরিচালনা করার একটি সহজ ও ব্যবহারিক পাঠ।",
    language: "বাংলা",
    coverImage: null,
    author: author._id,
    category: category._id,
    price: 299,
    discountPrice: 199,
    currency: "BDT",
    status: "PUBLISHED",
    learningOutcomes: [
      "নিজের চিন্তা ও আচরণের ধরন চিনতে পারা",
      "অভ্যাস কীভাবে সিদ্ধান্তকে প্রভাবিত করে তা বোঝা",
      "একাকিত্ব ও আত্ম-উপলব্ধি নিয়ে গভীরভাবে ভাবতে পারা",
      "সচেতনভাবে সিদ্ধান্ত নেওয়ার অভ্যাস গড়ে তোলা",
    ],
    chapters: [
      {
        order: 1,
        title: "নিজেকে চেনার প্রথম ধাপ",
        isPreview: true,
        teaser:
          "নিজেকে চেনা শুরু হয় একটি সৎ প্রশ্ন দিয়ে — আমি আসলে কী চাই, আর কী চাই বলে মনে করি?",
        content: CHAPTER_1_CONTENT,
      },
      {
        order: 2,
        title: "অভ্যাসের অদৃশ্য প্রভাব",
        isPreview: true,
        teaser:
          "আমাদের অনেক 'সিদ্ধান্ত' আসলে সিদ্ধান্ত নয় — বছরের পর বছর ধরে গড়ে ওঠা অভ্যাসের ছায়া।",
        content: CHAPTER_2_CONTENT,
      },
      {
        order: 3,
        title: "নিজের সিদ্ধান্ত, নিজের জীবন",
        isPreview: false,
        teaser:
          "সামাজিক চাপ ও অন্যের প্রত্যাশার বাইরে গিয়ে নিজের জীবনকে সচেতনভাবে বেছে নেওয়ার অনুশীলন।",
        content: CHAPTER_3_CONTENT,
      },
    ],
  };

  const book = await Book.findOneAndUpdate(
    { slug: DEMO_BOOK_SLUG },
    { $set: bookData },
    { upsert: true, returnDocument: "after" }
  );

  if (!book) throw new Error("Book upsert failed");
  console.log("Book ready: " + book.title);
  console.log("  Visit /books/" + DEMO_BOOK_SLUG);

  console.log("\nSeed complete.");
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
