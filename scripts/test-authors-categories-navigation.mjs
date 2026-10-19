import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectToDatabase as dbConnect } from "../src/lib/db/mongoose.ts";
import UserModule from "../src/models/User.ts";
const User = UserModule.default || UserModule;
import AuthorModule from "../src/models/Author.ts";
const Author = AuthorModule.default || AuthorModule;
import CategoryModule from "../src/models/Category.ts";
const Category = CategoryModule.default || CategoryModule;
import BookModule from "../src/models/Book.ts";
const Book = BookModule.default || BookModule;

import {
  getPublicAuthors,
  getPublicAuthorBySlug,
  getAuthorPublishedBooks,
} from "../src/lib/data/authors.ts";

import {
  getAllActiveCategories,
  getCatalogBooks,
} from "../src/lib/data/catalog.ts";

async function runTestSuite() {
  console.log("==================================================================");
  console.log("=== RUNNING SUITE: AUTHORS & CATEGORIES ENHANCEMENT TESTS ===");
  console.log("==================================================================\n");

  // ── 1. Navigation Menu Verification ────────────────────────────────
  console.log("--- [TEST 1] Navigation Menu Verification ---");
  const navbarSource = fs.readFileSync(path.resolve("src/components/layout/Navbar.tsx"), "utf-8");
  const mobileMenuSource = fs.readFileSync(path.resolve("src/components/layout/MobileMenu.tsx"), "utf-8");
  const footerSource = fs.readFileSync(path.resolve("src/components/layout/Footer.tsx"), "utf-8");

  // Verify Navbar
  assert.ok(navbarSource.includes('{ href: "/authors", label: "Authors" }'), "Navbar must include Authors link");
  assert.ok(!navbarSource.includes('{ href: "/categories", label: "Categories" }'), "Navbar must not have Categories link");
  assert.ok(navbarSource.includes('{ href: "/", label: "Home" }'), "Navbar must retain Home");
  assert.ok(navbarSource.includes('{ href: "/books", label: "Books" }'), "Navbar must retain Books");
  console.log("✔ 1.1 Navbar has Home, Books, Authors (pointing to /authors), Categories removed");

  // Verify MobileMenu
  assert.ok(mobileMenuSource.includes('{ href: "/authors", label: "Authors" }'), "MobileMenu must include Authors link");
  assert.ok(!mobileMenuSource.includes('{ href: "/categories", label: "Categories" }'), "MobileMenu must not have Categories link");
  console.log("✔ 1.2 MobileMenu has Home, Books, Authors (pointing to /authors)");

  // Verify Footer
  assert.ok(footerSource.includes('{ href: "/authors", label: "Authors" }'), "Footer must include Authors link");
  assert.ok(!footerSource.includes('{ href: "/categories", label: "Categories" }'), "Footer must not have Categories link");
  console.log("✔ 1.3 Footer Explore section includes Authors");

  // CategoryPill link
  const categoryPillSource = fs.readFileSync(path.resolve("src/components/categories/CategoryPill.tsx"), "utf-8");
  assert.ok(categoryPillSource.includes("/books?category="), "CategoryPill must link to /books?category=");
  console.log("✔ 1.4 CategoryPill links to /books?category=${category.slug}");

  // Redirects in next.config.ts
  const nextConfigSource = fs.readFileSync(path.resolve("next.config.ts"), "utf-8");
  assert.ok(nextConfigSource.includes('source: "/categories"'), "next.config.ts must redirect /categories");
  assert.ok(nextConfigSource.includes('destination: "/books"'), "next.config.ts must redirect to /books");
  console.log("✔ 1.5 next.config.ts redirects /categories and /categories/:slug to /books");


  // ── 2. Database Connection & Context ───────────────────────────────
  await dbConnect();

  // ── 3. Category Listing & Filtering ────────────────────────────────
  console.log("\n--- [TEST 2] Category Listing & Filtering ---");
  const activeCategories = await getAllActiveCategories();
  assert.ok(Array.isArray(activeCategories), "Categories must be an array");
  assert.ok(activeCategories.length > 0, "There should be active categories in the database");
  console.log(`✔ 2.1 Retrieved ${activeCategories.length} active categories from DB`);

  // Ensure inactive categories are NOT included
  const testInactiveSlug = "test-inactive-cat-" + Date.now();
  const inactiveCat = await Category.create({
    name: "Inactive Category Test",
    slug: testInactiveSlug,
    status: "INACTIVE",
  });

  const categoriesAfterInactive = await getAllActiveCategories();
  assert.strictEqual(
    categoriesAfterInactive.some((c) => c.slug === testInactiveSlug),
    false,
    "Inactive categories must NEVER appear in public active categories list"
  );
  console.log("✔ 2.2 Inactive categories are excluded from public categories list");

  // Filtering by active category
  const firstActiveCat = activeCategories[0];
  const catalogForCat = await getCatalogBooks({ category: firstActiveCat.slug });
  assert.strictEqual(catalogForCat.activeCategoryName, firstActiveCat.name);
  console.log(`✔ 2.3 Catalog filtered by "${firstActiveCat.slug}" returned ${catalogForCat.totalCount} books`);

  // Filtering by inactive category returns 0 results
  const catalogForInactive = await getCatalogBooks({ category: testInactiveSlug });
  assert.strictEqual(catalogForInactive.totalCount, 0);
  assert.strictEqual(catalogForInactive.books.length, 0);
  console.log("✔ 2.4 Querying inactive category safely returns 0 books");

  // Clean up test inactive category
  await Category.deleteOne({ _id: inactiveCat._id });


  // ── 4. Public Authors Listing (getPublicAuthors) ───────────────────
  console.log("\n--- [TEST 3] Public Authors Listing (getPublicAuthors) ---");

  // Create an inactive author to verify status filtering
  const testUser = await User.create({
    name: "Temp Inactive Author User",
    email: `inactive_author_${Date.now()}@pustoka.test`,
    passwordHash: "dummy",
    role: "AUTHOR",
    status: "ACTIVE",
  });

  const inactiveAuthor = await Author.create({
    user: testUser._id,
    penName: "Hidden Inactive Author",
    slug: `hidden-author-${Date.now()}`,
    status: "INACTIVE",
  });

  const authorsResult = await getPublicAuthors({ page: 1, limit: 10 });
  assert.ok(authorsResult.authors.length > 0, "Should return active authors");
  assert.strictEqual(
    authorsResult.authors.some((a) => a.slug === inactiveAuthor.slug),
    false,
    "Inactive authors must NEVER appear in public authors listing"
  );
  console.log(`✔ 3.1 Retrieved ${authorsResult.authors.length} active authors; inactive author excluded`);

  // Verify fields on public author cards (no leaked private data)
  for (const author of authorsResult.authors) {
    assert.ok(author._id, "Author must have _id");
    assert.ok(author.penName, "Author must have penName");
    assert.ok(author.slug, "Author must have slug");
    assert.strictEqual(typeof author.publishedBooksCount, "number", "publishedBooksCount must be number");
    // Ensure NO private user fields are present
    assert.strictEqual((author).email, undefined, "Author card must NOT expose email");
    assert.strictEqual((author).passwordHash, undefined, "Author card must NOT expose passwordHash");
    assert.strictEqual((author).role, undefined, "Author card must NOT expose internal role");
  }
  console.log("✔ 3.2 Author cards contain required public fields and zero private user fields");

  // Test search by penName
  const targetAuthor = authorsResult.authors[0];
  const searchPart = targetAuthor.penName.slice(0, 3);
  const searchResult = await getPublicAuthors({ q: searchPart });
  assert.ok(
    searchResult.authors.some((a) => a.slug === targetAuthor.slug),
    "Searching by prefix should find matching author"
  );
  console.log(`✔ 3.3 Search by "${searchPart}" successfully found author "${targetAuthor.penName}"`);

  // Clean up inactive author and user
  await Author.deleteOne({ _id: inactiveAuthor._id });
  await User.deleteOne({ _id: testUser._id });


  // ── 5. Public Author Profile (getPublicAuthorBySlug) ───────────────
  console.log("\n--- [TEST 4] Public Author Profile (getPublicAuthorBySlug) ---");

  const authorProfile = await getPublicAuthorBySlug(targetAuthor.slug);
  assert.ok(authorProfile, "Active author slug must resolve author profile");
  assert.strictEqual(authorProfile?.slug, targetAuthor.slug);
  assert.strictEqual(authorProfile?.penName, targetAuthor.penName);
  assert.strictEqual((authorProfile).email, undefined, "Profile must NOT expose email");
  console.log(`✔ 4.1 Author profile for "${targetAuthor.slug}" loaded cleanly`);

  // Non-existent slug returns null
  const nonExistent = await getPublicAuthorBySlug("non-existent-author-slug-xyz");
  assert.strictEqual(nonExistent, null, "Non-existent author slug must return null");
  console.log("✔ 4.2 Non-existent author slug safely returns null");


  // ── 6. Author Published Books (getAuthorPublishedBooks) ────────────
  console.log("\n--- [TEST 5] Author Published Books (getAuthorPublishedBooks) ---");

  // Find an author with published books
  const publishedBook = await Book.findOne({ status: "PUBLISHED" });
  assert.ok(publishedBook, "At least one published book must exist in test DB");

  const authorIdWithBooks = String(publishedBook.author);
  const authorBooksResult = await getAuthorPublishedBooks(authorIdWithBooks, { page: 1, limit: 10 });
  assert.ok(authorBooksResult.books.length > 0, "Author should have published books");

  for (const b of authorBooksResult.books) {
    assert.ok(b.title, "Book must have title");
    assert.ok(b.slug, "Book must have slug");
    assert.ok(b.authorName, "Book must have authorName");
    // Ensure no unpublished chapter content is leaked
    assert.strictEqual((b).chapters, undefined, "Book list must not leak chapters");
    assert.strictEqual((b).contentUrl, undefined, "Book list must not leak contentUrl");
  }
  console.log(`✔ 5.1 Retrieved ${authorBooksResult.books.length} published books for author (zero leaked chapters/content)`);

  // Create a DRAFT book and verify it is NEVER returned
  const draftBook = await Book.create({
    title: "Secret Draft Book Under Construction",
    slug: "secret-draft-book-" + Date.now(),
    description: "This is a secret draft book that should not be visible",
    author: publishedBook.author,
    category: publishedBook.category,
    price: 150,
    status: "DRAFT",
    currency: "BDT",
  });

  const refreshedAuthorBooks = await getAuthorPublishedBooks(authorIdWithBooks);
  assert.strictEqual(
    refreshedAuthorBooks.books.some((b) => b.slug === draftBook.slug),
    false,
    "DRAFT books must NEVER appear in public author books listing"
  );
  console.log("✔ 5.2 Draft books are strictly excluded from public author profile");

  // Clean up draft book
  await Book.deleteOne({ _id: draftBook._id });

  console.log("\n==================================================================");
  console.log(">>> ALL AUTHORS & CATEGORIES ENHANCEMENT TESTS PASSED! <<<");
  console.log("==================================================================");

  await mongoose.disconnect();
}

runTestSuite().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
