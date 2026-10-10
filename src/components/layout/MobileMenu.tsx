"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface MobileMenuProps {
  isAuthenticated: boolean;
  userName?: string | null;
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/books", label: "Books" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
];

export function MobileMenuButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      id="mobile-menu-toggle"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground md:hidden"
    >
      <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
      {isOpen ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      )}
    </button>
  );
}

export function MobileMenu({ isAuthenticated, userName }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <MobileMenuButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />

      {/* Overlay */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 right-0 z-50 w-72 transform bg-background shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2"
            >
              <BookIcon />
              <span className="font-semibold text-foreground">Pustoka</span>
            </Link>
            <button
              aria-label="Close menu"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-muted"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav aria-label="Mobile navigation" className="flex-1 px-4 py-6">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Auth section */}
          <div className="border-t border-border px-4 py-5">
            {isAuthenticated ? (
              <div className="space-y-3">
                {userName && (
                  <p className="px-3 text-xs text-muted-foreground truncate">
                    Signed in as <span className="font-medium text-foreground">{userName}</span>
                  </p>
                )}
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                >
                  My Account
                </Link>
                <button
                  onClick={async () => {
                    setIsOpen(false);
                    await signOut({ callbackUrl: "/login" });
                  }}
                  className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-full items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-full items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function BookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}
