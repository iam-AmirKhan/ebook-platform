import type { JSX } from "react";

/**
 * Floating Facebook Messenger customer support button.
 * Opens Pustoka's official Messenger chat (https://m.me/pustoka.bd) in a new tab.
 */
export function MessengerChatButton(): JSX.Element {
  return (
    <aside aria-label="Customer Support">
      <a
        href="https://m.me/pustoka.bd"
        target="_blank"
        rel="noopener noreferrer"
        id="floating-messenger-support"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0084FF] via-[#0078FF] to-[#006AFF] px-3.5 py-2.5 sm:px-4 sm:py-2.5 text-white shadow-lg shadow-[#0084FF]/30 ring-1 ring-white/20 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-[#0084FF]/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084FF] focus-visible:ring-offset-2"
        aria-label="Chat with Pustoka support on Messenger"
      >
        <span className="relative flex shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            className="size-5 shrink-0"
            aria-hidden="true"
          >
            <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.455 5.518 3.735 7.152V22l3.411-1.872c.907.252 1.87.388 2.854.388 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.443l-2.613-2.788-5.097 2.788 5.606-5.952 2.68 2.788 5.031-2.788-5.607 5.952z" />
          </svg>
          <span className="absolute -top-1 -right-1 flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
        </span>
        <span className="text-sm font-semibold tracking-wide font-[family-name:var(--font-inter)] select-none">
          Chat
        </span>
      </a>
    </aside>
  );
}
