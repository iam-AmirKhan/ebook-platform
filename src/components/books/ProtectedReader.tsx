"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { ShieldCheck, Lock, AlertCircle } from "lucide-react";

interface ProtectedReaderProps {
  content: string;
  chapterTitle: string;
  chapterOrder: number;
  teaser?: string;
  isPreview?: boolean;
  readerInfo?: {
    name?: string | null;
    email?: string | null;
    id?: string | null;
  } | null;
}

export function ProtectedReader({
  content,
  chapterTitle,
  chapterOrder,
  teaser,
  isPreview = false,
  readerInfo,
}: ProtectedReaderProps) {
  const [isObscured, setIsObscured] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const patternId = useId();

  // Construct reader watermark label
  const readerName = readerInfo?.name || readerInfo?.email || (isPreview ? "প্রিভিউ পাঠক" : "ভেরিফায়েড পাঠক");
  const pustokaId = readerInfo?.id ? readerInfo.id.slice(-6).toUpperCase() : (isPreview ? "PREVIEW" : "PUSTOKA");
  const watermarkText = `পুস্তকা • ${readerName} • #${pustokaId}`;

  const triggerNotice = useCallback((msg: string) => {
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 1. Blur content when window loses focus (e.g., external snipping tool overlay activated)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsObscured(true);
      } else {
        setIsObscured(false);
      }
    };

    const handleWindowBlur = () => {
      setIsObscured(true);
    };

    const handleWindowFocus = () => {
      setIsObscured(false);
    };

    // 2. Keyboard shortcuts deterrence
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen detection
      if (e.key === "PrintScreen") {
        setIsObscured(true);
        triggerNotice("স্ক্রিনশট বা কনটেন্ট কপি করা সংরক্ষিত।");
        setTimeout(() => setIsObscured(false), 1600);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("").catch(() => {});
          }
        } catch {
          // ignore clipboard permissions
        }
      }

      // Ctrl/Cmd + P (Print deterrence)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        triggerNotice("কপিরাইট সুরক্ষায় কনটেন্ট প্রিন্ট করা অনুমোদিত নয়।");
      }

      // Ctrl/Cmd + S (Save page deterrence)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        triggerNotice("কনটেন্ট অফলাইনে সংরক্ষণ করা সংরক্ষিত।");
      }

      // Ctrl/Cmd + U (View source deterrence)
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [triggerNotice]);

  return (
    <div
      className="relative select-none overflow-hidden rounded-lg bg-card/60 p-4 transition-all duration-200 sm:p-6"
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        triggerNotice("কনটেক্সট মেনু বা রাইট-ক্লিক নিষ্ক্রিয় করা হয়েছে।");
      }}
      onCopy={(e) => {
        e.preventDefault();
        triggerNotice("কনটেন্ট কপি করা অনুমোদিত নয়।");
      }}
      onCut={(e) => {
        e.preventDefault();
      }}
      onDragStart={(e) => {
        e.preventDefault();
      }}
    >
      {/* ── Subtitle SVG Watermark Overlay ───────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.045] dark:opacity-[0.075]"
      >
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id={patternId}
              width="340"
              height="180"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-20)"
            >
              <text
                x="20"
                y="50"
                fill="currentColor"
                fontSize="12"
                fontWeight="600"
                fontFamily="sans-serif"
                letterSpacing="1px"
              >
                {watermarkText}
              </text>
              <text
                x="180"
                y="140"
                fill="currentColor"
                fontSize="11"
                fontWeight="500"
                fontFamily="sans-serif"
                letterSpacing="1px"
              >
                PUSTOKA DRM • #{pustokaId}
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>

      {/* ── Security Notice Toast ──────────────────────────────────── */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-background/95 px-4 py-2.5 text-xs font-semibold text-amber-700 shadow-xl backdrop-blur-md dark:text-amber-400 font-[family-name:var(--font-bengali)] animate-in fade-in slide-in-from-bottom-2"
        >
          <AlertCircle className="size-4 shrink-0 text-amber-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header Metadata & Protection Badge ─────────────────────── */}
      <div className="relative z-20 mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3 text-xs text-muted-foreground font-[family-name:var(--font-bengali)]">
        <div className="flex items-center gap-2">
          {isPreview ? (
            <span className="inline-flex items-center gap-1 rounded bg-brand/10 px-2 py-0.5 font-medium text-brand">
              বিনামূল্যে প্রিভিউ
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              সুরক্ষিত পাঠক সংস্করণ
            </span>
          )}
          <span className="text-foreground/80 font-medium">
            {readerName}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[0.6875rem] text-muted-foreground/80 font-mono">
          <Lock className="size-3" />
          <span>ID: #{pustokaId}</span>
        </div>
      </div>

      {/* ── Teaser divider (if present) ────────────────────────────── */}
      {teaser && (
        <p className="relative z-20 mb-5 border-b border-border/40 pb-5 text-[0.9375rem] leading-[1.7] text-muted-foreground font-[family-name:var(--font-bengali)]">
          {teaser}
        </p>
      )}

      {/* ── Obscured Overlay when Window is Blurred ────────────────── */}
      {isObscured && (
        <div
          onClick={() => setIsObscured(false)}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-background/80 p-6 text-center backdrop-blur-md cursor-pointer select-none font-[family-name:var(--font-bengali)]"
        >
          <Lock className="size-6 text-brand animate-pulse" />
          <p className="text-sm font-semibold text-foreground">
            সুরক্ষার স্বার্থে পাঠ্য ঝাপসা করা হয়েছে
          </p>
          <p className="text-xs text-muted-foreground">
            পুনরায় স্পষ্ট করতে উইন্ডো বা ডকুমেন্টে ক্লিক করুন
          </p>
        </div>
      )}

      {/* ── Print Media Protection Fallback ────────────────────────── */}
      <div className="hidden print:block text-center py-10 font-[family-name:var(--font-bengali)]">
        <p className="text-base font-bold text-destructive">
          কপিরাইট সুরক্ষা: পুস্তকের ডিজিটাল বই মুদ্রণ বা সংরক্ষণ করা আইনত নিষিদ্ধ।
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          লাইসেন্সপ্রাপ্ত পাঠক: {readerName} (#{pustokaId})
        </p>
      </div>

      {/* ── Chapter Body Text ──────────────────────────────────────── */}
      <div
        className={[
          "relative z-20 whitespace-pre-wrap text-[1.125rem] leading-[1.9] text-foreground/90 font-[family-name:var(--font-bengali)] max-w-[65ch] print:hidden transition-all duration-150",
          isObscured ? "blur-md select-none pointer-events-none" : "",
        ].join(" ")}
      >
        {content}
      </div>

      {/* ── Reader Protection Footer ───────────────────────────────── */}
      <div className="relative z-20 mt-8 border-t border-border/40 pt-3 text-center text-[0.725rem] text-muted-foreground/60 select-none font-[family-name:var(--font-bengali)]">
        কপিরাইট © পুস্তকা ডিজিটাল পাবলিকেশনস • ডিজিটাল কপিরাইট অ্যাক্ট অনুসারে অননুমোদিত প্রতিলিপি বা পরিবেশন দণ্ডনীয় অপরাধ।
      </div>
    </div>
  );
}
