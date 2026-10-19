import assert from "node:assert";
import {
  getWriteNavHref,
  getProfileNavHref,
  MAIN_NAV_LINKS,
  isRouteActive,
} from "../src/lib/auth/navigation.ts";

function runTests() {
  console.log("=== RUNNING NAVBAR ROLE-BASED NAVIGATION TESTS ===\n");

  // 1. Test "লিখুন" (Write) for ADMIN
  const adminWriteHref = getWriteNavHref("ADMIN");
  console.log(`[TEST] ADMIN -> 'লিখুন' href: ${adminWriteHref}`);
  assert.strictEqual(adminWriteHref, "/admin", "ADMIN should navigate to /admin");

  // 2. Test "লিখুন" (Write) for AUTHOR
  const authorWriteHref = getWriteNavHref("AUTHOR");
  console.log(`[TEST] AUTHOR -> 'লিখুন' href: ${authorWriteHref}`);
  assert.strictEqual(authorWriteHref, "/author", "AUTHOR should navigate to /author");

  // 3. Test "লিখুন" (Write) for USER
  const userWriteHref = getWriteNavHref("USER");
  console.log(`[TEST] USER -> 'লিখুন' href: ${userWriteHref}`);
  assert.strictEqual(userWriteHref, "/become-author", "USER should navigate to /become-author");

  // 4. Test "লিখুন" (Write) for Unauthenticated Visitor (null / undefined / empty)
  const unauthNullWriteHref = getWriteNavHref(null);
  console.log(`[TEST] Unauthenticated (null) -> 'লিখুন' href: ${unauthNullWriteHref}`);
  assert.strictEqual(unauthNullWriteHref, "/login", "Unauthenticated visitor (null) should navigate to /login");

  const unauthUndefinedWriteHref = getWriteNavHref(undefined);
  console.log(`[TEST] Unauthenticated (undefined) -> 'লিখুন' href: ${unauthUndefinedWriteHref}`);
  assert.strictEqual(unauthUndefinedWriteHref, "/login", "Unauthenticated visitor (undefined) should navigate to /login");

  const unauthEmptyWriteHref = getWriteNavHref("");
  console.log(`[TEST] Unauthenticated ('') -> 'লিখুন' href: ${unauthEmptyWriteHref}`);
  assert.strictEqual(unauthEmptyWriteHref, "/login", "Unauthenticated visitor ('') should navigate to /login");

  // 5. Test "Profile" Navigation
  const profileHref = getProfileNavHref();
  console.log(`[TEST] Profile href: ${profileHref}`);
  assert.strictEqual(profileHref, "/account", "Profile should navigate to logged-in user's /account page");
  assert.notStrictEqual(profileHref, "/admin", "Profile must NEVER navigate to /admin");

  // 6. Test that invalid role does not default to ADMIN
  const unknownRoleWriteHref = getWriteNavHref("UNKNOWN_ROLE");
  console.log(`[TEST] Unknown role -> 'লিখুন' href: ${unknownRoleWriteHref}`);
  assert.strictEqual(unknownRoleWriteHref, "/login", "Unknown role must not default to ADMIN or author; should go to /login");

  // 7. Test MAIN_NAV_LINKS structure
  assert.deepStrictEqual(
    MAIN_NAV_LINKS.map((l) => ({ href: l.href, label: l.label })),
    [
      { href: "/", label: "Home" },
      { href: "/books", label: "Books" },
      { href: "/authors", label: "Authors" },
      { href: "/about", label: "About" },
    ],
    "MAIN_NAV_LINKS must contain Home, Books, Authors, About"
  );
  console.log("[TEST] MAIN_NAV_LINKS contains Home, Books, Authors, About");

  // 8. Test isRouteActive logic
  // Home ("/") matches only "/"
  assert.strictEqual(isRouteActive("/", "/"), true, "Home should be active on /");
  assert.strictEqual(isRouteActive("/", "/books"), false, "Home should not be active on /books");
  assert.strictEqual(isRouteActive("/", "/about"), false, "Home should not be active on /about");
  assert.strictEqual(isRouteActive("/", "/authors"), false, "Home should not be active on /authors");

  // Books ("/books") matches /books and nested book pages
  assert.strictEqual(isRouteActive("/books", "/books"), true, "Books should be active on /books");
  assert.strictEqual(isRouteActive("/books", "/books/mastering-typescript"), true, "Books should be active on /books/[slug]");
  assert.strictEqual(isRouteActive("/books", "/authors"), false, "Books should not be active on /authors");

  // Authors ("/authors") matches /authors and nested author pages
  assert.strictEqual(isRouteActive("/authors", "/authors"), true, "Authors should be active on /authors");
  assert.strictEqual(isRouteActive("/authors", "/authors/arif-mahmud"), true, "Authors should be active on /authors/[slug]");
  assert.strictEqual(isRouteActive("/authors", "/about"), false, "Authors should not be active on /about");

  // About ("/about") matches /about
  assert.strictEqual(isRouteActive("/about", "/about"), true, "About should be active on /about");
  assert.strictEqual(isRouteActive("/about", "/books"), false, "About should not be active on /books");
  assert.strictEqual(isRouteActive("/about", "/"), false, "About should not be active on /");
  console.log("[TEST] isRouteActive matches routes and nested subroutes accurately");

  console.log("\n>>> ALL ROLE-BASED NAVIGATION TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests();
