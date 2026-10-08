import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { signOut } from "@/lib/auth/auth";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/books", label: "Books" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
];

export async function Navbar() {
  const user = await getCurrentUser();

  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <header
      id="site-header"
      className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
          aria-label="Boi Bazar home"
        >
          <BookIcon />
          <span className="text-lg font-bold tracking-tight">
            Boi<span className="text-brand">Bazar</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-md px-3.5 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop auth controls */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                href="/account"
                id="nav-account-link"
                className="flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name ?? "Account"}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <AvatarIcon />
                )}
                <span className="max-w-[120px] truncate">{user.name}</span>
              </Link>
              <form action={handleSignOut}>
                <button
                  id="nav-signout-button"
                  type="submit"
                  className="flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                id="nav-login-link"
                className="flex h-8 items-center rounded-md px-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                id="nav-register-link"
                className="flex h-8 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/85"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu (client component) */}
        <MobileMenu isAuthenticated={!!user} userName={user?.name} />
      </div>
    </header>
  );
}

function BookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
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

function AvatarIcon() {
  return (
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
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}
