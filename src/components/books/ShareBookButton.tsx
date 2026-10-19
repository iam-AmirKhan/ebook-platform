"use client";

import { useState, useEffect, useRef } from "react";
import { Share2, Check, Copy, MessageCircle } from "lucide-react";

interface ShareBookButtonProps {
  title: string;
  slug: string;
  authorName?: string;
}

export function ShareBookButton({ title, slug, authorName }: ShareBookButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getBookUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/books/${slug}`;
    }
    return `/books/${slug}`;
  };

  const bookUrl = getBookUrl();
  const shareText = authorName ? `${title} — ${authorName} | Pustoka` : `${title} | Pustoka`;

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: `পুস্তোকাতে "${title}" বইটি পড়ুন!`,
          url: bookUrl,
        });
        return;
      } catch (err) {
        // If aborted/cancelled by user, do nothing. Otherwise open dropdown.
        if ((err as Error)?.name !== "AbortError") {
          setIsOpen(true);
        }
        return;
      }
    }
    setIsOpen((prev) => !prev);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${bookUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(bookUrl)}`;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        id="book-share-button"
        onClick={handleNativeShare}
        className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/80 px-4 py-2.5 text-sm font-medium text-foreground backdrop-blur-xs transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 font-[family-name:var(--font-bengali)]"
        aria-label="বইটি শেয়ার করুন"
      >
        <Share2 className="size-4 text-brand" />
        <span>শেয়ার করুন</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="শেয়ারিং অপশন"
          className="absolute right-0 sm:left-0 z-50 mt-2 w-64 origin-top-right sm:origin-top-left rounded-xl border border-border/80 bg-card p-3 shadow-xl shadow-black/10 transition-all focus:outline-none"
        >
          <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-bengali)]">
            শেয়ারিং মাধ্যম
          </div>

          <div className="flex flex-col gap-1 text-sm font-[family-name:var(--font-bengali)]">
            {/* Copy Link */}
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-foreground transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2.5">
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4 text-muted-foreground" />}
                <span>{copied ? "লিংক কপি হয়েছে!" : "লিংক কপি করুন"}</span>
              </span>
              {copied && <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">কপি সম্পন্ন</span>}
            </button>

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-foreground transition-colors hover:bg-muted"
            >
              <MessageCircle className="size-4 text-emerald-500" />
              <span>WhatsApp এ পাঠান</span>
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-foreground transition-colors hover:bg-muted"
            >
              <svg className="size-4 text-blue-600 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook এ শেয়ার</span>
            </a>

            {/* X / Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-foreground transition-colors hover:bg-muted"
            >
              <svg className="size-4 text-foreground fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X (টুইটার) এ পোস্ট</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
