"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MAIN_NAV_LINKS,
  isRouteActive,
  getWriteNavHref,
  getProfileNavHref,
} from "@/lib/auth/navigation";
import { CartNavButton } from "@/components/cart/CartNavButton";

interface MobileMenuProps {
  isAuthenticated: boolean;
  userName?: string | null;
  userRole?: string | null;
}

export function MobileMenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id="mobile-menu-toggle"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-muted hover:text-foreground md:hidden"
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

export function MobileMenu({
  isAuthenticated,
  userName,
  userRole,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const writeHref = getWriteNavHref(isAuthenticated ? userRole : null);
  const profileHref = getProfileNavHref();

  // Close on Escape key & lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <MobileMenuButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        className={`fixed top-0 bottom-0 right-0 z-50 flex h-dvh max-h-screen w-80 max-w-[85vw] flex-col bg-background shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Fixed Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 px-5">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2"
          >
            <BookIcon />
            <span className="text-lg font-bold tracking-tight text-foreground">
              Pusto<span className="text-brand">ka</span>
            </span>
          </Link>
          <button
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
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

        {/* Scrollable Body: All navigation & auth items are inside this scroll container */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
          {/* Main Navigation links */}
          <nav aria-label="Mobile navigation">
            <ul className="space-y-1">
              {MAIN_NAV_LINKS.map((link) => {
                const isActive = isRouteActive(link.href, pathname);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand/10 text-brand font-semibold"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span>{link.label}</span>
                      {isActive && (
                        <span
                          className="absolute inset-x-3.5 bottom-0 h-0.5 rounded-full bg-brand"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}

              {/* Write Link */}
              {(() => {
                const isWriteActive = isRouteActive(writeHref, pathname);
                return (
                  <li>
                    <Link
                      href={writeHref}
                      id="mobile-nav-write-link"
                      data-testid="mobile-nav-write-link"
                      aria-label="বই লিখুন"
                      aria-current={isWriteActive ? "page" : undefined}
                      onClick={() => setIsOpen(false)}
                      className={`relative flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors font-[family-name:var(--font-bengali)] ${
                        isWriteActive
                          ? "bg-brand/10 text-brand font-semibold"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span>বই লিখুন</span>
                      {isWriteActive && (
                        <span
                          className="absolute inset-x-3.5 bottom-0 h-0.5 rounded-full bg-brand"
                          aria-hidden="true"
                        />
                      )}
                      <span className="sr-only">বই লিখুন</span>
                    </Link>
                  </li>
                );
              })()}

              {/* Shopping Cart Link */}
              <li>
                <CartNavButton showLabel onNavigate={() => setIsOpen(false)} />
              </li>
            </ul>
          </nav>

          {/* Auth & Role Account Section */}
          <div className="border-t border-border/80 pt-5">
            {isAuthenticated ? (
              <div className="space-y-2">
                {userName && (
                  <p className="px-3.5 py-1 text-xs text-muted-foreground truncate">
                    Signed in as{" "}
                    <span className="font-semibold text-foreground">
                      {userName}
                    </span>
                  </p>
                )}
                <Link
                  href={profileHref}
                  id="mobile-nav-profile-link"
                  data-testid="mobile-nav-profile-link"
                  aria-label="Profile"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center rounded-lg px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                >
                  Profile
                  <span id="mobile-nav-account-link" className="sr-only">
                    My Account
                  </span>
                </Link>
                {userRole === "USER" && (
                  <Link
                    href="/become-author"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center rounded-lg px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground font-[family-name:var(--font-bengali)]"
                  >
                    লেখক হোন
                  </Link>
                )}
                {(userRole === "AUTHOR" || userRole === "ADMIN") && (
                  <Link
                    href="/author"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center rounded-lg px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground font-[family-name:var(--font-bengali)]"
                  >
                    লেখক ড্যাশবোর্ড
                  </Link>
                )}
                {userRole === "ADMIN" && (
                  <Link
                    href="/admin"
                    id="mobile-nav-admin-dashboard-link"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center rounded-lg px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground font-[family-name:var(--font-bengali)]"
                  >
                    অ্যাডমিন ড্যাশবোর্ড
                  </Link>
                )}
                <button
                  onClick={async () => {
                    setIsOpen(false);
                    await signOut({ callbackUrl: "/login" });
                  }}
                  className="flex w-full items-center rounded-lg px-3.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <Link
                  href="/become-author"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted font-[family-name:var(--font-bengali)]"
                >
                  লেখক হোন
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-full items-center justify-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
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
