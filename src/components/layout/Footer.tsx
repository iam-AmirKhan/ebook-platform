import Link from "next/link";

const FOOTER_LINKS = {
  Explore: [
    { href: "/books", label: "Browse Books" },
    { href: "/categories", label: "Categories" },
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

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="site-footer"
      className="mt-auto border-t border-border/60 bg-muted/30"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
              aria-label="Boi Bazar home"
            >
              <BookIcon />
              <span className="text-lg font-bold tracking-tight">
                Boi<span className="text-brand">Bazar</span>
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
            <div key={heading}>
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
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} BoiBazar. All rights reserved.
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
