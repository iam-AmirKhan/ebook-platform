import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Mail, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const FOOTER_LINKS = {
  Explore: [
    { href: "/books", label: "Browse Books" },
    { href: "/authors", label: "Authors" },
    { href: "/about", label: "About Us" },
  ],
  Account: [
    { href: "/login", label: "Sign In" },
    { href: "/register", label: "Create Account" },
    { href: "/account", label: "My Account" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/refund", label: "Refund Policy" },
  ],
};

interface SocialLinkItem {
  id: string;
  name: string;
  href: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  hoverClass: string;
}

const SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: "footer-social-facebook-page",
    name: "Facebook Page",
    href: "https://www.facebook.com/pustoka.bd",
    ariaLabel: "Visit Pustoka Facebook Page",
    icon: FacebookIcon,
    hoverClass:
      "hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 dark:hover:border-[#1877F2]/60 dark:hover:bg-[#1877F2]/20",
  },
  {
    id: "footer-social-facebook-community",
    name: "Facebook Community",
    href: "https://www.facebook.com/groups/3034268353588652",
    ariaLabel: "Join Pustoka Facebook Community Group",
    icon: Users,
    hoverClass:
      "hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 dark:hover:border-[#1877F2]/60 dark:hover:bg-[#1877F2]/20",
  },
  {
    id: "footer-social-instagram",
    name: "Instagram",
    href: "https://www.instagram.com/pustoka.bd/",
    ariaLabel: "Follow Pustoka on Instagram",
    icon: InstagramIcon,
    hoverClass:
      "hover:text-[#E1306C] hover:border-[#E1306C]/40 hover:bg-[#E1306C]/10 dark:hover:border-[#E1306C]/60 dark:hover:bg-[#E1306C]/20",
  },
];

export async function Footer() {
  const currentYear = new Date().getFullYear();
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <footer
      id="site-footer"
      className="mt-auto border-t border-border/60 bg-muted/30"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-12 lg:gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-12 lg:col-span-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
              aria-label="Pustoka home"
            >
              <BookIcon />
              <span className="text-lg font-bold tracking-tight">
                Pusto<span className="text-brand">ka</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Bangladesh&apos;s growing digital ebook marketplace. Read, discover, and support local authors.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Payments accepted in BDT via bKash, Nagad &amp; cards.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div
              key={heading}
              className="col-span-1 md:col-span-3 lg:col-span-2"
            >
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/60">
                {heading}
              </h2>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {heading === "Account" && isAdmin && (
                  <>
                    <li>
                      <Link
                        href="/admin"
                        id="footer-admin-dashboard-link"
                        className="text-sm font-medium text-brand transition-colors hover:underline font-[family-name:var(--font-bengali)]"
                      >
                        অ্যাডমিন ড্যাশবোর্ড
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/author-applications"
                        id="footer-admin-author-applications-link"
                        className="text-sm font-medium text-brand transition-colors hover:underline font-[family-name:var(--font-bengali)]"
                      >
                        আবেদন পর্যালোচনা
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          ))}

          {/* Contact Us & Social Media column */}
          <div className="col-span-2 sm:col-span-1 md:col-span-3 lg:col-span-3">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Contact Us
            </h2>
            <div className="space-y-3.5">
              <a
                href="mailto:pustoka.bd@gmail.com"
                id="footer-contact-email"
                className="group inline-flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 rounded-md"
                aria-label="Email Pustoka at pustoka.bd@gmail.com"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-background">
                  <Mail className="size-3.5" aria-hidden="true" />
                </span>
                <span className="font-medium tracking-tight">
                  pustoka.bd@gmail.com
                </span>
              </a>

              <div className="pt-1">
                <p className="mb-2.5 text-xs font-medium text-muted-foreground/80">
                  Connect with us
                </p>
                <div className="flex items-center gap-2">
                  {SOCIAL_LINKS.map((link) => {
                    const IconComponent = link.icon;
                    return (
                      <a
                        key={link.id}
                        id={link.id}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.ariaLabel}
                        title={link.name}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-lg border border-border/80 bg-background/50 text-muted-foreground shadow-2xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                          link.hoverClass
                        )}
                      >
                        <IconComponent className="size-4 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} Pustoka. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built in Bangladesh 🇧🇩
          </p>
        </div>
      </div>
    </footer>
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

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

