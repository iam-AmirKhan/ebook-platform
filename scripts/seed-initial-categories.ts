/**
 * scripts/seed-initial-categories.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Idempotent seed script to initialize common Bangladeshi & Bengali book categories
 * for Pustoka.
 *
 * HOW TO RUN:
 *   npx tsx scripts/seed-initial-categories.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

import CategoryRaw from "../src/models/Category";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Category: any = (CategoryRaw && typeof CategoryRaw === "object" && "default" in CategoryRaw)
  ? (CategoryRaw as Record<string, unknown>).default
  : CategoryRaw;

// Guard against production execution
const uri = process.env.MONGODB_URI ?? "";
if (!uri) {
  console.error("MONGODB_URI is not set. Aborting.");
  process.exit(1);
}

const BLOCKED_PATTERNS = ["cluster0.mongodb.net", "production", "prod"];
for (const pattern of BLOCKED_PATTERNS) {
  if (uri.toLowerCase().includes(pattern.toLowerCase())) {
    console.error(`Refusing to run seed against production URI (matched "${pattern}"). Aborting.`);
    process.exit(1);
  }
}

export interface InitialCategorySeed {
  name: string;
  slug: string;
  description: string;
  aliases?: string[];
}

export const INITIAL_CATEGORIES: InitialCategorySeed[] = [
  {
    name: "সাহিত্য ও উপন্যাস",
    slug: "sahitya-o-uponyas",
    description: "কালজয়ী সাহিত্য, ধ্রুপদী ও সমকালীন উপন্যাস এবং কথাসাহিত্য।",
    aliases: ["সাহিত্য", "উপন্যাস"],
  },
  {
    name: "গল্প ও ছোটগল্প",
    slug: "golpo-o-chotogolpo",
    description: "ছোটগল্প সংকলন, লোকগাথা, রূপকথা ও জীবনের বিচিত্র গল্পের সমাহার।",
    aliases: ["গল্প", "ছোটগল্প"],
  },
  {
    name: "কবিতা",
    slug: "kobita",
    description: "আধুনিক, ধ্রুপদী ও সমকালীন কবিতার সংকলন ও কাব্যগ্রন্থ।",
  },
  {
    name: "দর্শন",
    slug: "dorshon",
    description: "প্রাচ্য ও পাশ্চাত্য দর্শন, নীতিশাস্ত্র এবং জীবনদর্শনের মৌলিক পাঠ।",
  },
  {
    name: "মনোবিজ্ঞান ও মনস্তত্ত্ব",
    slug: "monobiggan-o-monostottwo",
    description: "মানবমন, আচরণ, মানসিক স্বাস্থ্য ও মনোবিজ্ঞানের প্রায়োগিক বিশ্লেষণ।",
    aliases: ["মনোবিজ্ঞান"],
  },
  {
    name: "আত্ম-উন্নয়ন ও ব্যক্তিত্ব বিকাশ",
    slug: "atmo-unnayan-o-byaktittwo-bikash",
    description: "ব্যক্তিগত উন্নয়ন, আত্মবিশ্বাস বৃদ্ধি, অভ্যাস গঠন ও সচেতন জীবনযাপন।",
    aliases: ["আত্ম-উন্নয়ন ও মনস্তত্ত্ব", "আত্ম-উন্নয়ন ও মনস্তত্ত্ব", "আত্ম-উন্নয়ন", "আত্ম-উন্নয়ন"],
  },
  {
    name: "ইতিহাস ও ঐতিহ্য",
    slug: "itihas-o-oitihyo",
    description: "বাংলাদেশ ও বিশ্ব ইতিহাস, সভ্যতা, সংগ্রাম ও সাংস্কৃতিক ঐতিহ্যের ইতিহাস।",
    aliases: ["ইতিহাস"],
  },
  {
    name: "ধর্ম ও আধ্যাত্মিকতা",
    slug: "dhormo-o-addhatmikota",
    description: "ধর্মের মূল শিক্ষা, নৈতিকতা, বিশ্বাস ও আধ্যাত্মিক সাধনা।",
    aliases: ["ধর্ম"],
  },
  {
    name: "বিজ্ঞান",
    slug: "biggan",
    description: "পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, জ্যোতির্বিজ্ঞান ও সাধারণ বিজ্ঞান।",
  },
  {
    name: "প্রযুক্তি ও কৃত্রিম বুদ্ধিমত্তা",
    slug: "projukti-o-krittrim-buddhimotta",
    description: "আধুনিক তথ্যপ্রযুক্তি, এআই, মেশিন লার্নিং ও ভবিষ্যৎ প্রযুক্তির বিস্তার।",
    aliases: ["প্রযুক্তি", "কৃত্রিম বুদ্ধিমত্তা"],
  },
  {
    name: "Software Engineering",
    slug: "software-engineering",
    description: "Books on programming languages, software architecture, and developer tools.",
    aliases: ["সফটওয়্যার ইঞ্জিনিয়ারিং", "software engineering"],
  },
  {
    name: "ব্যবসা ও উদ্যোক্তা উন্নয়ন",
    slug: "byabsha-o-uddyokta-unnayan",
    description: "স্টার্টআপ গঠন, সফল ব্যবসার কৌশল, বিপণন ও উদ্যোক্তা হওয়ার ব্যবহারিক দিক।",
    aliases: ["ব্যবসা ও উদ্যোক্তা"],
  },
  {
    name: "অর্থনীতি ও বিনিয়োগ",
    slug: "orthoniti-o-biniyog",
    description: "সামষ্টিক অর্থনীতি, ব্যক্তিগত অর্থ ব্যবস্থাপনা, সঞ্চয় ও শেয়ার বাজার বিনিয়োগ।",
    aliases: ["অর্থনীতি"],
  },
  {
    name: "রাজনীতি ও সমাজ",
    slug: "rajniti-o-somaj",
    description: "রাষ্ট্রবিজ্ঞান, সমাজবিজ্ঞান, নাগরিক অধিকার ও রাজনৈতিক গতিধারা।",
    aliases: ["রাজনীতি"],
  },
  {
    name: "শিক্ষা ও একাডেমিক",
    slug: "shikkha-o-academic",
    description: "পাঠ্যক্রম সহায়ক বই, গবেষণা পদ্ধতি, শিক্ষাতত্ত্ব ও দক্ষতা উন্নয়ন।",
    aliases: ["শিক্ষা"],
  },
  {
    name: "জীবনী ও আত্মজীবনী",
    slug: "jiboni-o-atmojiboni",
    description: "বিখ্যাত ব্যক্তিত্ব, মনীষী, বিজ্ঞানী ও সংগ্রামীদের অনুপ্রেরণাদায়ী জীবনকাহিনী।",
    aliases: ["জীবনী"],
  },
  {
    name: "স্বাস্থ্য ও সুস্থতা",
    slug: "sastho-o-susthota",
    description: "শারীরিক ও মানসিক সুস্থতা, পুষ্টি, প্রাথমিক চিকিৎসা ও স্বাস্থ্যকর জীবনধারা।",
    aliases: ["স্বাস্থ্য"],
  },
  {
    name: "ভ্রমণ ও সংস্কৃতি",
    slug: "bhromon-o-songskriti",
    description: "দেশ-বিদেশের ভ্রমণ অভিজ্ঞতা, পর্যটন গাইড, লোকসংস্কৃতি ও নৃবিজ্ঞান।",
    aliases: ["ভ্রমণ"],
  },
  {
    name: "শিশু-কিশোর সাহিত্য",
    slug: "shishu-kishore-sahitya",
    description: "কিশোর থ্রিলার, সায়েন্স ফিকশন, কমিকস ও শিশুদের রঙিন মজার গল্প।",
    aliases: ["শিশু-কিশোর"],
  },
  {
    name: "ভাষা ও ভাষা শিক্ষা",
    slug: "bhasha-o-bhasha-shikkha",
    description: "বাংলা ব্যাকরণ, ইংরেজি ভাষা শেখা, অনুবাদ ও ভাষা যোগাযোগের উপায়।",
    aliases: ["ভাষা শিক্ষা"],
  },
];

export async function seedCategories() {
  await mongoose.connect(uri);

  console.log("Connected to MongoDB for initial category seeding...");

  const existingCategories = await Category.find({}).lean();
  console.log(`Initial count in DB: ${existingCategories.length} categories.`);

  let createdCount = 0;
  let skippedCount = 0;
  let existingCount = 0;

  for (const item of INITIAL_CATEGORIES) {
    // Check if category already exists by exact name, slug, or matching alias
    const existing = await Category.findOne({
      $or: [
        { name: item.name },
        { slug: item.slug },
        ...(item.aliases ? [{ name: { $in: item.aliases } }] : []),
      ],
    });

    if (existing) {
      existingCount += 1;
      skippedCount += 1;
      // If the existing record is active and matches, keep it.
      // Update description or name if aliases matched without changing _id or slug
      if (existing.name !== item.name && item.aliases?.includes(existing.name)) {
        console.log(`Reusing existing category: "${existing.name}" (ID: ${existing._id}) -> aligning name to "${item.name}"`);
        existing.name = item.name;
        if (!existing.description) {
          existing.description = item.description;
        }
        await existing.save();
      } else {
        console.log(`Existing category found: "${existing.name}" (Slug: "${existing.slug}") - skipped duplicate creation.`);
      }
    } else {
      // Create new category
      await Category.create({
        name: item.name,
        slug: item.slug,
        description: item.description,
        status: "ACTIVE",
        image: null,
      });
      createdCount += 1;
      console.log(`+ Created category: "${item.name}" (Slug: "${item.slug}")`);
    }
  }

  const finalCategories = await Category.find({}).lean();

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("SEEDING SUMMARY:");
  console.log(`  • Already existing / reused: ${existingCount}`);
  console.log(`  • Newly created:             ${createdCount}`);
  console.log(`  • Skipped as duplicates:     ${skippedCount}`);
  console.log(`  • Total categories now in DB: ${finalCategories.length}`);
  console.log("─────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  return {
    createdCount,
    skippedCount,
    existingCount,
    totalCount: finalCategories.length,
  };
}

if (process.argv[1]?.endsWith("seed-initial-categories.ts")) {
  seedCategories()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Category seeding failed:", err);
      process.exit(1);
    });
}
