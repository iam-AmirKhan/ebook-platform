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
  phone?: string;
  occupation?: string;
  address?: string;
  bio?: string;
  reason?: string;
  socialPlatforms?: string[];
  socialUrls?: string[];
}

const inputClass =
  "flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50";

const textareaClass = `${inputClass} min-h-[140px] resize-y font-[family-name:var(--font-bengali)] text-[1rem] leading-[1.85]`;

const labelClass =
  "block text-sm font-medium text-foreground mb-1.5 font-[family-name:var(--font-bengali)]";

const socialLinkRows = [
  { index: 0, required: true },
  { index: 1, required: false },
  { index: 2, required: false },
];

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
  defaultDisplayName,
  email,
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
    () => savedDraft?.displayName || defaultDisplayName || ""
  );
  const [phone, setPhone] = useState(() => savedDraft?.phone || "");
  const [occupation, setOccupation] = useState(() => savedDraft?.occupation || "");
  const [address, setAddress] = useState(() => savedDraft?.address || "");
  const [bio, setBio] = useState(() => savedDraft?.bio || "");
  const [reason, setReason] = useState(() => savedDraft?.reason || "");
  const [socialPlatforms, setSocialPlatforms] = useState<string[]>(
    () => savedDraft?.socialPlatforms || ["", "", ""]
  );
  const [socialUrls, setSocialUrls] = useState<string[]>(
    () => savedDraft?.socialUrls || ["", "", ""]
  );
  const [draftRestored] = useState<boolean>(() => !!savedDraft);

  // Handle unauthenticated submission by storing draft and redirecting to login
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isAuthenticated) {
      e.preventDefault();
      const draft: AuthorDraftData = {
        displayName,
        phone,
        occupation,
        address,
        bio,
        reason,
        socialPlatforms,
        socialUrls,
      };
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // sessionStorage failure fallback
      }
      router.push(`/login?callbackUrl=${encodeURIComponent("/become-author")}`);
    }
  };

  const updateSocialPlatform = (idx: number, val: string) => {
    setSocialPlatforms((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const updateSocialUrl = (idx: number, val: string) => {
    setSocialUrls((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
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
            type="email"
            value={email ?? ""}
            readOnly
            aria-readonly="true"
            placeholder={
              isAuthenticated
                ? "অ্যাকাউন্ট ইমেইল"
                : "লগইন করার পর অ্যাকাউন্ট ইমেইল স্বয়ংক্রিয়ভাবে যুক্ত হবে"
            }
            className={`${inputClass} bg-muted/40 text-muted-foreground font-[family-name:var(--font-bengali)]`}
          />
          <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
            {isAuthenticated
              ? "আপনার অ্যাকাউন্টের সাথে সংযুক্ত ভেরিফাইড ইমেইল।"
              : "নিরাপত্তার স্বার্থে আবেদনটি আপনার অনুমোদিত অ্যাকাউন্টের সাথে লিংক করা হবে।"}
          </p>
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

      <fieldset className="space-y-3">
        <legend className={labelClass}>
          সামাজিক মাধ্যমের লিংক <span className="text-destructive">*</span>
        </legend>
        <p className="text-xs text-muted-foreground font-[family-name:var(--font-bengali)] -mt-1">
          কমপক্ষে একটি সামাজিক মাধ্যম বা ব্যক্তিগত ওয়েবসাইটের লিংক প্রদান করুন (যেমন: ফেসবুক, লিংকডইন বা ওয়েবসাইট)।
        </p>
        <div className="space-y-3">
          {socialLinkRows.map(({ index, required }) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <div>
                <label
                  htmlFor={`socialPlatform-${index}`}
                  className="sr-only"
                >
                  প্ল্যাটফর্ম
                </label>
                <input
                  id={`socialPlatform-${index}`}
                  name="socialPlatform"
                  type="text"
                  required={required}
                  value={socialPlatforms[index] ?? ""}
                  onChange={(e) => updateSocialPlatform(index, e.target.value)}
                  placeholder={index === 0 ? "যেমন: Facebook" : "প্ল্যাটফর্ম (ঐচ্ছিক)"}
                  className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
                  aria-describedby={
                    state.fieldErrors?.socialLinks
                      ? "socialLinks-error"
                      : undefined
                  }
                />
              </div>
              <div>
                <label htmlFor={`socialUrl-${index}`} className="sr-only">
                  URL
                </label>
                <input
                  id={`socialUrl-${index}`}
                  name="socialUrl"
                  type="url"
                  required={required}
                  value={socialUrls[index] ?? ""}
                  onChange={(e) => updateSocialUrl(index, e.target.value)}
                  placeholder="https://example.com/your-profile"
                  className={inputClass}
                  aria-describedby={
                    state.fieldErrors?.socialLinks
                      ? "socialLinks-error"
                      : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>
        {state.fieldErrors?.socialLinks && (
          <p
            id="socialLinks-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.socialLinks[0]}
          </p>
        )}
      </fieldset>

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
