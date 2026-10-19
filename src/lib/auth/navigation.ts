/**
 * Role-based navbar navigation resolution helpers.
 *
 * Rules:
 * - "বই লিখুন" (Write Book):
 *   - ADMIN  -> /admin/books (Admin book management)
 *   - AUTHOR -> /author/books/new (Author direct book creation form)
 *   - USER   -> /publishing-policy (Public publishing policy page)
 *   - Unauthenticated visitor -> /publishing-policy (Public publishing policy page)
 * - "Profile":
 *   - Resolves to the logged-in user's own account page (/account).
 *   - Never defaults to an admin route.
 */

export type UserRole = "USER" | "AUTHOR" | "ADMIN";

/**
 * Resolves the destination route for the "বই লিখুন" navigation item
 * according to the authenticated user's role.
 */
export function getWriteNavHref(role?: string | null): string {
  if (!role) {
    return "/publishing-policy";
  }
  switch (role) {
    case "ADMIN":
      return "/admin/books";
    case "AUTHOR":
      return "/author/books/new";
    case "USER":
      return "/publishing-policy";
    default:
      return "/publishing-policy";
  }
}

/**
 * Resolves the destination route for user profile/account navigation.
 * Always returns the user's own account page route, never an admin-only profile.
 */
export function getProfileNavHref(): string {
  return "/account";
}

/**
 * Public main navigation links shared across desktop and mobile menus.
 */
export const MAIN_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/books", label: "Books" },
  { href: "/authors", label: "Authors" },
  { href: "/about", label: "About" },
] as const;

/**
 * Determines whether a given navigation item is active for the current pathname.
 * - "/" matches only the exact homepage ("/").
 * - Other routes (e.g. "/books", "/authors", "/about") match their exact path
 *   and nested sub-paths (e.g. "/books/my-book-slug" or "/authors/john-doe").
 */
export function isRouteActive(href: string, pathname: string): boolean {
  if (!pathname) return false;
  // Normalize pathname by removing trailing slash if not root
  const cleanPath = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (href === "/") {
    return cleanPath === "/";
  }
  return cleanPath === href || cleanPath.startsWith(`${href}/`);
}
