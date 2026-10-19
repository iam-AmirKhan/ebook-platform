"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV_LINKS, isRouteActive } from "@/lib/auth/navigation";

interface DesktopNavProps {
  writeHref: string;
}

export function DesktopNav({ writeHref }: DesktopNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {MAIN_NAV_LINKS.map((link) => {
          const isActive = isRouteActive(link.href, pathname);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative rounded-md px-3.5 py-2 text-sm transition-colors ${
                  isActive
                    ? "font-semibold text-foreground"
                    : "font-medium text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand shadow-sm shadow-brand/40"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href={writeHref}
            id="nav-write-link"
            data-testid="nav-write-link"
            aria-label="লিখুন"
            className="rounded-md px-3.5 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground font-[family-name:var(--font-bengali)]"
          >
            লিখুন
            <span className="sr-only">Write</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
