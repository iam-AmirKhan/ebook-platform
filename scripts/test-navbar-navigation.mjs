import assert from "node:assert";
import {
  getWriteNavHref,
  getProfileNavHref,
  MAIN_NAV_LINKS,
  isRouteActive,
} from "../src/lib/auth/navigation.ts";

function runTests() {
  console.log("=== RUNNING NAVBAR ROLE-BASED NAVIGATION TESTS ===\n");

  // 1. Test "বই লিখুন" for ADMIN
  const adminWriteHref = getWriteNavHref("ADMIN");
  console.log(`[TEST] ADMIN -> 'বই লিখুন' href: ${adminWriteHref}`);
  assert.strictEqual(adminWriteHref, "/admin/books", "ADMIN should navigate to /admin/books");

  // 2. Test "বই লিখুন" for AUTHOR
  const authorWriteHref = getWriteNavHref("AUTHOR");
  console.log(`[TEST] AUTHOR -> 'বই লিখুন' href: ${authorWriteHref}`);
  assert.strictEqual(authorWriteHref, "/author/books/new", "AUTHOR should navigate to /author/books/new");

  // 3. Test "বই লিখুন" for USER
  const userWriteHref = getWriteNavHref("USER");
  console.log(`[TEST] USER -> 'বই লিখুন' href: ${userWriteHref}`);
  assert.strictEqual(userWriteHref, "/publishing-policy", "USER should navigate to /publishing-policy");

  // 4. Test "বই লিখুন" for Unauthenticated Visitor (null / undefined / empty)
  const unauthNullWriteHref = getWriteNavHref(null);
  console.log(`[TEST] Unauthenticated (null) -> 'বই লিখুন' href: ${unauthNullWriteHref}`);
  assert.strictEqual(unauthNullWriteHref, "/publishing-policy", "Unauthenticated visitor (null) should navigate to /publishing-policy");

  const unauthUndefinedWriteHref = getWriteNavHref(undefined);
  console.log(`[TEST] Unauthenticated (undefined) -> 'বই লিখুন' href: ${unauthUndefinedWriteHref}`);
  assert.strictEqual(unauthUndefinedWriteHref, "/publishing-policy", "Unauthenticated visitor (undefined) should navigate to /publishing-policy");

  const unauthEmptyWriteHref = getWriteNavHref("");
  console.log(`[TEST] Unauthenticated ('') -> 'বই লিখুন' href: ${unauthEmptyWriteHref}`);
  assert.strictEqual(unauthEmptyWriteHref, "/publishing-policy", "Unauthenticated visitor ('') should navigate to /publishing-policy");

  // 5. Test "Profile" Navigation
  const profileHref = getProfileNavHref();
  console.log(`[TEST] Profile href: ${profileHref}`);
  assert.strictEqual(profileHref, "/account", "Profile should navigate to logged-in user's /account page");
  assert.notStrictEqual(profileHref, "/admin", "Profile must NEVER navigate to /admin");

  // 6. Test that invalid role does not default to ADMIN or AUTHOR
  const unknownRoleWriteHref = getWriteNavHref("UNKNOWN_ROLE");
  console.log(`[TEST] Unknown role -> 'বই লিখুন' href: ${unknownRoleWriteHref}`);
  assert.strictEqual(unknownRoleWriteHref, "/publishing-policy", "Unknown role must not default to ADMIN or AUTHOR; should go to /publishing-policy");

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
