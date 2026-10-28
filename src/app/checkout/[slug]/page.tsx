import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import dbConnect from "@/lib/db/mongoose";
import Book from "@/models/Book";
import Purchase from "@/models/Purchase";
import Order from "@/models/Order";
import { getPublicPaymentSettings } from "@/lib/data/platform-settings";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { ArrowLeft, ShieldCheck, Clock } from "lucide-react";
import { Types } from "mongoose";

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

function getSlugCandidates(slug: string): string[] {
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {}
  const rawLower = slug.trim().toLowerCase();
  const decodedLower = decodedSlug.trim().toLowerCase();
  return Array.from(new Set([rawLower, decodedLower, slug, decodedSlug]));
}

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  await dbConnect();
  const candidates = getSlugCandidates(resolvedParams.slug);
  const book = await Book.findOne({ slug: { $in: candidates }, status: "PUBLISHED" })
    .select("title")
    .lean();

  if (!book) return { title: "বই খুঁজে পাওয়া যায়নি | Pustoka" };

  return {
    title: `চেকআউট: ${book.title} | Pustoka`,
    description: "সহজ ও নিরাপদ bKash / Nagad ম্যানুয়াল পেমেন্ট",
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const resolvedParams = await params;

  if (resolvedParams.slug === "cart") {
    redirect("/checkout/cart");
  }

  const user = await getCurrentUser();

  if (!user?.id) {
    redirect(`/login?next=/checkout/${resolvedParams.slug}`);
  }

  await dbConnect();

  const candidates = getSlugCandidates(resolvedParams.slug);
  const book = await Book.findOne({
    slug: { $in: candidates },
    status: "PUBLISHED",
  })
    .populate<{ author: { penName: string } }>("author", "penName")
    .lean();

  if (!book) {
    notFound();
  }

  // Check if user already owns the book
  const existingPurchase = await Purchase.findOne({
    user: new Types.ObjectId(user.id),
    book: book._id,
    status: "ACTIVE",
  }).lean();

  if (existingPurchase) {
    redirect(`/books/${book.slug}`);
  }

  // Check if user has an existing PENDING order
  const pendingOrder = await Order.findOne({
    user: new Types.ObjectId(user.id),
    "items.book": book._id,
    status: "PENDING",
  }).lean();

  const settings = await getPublicPaymentSettings();

  const hasDiscount =
    book.discountPrice !== null &&
    book.discountPrice !== undefined &&
    book.discountPrice < book.price;
  const effectivePrice = hasDiscount ? book.discountPrice! : book.price;

  return (
    <div className="flex flex-1 flex-col bg-muted/10 py-10 min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href={`/books/${book.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground font-[family-name:var(--font-bengali)]"
          >
            <ArrowLeft className="size-3.5" />
            <span>বইয়ের বিবরণে ফিরে যান</span>
          </Link>
        </div>

        {/* Existing Pending Order Warning Banner */}
        {pendingOrder && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300">
            <Clock className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold font-[family-name:var(--font-bengali)]">
                আপনার একটি অর্ডার ইতিমধ্যে যাচাইয়ের অপেক্ষায় রয়েছে
              </p>
              <p className="mt-1 text-xs opacity-90 font-[family-name:var(--font-bengali)]">
                অর্ডার রেফারেন্স #{String(pendingOrder._id).slice(-6).toUpperCase()}। অ্যাডমিন পেমেন্ট যাচাই করলেই বইটি আপনার লাইব্রেরিতে উন্মুক্ত হবে। আপনি চাইলে নিচের ফর্মে নতুন তথ্য জমা দিতে পারেন।
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-12">
          {/* Left Column: Order Summary */}
          <div className="md:col-span-5">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-foreground font-[family-name:var(--font-bengali)] border-b border-border/40 pb-3">
                অর্ডার সারসংক্ষেপ
              </h2>

              <div className="flex gap-4">
                <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
                  {book.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      প্রচ্ছদ
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 font-[family-name:var(--font-bengali)]">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                      লেখক: {book.author.penName}
                    </p>
                  </div>
                  <div className="mt-2">
                    <span className="text-base font-bold text-foreground">
                      {book.currency} {effectivePrice.toLocaleString()}
                    </span>
                    {hasDiscount && (
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        {book.currency} {book.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground font-[family-name:var(--font-bengali)]">
                  <span>বইয়ের মূল্য</span>
                  <span>{book.currency} {effectivePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-[family-name:var(--font-bengali)]">
                  <span>ডেলিভারি মাধ্যম</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">ডিজিটাল লাইব্রেরি এক্সেস</span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-2 text-sm font-bold text-foreground">
                  <span className="font-[family-name:var(--font-bengali)]">সর্বমোট</span>
                  <span>{book.currency} {effectivePrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand shrink-0" />
                <span className="font-[family-name:var(--font-bengali)]">
                  অ্যাডমিন কর্তৃক ট্রানজেকশন যাচাইয়ের পর সম্পূর্ণ বইটি আনলক হবে।
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Form */}
          <div className="md:col-span-7">
            <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs">
              <div className="mb-6">
                <h1 className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-bengali)]">
                  ম্যানুয়াল পেমেন্ট সম্পন্ন করুন
                </h1>
                <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
                  bKash অথবা Nagad এর মাধ্যমে সেন্ড মানি করে ট্রানজেকশন তথ্য প্রদান করুন।
                </p>
              </div>

              <CheckoutForm
                book={{
                  _id: String(book._id),
                  title: book.title,
                  slug: book.slug,
                  price: effectivePrice,
                  currency: book.currency || "BDT",
                  coverImage: book.coverImage ?? null,
                }}
                settings={settings}
                userEmail={user.email || ""}
                initialPendingOrder={
                  pendingOrder
                    ? {
                        _id: String(pendingOrder._id),
                        orderNumber: String(pendingOrder._id).slice(-6).toUpperCase(),
                        paymentMethod: pendingOrder.paymentMethod,
                        transactionId: pendingOrder.transactionId,
                        senderNumber: pendingOrder.senderNumber,
                        total: pendingOrder.total,
                        createdAt: pendingOrder.createdAt,
                      }
                    : null
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
