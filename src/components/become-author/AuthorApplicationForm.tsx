"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  submitAuthorApplication,
  type AuthorApplicationActionResult,
} from "@/actions/author-applications";
import {
  isValidSocialUrl,
  normalizeSocialUrl,
} from "@/validators/author-application";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Info, CheckCircle2 } from "lucide-react";

interface AuthorApplicationFormProps {
  isAuthenticated?: boolean;
  defaultDisplayName?: string | null;
  email?: string | null;
  userId?: string | null;
  lastApplicationDate?: string;
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
  savedAt?: number;
}

const inputClass =
  "flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50";

const textareaClass = `${inputClass} min-h-[140px] resize-y font-[family-name:var(--font-bengali)] text-[1rem] leading-[1.85]`;

const labelClass =
  "block text-sm font-medium text-foreground mb-1.5 font-[family-name:var(--font-bengali)]";

function validateSocialUrl(value: string): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "সোশ্যাল মিডিয়া প্রোফাইল লিংক দেওয়া বাধ্যতামূলক।";
  }
  const normalized = normalizeSocialUrl(trimmed);
  if (normalized.length > 500) {
    return "সামাজিক মাধ্যমের URL সর্বোচ্চ ৫০০ অক্ষরের হতে পারবে।";
  }
  if (!isValidSocialUrl(normalized)) {
    return "একটি বৈধ পাবলিক সোশ্যাল মিডিয়া প্রোফাইল লিংক দিন (যেমন: Facebook, Instagram, LinkedIn, X, YouTube, Threads, বা GitHub)। লিংকটি অবশ্যই https:// হতে হবে।";
  }
  return null;
}

export function AuthorApplicationForm({
  isAuthenticated = true,
  defaultDisplayName,
  email: defaultEmail,
  userId,
  lastApplicationDate,
}: AuthorApplicationFormProps) {
  const router = useRouter();
  const initialState: AuthorApplicationActionResult = { success: false };
  const [state, formAction, isPending] = useActionState(
    submitAuthorApplication,
    initialState
  );

  const storageKey = userId
    ? `pustoka_author_app_draft_${userId}`
    : "pustoka_author_app_draft_guest";

  const [displayName, setDisplayName] = useState(defaultDisplayName || "");
  const [email, setEmail] = useState(defaultEmail || "");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [reason, setReason] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field] && !(field === "socialUrl" && prev.socialLinks)) return prev;
      const next = { ...prev };
      delete next[field];
      if (field === "socialUrl") {
        delete next.socialLinks;
      }
      return next;
    });
    setFormError(null);
  };

  const isMounted = useRef(false);
  const prevStateRef = useRef(state);

  // ── Restore saved draft on mount ─────────────────────────────────────────
  useEffect(() => {
    try {
      let stored = localStorage.getItem(storageKey);
      // Migrate from guest key if user just logged in
      if (!stored && userId) {
        const guestStored = localStorage.getItem("pustoka_author_app_draft_guest");
        if (guestStored) {
          stored = guestStored;
          localStorage.removeItem("pustoka_author_app_draft_guest");
          localStorage.setItem(storageKey, guestStored);
        }
      }

      if (!stored) return;
      const parsed: AuthorDraftData = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object") return;

      // Discard stale draft if newer server-side application exists
      if (lastApplicationDate && parsed.savedAt) {
        if (new Date(lastApplicationDate).getTime() > parsed.savedAt) {
          localStorage.removeItem(storageKey);
          return;
        }
      }

      const hasData =
        parsed.displayName ||
        parsed.phone ||
        parsed.occupation ||
        parsed.address ||
        parsed.bio ||
        parsed.reason ||
        parsed.socialUrl;

      if (hasData) {
        setTimeout(() => {
          if (parsed.displayName !== undefined) setDisplayName(parsed.displayName);
          if (parsed.email !== undefined) setEmail(parsed.email);
          if (parsed.phone !== undefined) setPhone(parsed.phone);
          if (parsed.occupation !== undefined) setOccupation(parsed.occupation);
          if (parsed.address !== undefined) setAddress(parsed.address);
          if (parsed.bio !== undefined) setBio(parsed.bio);
          if (parsed.reason !== undefined) setReason(parsed.reason);
          if (parsed.socialUrl !== undefined) setSocialUrl(parsed.socialUrl);
          setDraftRestored(true);
        }, 0);
      }
    } catch {
      // ignore JSON / storage read error
    }
  }, [storageKey, userId, lastApplicationDate]);

  // ── Auto-save draft on user input ────────────────────────────────────────
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (state.success) return;

    const timer = setTimeout(() => {
      try {
        const dataToSave: AuthorDraftData = {
          displayName,
          email,
          phone,
          occupation,
          address,
          bio,
          reason,
          socialUrl,
          savedAt: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } catch {
        // quota / private mode fallback
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [
    displayName,
    email,
    phone,
    occupation,
    address,
    bio,
    reason,
    socialUrl,
    storageKey,
    state.success,
  ]);

  // ── Action result feedback & storage purge ──────────────────────────────
  useEffect(() => {
    if (state !== prevStateRef.current) {
      prevStateRef.current = state;

      if (state.success) {
        try {
          localStorage.removeItem(storageKey);
          localStorage.removeItem("pustoka_author_app_draft_guest");
        } catch {}
        setTimeout(() => {
          setFieldErrors({});
          setFormError(null);
        }, 0);
        toast.success("আপনার আবেদন সফলভাবে জমা হয়েছে");
      } else if (state.error) {
        const mappedErrors = { ...(state.fieldErrors || {}) };
        if (mappedErrors.socialLinks && !mappedErrors.socialUrl) {
          mappedErrors.socialUrl = mappedErrors.socialLinks;
        }
        const err = state.error;
        setTimeout(() => {
          setFormError(err);
          setFieldErrors(mappedErrors);
        }, 0);
        toast.error(state.error || "আবেদন জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    }
  }, [state, storageKey]);

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem("pustoka_author_app_draft_guest");
    } catch { }
    setDraftRestored(false);
    setDisplayName(defaultDisplayName || "");
    setEmail(defaultEmail || "");
    setPhone("");
    setOccupation("");
    setAddress("");
    setBio("");
    setReason("");
    setSocialUrl("");
    setFieldErrors({});
    setFormError(null);
    toast.info("অসংরক্ষিত খসড়া মুছে ফেলা হয়েছে");
  };

  // Handle client validation and unauthenticated submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const socialErr = validateSocialUrl(socialUrl);
    if (socialErr) {
      e.preventDefault();
      setFieldErrors((prev) => ({ ...prev, socialUrl: [socialErr] }));
      setFormError(socialErr);
      toast.error(socialErr);
      return;
    }

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
        socialUrl: normalizeSocialUrl(socialUrl),
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        // storage fallback
      }
      router.push(`/login?callbackUrl=${encodeURIComponent("/become-author")}`);
    }
  };

  // ── Successful Submission: Collapse Form & Show Polished Confirmation ───
  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-10 text-center font-[family-name:var(--font-bengali)] animate-in fade-in zoom-in-95">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
          <CheckCircle2 className="size-8" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground">
          আবেদনের জন্য ধন্যবাদ!
        </h3>
        <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base text-muted-foreground leading-relaxed">
          আপনার লেখক হওয়ার আবেদন সফলভাবে জমা হয়েছে। অ্যাডমিন আপনার আবেদন পর্যালোচনা করবেন। অনুমোদন পেলে আপনি “বই লিখুন” মেনু থেকে বই তৈরি ও প্রকাশের জন্য জমা দিতে পারবেন।
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/">
            <Button variant="outline" className="font-[family-name:var(--font-bengali)]">
              হোমপেজে ফিরে যান
            </Button>
          </Link>
          <Link href="/publishing-policy">
            <Button variant="ghost" className="font-[family-name:var(--font-bengali)] text-brand hover:text-brand/90">
              বই প্রকাশের নিয়মাবলি পড়ুন
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300 font-[family-name:var(--font-bengali)]"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>আপনার পূর্বে পূরণকৃত আবেদনের তথ্য স্বয়ংক্রিয়ভাবে উদ্ধার করা হয়েছে।</span>
          </div>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="self-start sm:self-center rounded-md border border-amber-500/40 bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            খসড়া মুছে ফেলুন
          </button>
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

      {state.message && !state.success && (
        <div
          role="status"
          className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-medium text-brand font-[family-name:var(--font-bengali)]"
        >
          {state.message}
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive font-[family-name:var(--font-bengali)]"
        >
          {formError}
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
            onChange={(e) => {
              setDisplayName(e.target.value);
              clearFieldError("displayName");
            }}
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            placeholder="আপনার লেখক নাম"
            aria-describedby={
              fieldErrors.displayName ? "displayName-error" : undefined
            }
          />
          {fieldErrors.displayName && (
            <p
              id="displayName-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {fieldErrors.displayName[0]}
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
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
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
            onChange={(e) => {
              setPhone(e.target.value);
              clearFieldError("phone");
            }}
            placeholder="০১XXXXXXXXX"
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
          />
          {fieldErrors.phone && (
            <p
              id="phone-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {fieldErrors.phone[0]}
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
            onChange={(e) => {
              setOccupation(e.target.value);
              clearFieldError("occupation");
            }}
            placeholder="যেমন: শিক্ষক, লেখক, চাকরিজীবী"
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            aria-describedby={
              fieldErrors.occupation ? "occupation-error" : undefined
            }
          />
          {fieldErrors.occupation && (
            <p
              id="occupation-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {fieldErrors.occupation[0]}
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
          onChange={(e) => {
            setAddress(e.target.value);
            clearFieldError("address");
          }}
          placeholder="আপনার বর্তমান বা যোগাযোগের ঠিকানা লিখুন"
          className={`${textareaClass} min-h-[96px]`}
          aria-describedby={fieldErrors.address ? "address-error" : undefined}
        />
        {fieldErrors.address && (
          <p
            id="address-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {fieldErrors.address[0]}
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
          type="text"
          inputMode="url"
          required
          value={socialUrl}
          onChange={(e) => {
            setSocialUrl(e.target.value);
            clearFieldError("socialUrl");
          }}
          onBlur={() => {
            if (socialUrl.trim()) {
              const normalized = normalizeSocialUrl(socialUrl);
              if (normalized !== socialUrl.trim()) {
                setSocialUrl(normalized);
              }
              const err = validateSocialUrl(normalized);
              if (err) {
                setFieldErrors((prev) => ({ ...prev, socialUrl: [err] }));
              } else {
                clearFieldError("socialUrl");
              }
            }
          }}
          placeholder="https://facebook.com/your-profile"
          className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
          dir="ltr"
          aria-describedby={
            fieldErrors.socialUrl ? "socialUrl-error" : undefined
          }
        />
        <p className="mt-1 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
          আবেদন যাচাইয়ের জন্য আপনার যেকোনো একটি সক্রিয় ও পাবলিক সোশ্যাল মিডিয়া প্রোফাইল লিংক দেওয়া আবশ্যক (যেমন: Facebook, Instagram, LinkedIn, X, YouTube, Threads, বা GitHub)।
        </p>
        {fieldErrors.socialUrl && (
          <p
            id="socialUrl-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {fieldErrors.socialUrl[0]}
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
          onChange={(e) => {
            setBio(e.target.value);
            clearFieldError("bio");
          }}
          placeholder="আপনার সাহিত্যিক আগ্রহ, অতীতের কাজের অভিজ্ঞতা বা সংক্ষিপ্ত জীবনী লিখুন (কমপক্ষে ২০ অক্ষর)"
          className={textareaClass}
          aria-describedby={fieldErrors.bio ? "bio-error" : undefined}
        />
        {fieldErrors.bio && (
          <p
            id="bio-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {fieldErrors.bio[0]}
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
          onChange={(e) => {
            setReason(e.target.value);
            clearFieldError("reason");
          }}
          placeholder="পুস্তোকা-তে লেখার উদ্দেশ্য বা কী ধরনের বই প্রকাশ করতে চান তা সংক্ষেপে লিখুন (কমপক্ষে ২০ অক্ষর)"
          className={textareaClass}
          aria-describedby={
            fieldErrors.reason ? "reason-error" : undefined
          }
        />
        {fieldErrors.reason && (
          <p
            id="reason-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {fieldErrors.reason[0]}
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
