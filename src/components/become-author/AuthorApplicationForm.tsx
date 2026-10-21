"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitAuthorApplication,
  type AuthorApplicationActionResult,
} from "@/actions/author-applications";
import { Button } from "@/components/ui/button";
import { Info, CheckCircle2 } from "lucide-react";

interface AuthorApplicationFormProps {
  isAuthenticated?: boolean;
  defaultDisplayName?: string | null;
  email?: string | null;
}

interface AuthorDraftData {
  displayName?: string;
  email?: string;
  phone?: string;
  occupation?: string;
  address?: string;
  bio?: string;
  reason?: string;
  socialUrl?: string;
  // Legacy fields for backward compatibility with existing session drafts
  socialPlatforms?: string[];
  socialUrls?: string[];
}

const inputClass =
  "flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50";

const textareaClass = `${inputClass} min-h-[140px] resize-y font-[family-name:var(--font-bengali)] text-[1rem] leading-[1.85]`;

const labelClass =
  "block text-sm font-medium text-foreground mb-1.5 font-[family-name:var(--font-bengali)]";

const DRAFT_STORAGE_KEY = "pustoka_author_application_draft";

function readSavedDraft(): AuthorDraftData | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      return JSON.parse(saved);
    }
  } catch {
    // Ignore JSON errors
  }
  return null;
}

export function AuthorApplicationForm({
  isAuthenticated = true,
}: AuthorApplicationFormProps) {
  const router = useRouter();
  const initialState: AuthorApplicationActionResult = { success: false };
  const [state, formAction, isPending] = useActionState(
    submitAuthorApplication,
    initialState
  );

  // Lazy initialize from sessionStorage to avoid useEffect cascading renders
  const [savedDraft] = useState<AuthorDraftData | null>(readSavedDraft);

  const [displayName, setDisplayName] = useState(
    () => savedDraft?.displayName || ""
  );
  const [email, setEmail] = useState(() => savedDraft?.email || "");
  const [phone, setPhone] = useState(() => savedDraft?.phone || "");
  const [occupation, setOccupation] = useState(() => savedDraft?.occupation || "");
  const [address, setAddress] = useState(() => savedDraft?.address || "");
  const [bio, setBio] = useState(() => savedDraft?.bio || "");
  const [reason, setReason] = useState(() => savedDraft?.reason || "");
  const [socialUrl, setSocialUrl] = useState(
    () => savedDraft?.socialUrl || savedDraft?.socialUrls?.[0] || ""
  );
  const [draftRestored] = useState<boolean>(() => !!savedDraft);

  // Handle unauthenticated submission by storing draft and redirecting to login
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isAuthenticated) {
      e.preventDefault();
      const draft: AuthorDraftData = {
        displayName,
        email,
        phone,
        occupation,
        address,
        bio,
        reason,
        socialUrl,
      };
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // sessionStorage failure fallback
      }
      router.push(`/login?callbackUrl=${encodeURIComponent("/become-author")}`);
    }
  };

  return (
    <form
      action={isAuthenticated ? formAction : undefined}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {/* Draft Restored Banner */}
      {draftRestored && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 font-[family-name:var(--font-bengali)]"
        >
          <CheckCircle2 className="size-4 shrink-0" />
          <span>আপনার পূর্বে পূরণকৃত আবেদনের তথ্য সফলভাবে পুনরুদ্ধার করা হয়েছে। তথ্যগুলো পর্যালোচনা করে জমা দিন।</span>
        </div>
      )}

      {/* Unauthenticated Info Notice */}
      {!isAuthenticated && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-lg border border-brand/30 bg-brand/5 p-4 text-xs sm:text-sm text-foreground/80 font-[family-name:var(--font-bengali)]"
        >
          <Info className="size-4.5 shrink-0 text-brand mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              লগইন ছাড়াই ফর্ম পূরণ করতে পারেন
            </p>
            <p className="text-muted-foreground leading-relaxed">
              আপনি নিচের প্রতিটি ক্ষেত্র পূরণ করতে পারেন। আবেদন জমা দেওয়ার বোতামে ক্লিক করলে আপনার তথ্য সুরক্ষিতভাবে সংরক্ষণ করে লগইন বা রেজিস্ট্রেশন সম্পন্ন করতে বলা হবে এবং পরবর্তীতে স্বয়ংক্রিয়ভাবে আবেদনটি জমা দিতে পারবেন।
            </p>
          </div>
        </div>
      )}

      {state.message && (
        <div
          role="status"
          className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-medium text-brand font-[family-name:var(--font-bengali)]"
        >
          {state.message}
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive font-[family-name:var(--font-bengali)]"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="displayName" className={labelClass}>
            লেখক হিসেবে নাম <span className="text-destructive">*</span>
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            placeholder="আপনার লেখক নাম"
            aria-describedby={
              state.fieldErrors?.displayName ? "displayName-error" : undefined
            }
          />
          {state.fieldErrors?.displayName && (
            <p
              id="displayName-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {state.fieldErrors.displayName[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="applicationEmail" className={labelClass}>
            ইমেইল
          </label>
          <input
            id="applicationEmail"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="আপনার ইমেইল ঠিকানা লিখুন"
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className={labelClass}>
            ফোন নম্বর <span className="text-destructive">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="০১XXXXXXXXX"
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            aria-describedby={state.fieldErrors?.phone ? "phone-error" : undefined}
          />
          {state.fieldErrors?.phone && (
            <p
              id="phone-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {state.fieldErrors.phone[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="occupation" className={labelClass}>
            পেশা <span className="text-destructive">*</span>
          </label>
          <input
            id="occupation"
            name="occupation"
            type="text"
            required
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="যেমন: শিক্ষক, লেখক, চাকরিজীবী"
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            aria-describedby={
              state.fieldErrors?.occupation ? "occupation-error" : undefined
            }
          />
          {state.fieldErrors?.occupation && (
            <p
              id="occupation-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {state.fieldErrors.occupation[0]}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>
          ঠিকানা <span className="text-destructive">*</span>
        </label>
        <textarea
          id="address"
          name="address"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="আপনার বর্তমান বা যোগাযোগের ঠিকানা লিখুন"
          className={`${textareaClass} min-h-[96px]`}
          aria-describedby={state.fieldErrors?.address ? "address-error" : undefined}
        />
        {state.fieldErrors?.address && (
          <p
            id="address-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.address[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="socialUrl" className={labelClass}>
          সোশ্যাল মিডিয়া প্রোফাইল লিংক <span className="text-destructive">*</span>
        </label>
        <input
          id="socialUrl"
          name="socialUrl"
          type="url"
          required
          value={socialUrl}
          onChange={(e) => setSocialUrl(e.target.value)}
          placeholder="https://facebook.com/your-profile"
          className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
          dir="ltr"
          aria-describedby={
            state.fieldErrors?.socialUrl ? "socialUrl-error" : undefined
          }
        />
        <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
          আবেদন যাচাইয়ের জন্য আপনার যেকোনো একটি সক্রিয় ও পাবলিক সোশ্যাল মিডিয়া প্রোফাইল লিংক দেওয়া আবশ্যক (যেমন: Facebook, Instagram, LinkedIn, X, YouTube, Threads, বা GitHub)।
        </p>
        {state.fieldErrors?.socialUrl && (
          <p
            id="socialUrl-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.socialUrl[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="bio" className={labelClass}>
          নিজের সম্পর্কে সংক্ষিপ্ত পরিচিতি{" "}
          <span className="text-destructive">*</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          required
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="আপনার সাহিত্যিক আগ্রহ, অতীতের কাজের অভিজ্ঞতা বা সংক্ষিপ্ত জীবনী লিখুন (কমপক্ষে ২০ অক্ষর)"
          className={textareaClass}
          aria-describedby={state.fieldErrors?.bio ? "bio-error" : undefined}
        />
        {state.fieldErrors?.bio && (
          <p
            id="bio-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.bio[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reason" className={labelClass}>
          কেন Pustoka-তে লিখতে চান{" "}
          <span className="text-destructive">*</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="পুস্তোকা-তে লেখার উদ্দেশ্য বা কী ধরনের বই প্রকাশ করতে চান তা সংক্ষেপে লিখুন (কমপক্ষে ২০ অক্ষর)"
          className={textareaClass}
          aria-describedby={
            state.fieldErrors?.reason ? "reason-error" : undefined
          }
        />
        {state.fieldErrors?.reason && (
          <p
            id="reason-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.reason[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          disabled={isAuthenticated ? isPending || state.success : false}
          className="w-fit font-[family-name:var(--font-bengali)]"
        >
          {!isAuthenticated
            ? "আবেদন জমা দিন (লগইন প্রয়োজন)"
            : isPending
              ? "জমা হচ্ছে..."
              : "আবেদন জমা দিন"}
        </Button>
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            ক্লিক করলে আপনার পূরণকৃত তথ্য ডিভাইসে সংরক্ষিত থাকবে এবং লগইনের পর সরাসরি জমা দিতে পারবেন।
          </p>
        )}
      </div>
    </form>
  );
}
