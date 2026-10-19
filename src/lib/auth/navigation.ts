/**
 * Role-based navbar navigation resolution helpers.
 *
 * Rules:
 * - "লিখুন" (Write):
 *   - ADMIN  -> /admin
 *   - AUTHOR -> /author
 *   - USER   -> /become-author
 *   - Unauthenticated visitor -> /login
 * - "Profile":
 *   - Resolves to the logged-in user's own account page (/account).
 *   - Never defaults to an admin route.
 */

export type UserRole = "USER" | "AUTHOR" | "ADMIN";

/**
 * Resolves the destination route for the "লিখুন" (Write) navigation item
 * according to the authenticated user's role.
 */
export function getWriteNavHref(role?: string | null): string {
  if (!role) {
    return "/login";
  }
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "AUTHOR":
      return "/author";
    case "USER":
      return "/become-author";
    default:
      return "/login";
  }
}

/**
 * Resolves the destination route for user profile/account navigation.
 * Always returns the user's own account page route, never an admin-only profile.
 */
export function getProfileNavHref(): string {
  return "/account";
}
