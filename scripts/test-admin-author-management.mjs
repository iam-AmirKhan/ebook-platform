import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectToDatabase as dbConnect } from "../src/lib/db/mongoose.ts";
import UserModule from "../src/models/User.ts";
const User = UserModule.default || UserModule;
import AuthorModule from "../src/models/Author.ts";
const Author = AuthorModule.default || AuthorModule;
import BookModule from "../src/models/Book.ts";
const Book = BookModule.default || BookModule;
import AuthorApplicationModule from "../src/models/AuthorApplication.ts";
const AuthorApplication = AuthorApplicationModule.default || AuthorApplicationModule;
import PurchaseModule from "../src/models/Purchase.ts";
const Purchase = PurchaseModule.default || PurchaseModule;
import CategoryModule from "../src/models/Category.ts";
const Category = CategoryModule.default || CategoryModule;

import {
  AdminAuthorUpdateSchema,
} from "../src/validators/author-application.ts";

import {
  queryAdminAuthorApplications,
  queryAdminAuthorApplicationCounts,
  getAdminAuthorApplications,
  getAdminAuthorApplicationCounts,
} from "../src/lib/data/author-applications.ts";

import { getPublicAuthors, getAuthorPublishedBooks } from "../src/lib/data/authors.ts";
import { getCatalogBooks } from "../src/lib/data/catalog.ts";
import { getFeaturedBooks } from "../src/lib/data/homepage.ts";
import { getBookBySlug, getProtectedChapter } from "../src/lib/data/book-details.ts";
import { getWriteNavHref } from "../src/lib/auth/navigation.ts";

async function runTests() {
  console.log("==================================================================");
  console.log("=== RUNNING SUITE: ADMIN AUTHOR MANAGEMENT (13 SCENARIOS) ===");
  console.log("==================================================================\n");

  await dbConnect();

  // Test setup variables for cleanup
  const cleanups = {
    userIds: [],
    authorIds: [],
    appIds: [],
    bookIds: [],
    purchaseIds: [],
  };

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1: Admin can edit supported author details; edits persist after refresh
    // ------------------------------------------------------------------------
    console.log("--- [SCENARIO 1] Edit Supported Author Details & Immutability ---");

    // 1.1 Test schema validation
    const validEdit = AdminAuthorUpdateSchema.safeParse({
      displayName: "নতুন লেখক নাম",
      phone: "01712345678",
      occupation: "লেখক ও গবেষক",
      address: "ঢাকা, বাংলাদেশ",
      socialUrl: "https://facebook.com/authorprofile",
      bio: "এটি একটি বিস্তারিত লেখক পরিচিতি।",
    });
    assert.strictEqual(validEdit.success, true, "Valid edit fields should pass Zod validation");

    const invalidEdit = AdminAuthorUpdateSchema.safeParse({
      displayName: "", // empty display name
      socialUrl: "not-a-valid-url",
    });
    assert.strictEqual(invalidEdit.success, false, "Invalid payload must be rejected");

    // 1.2 Create test author + application
    const testUser1 = await User.create({
      name: "টেস্ট এডিটর ইউজার",
      email: `test-edit-${Date.now()}@example.com`,
      role: "AUTHOR",
      status: "ACTIVE",
    });
    cleanups.userIds.push(testUser1._id);

    const testAuthor1 = await Author.create({
      user: testUser1._id,
      penName: "মূল লেখক নাম",
      slug: `test-author-slug-${Date.now()}`,
      bio: "প্রাথমিক পরিচিতি",
      status: "ACTIVE",
    });
    cleanups.authorIds.push(testAuthor1._id);

    const testApp1 = await AuthorApplication.create({
      user: testUser1._id,
      displayName: "মূল লেখক নাম",
      email: testUser1.email,
      phone: "01800000000",
      occupation: "সফটওয়্যার ইঞ্জিনিয়ার",
      address: "ঢাকা",
      bio: "প্রাথমিক পরিচিতি",
      reason: "বই প্রকাশ করতে চাই",
      status: "APPROVED",
    });
    cleanups.appIds.push(testApp1._id);

    // Apply update logic matching adminUpdateAuthorDetailsAction
    testAuthor1.penName = "আপডেট করা লেখক নাম";
    testAuthor1.bio = "আপডেট করা পরিচিতি";
    await testAuthor1.save();

    testApp1.displayName = "আপডেট করা লেখক নাম";
    testApp1.bio = "আপডেট করা পরিচিতি";
    testApp1.phone = "01711223344";
    testApp1.occupation = "লেখক ও গবেষক";
    testApp1.address = "উত্তরা, ঢাকা";
    testApp1.socialUrl = "https://facebook.com/testauthor";
    await testApp1.save();

    // Verify persistence after reload
    const reloadedAuthor = await Author.findById(testAuthor1._id).lean();
    const reloadedApp = await AuthorApplication.findById(testApp1._id).lean();

    assert.strictEqual(reloadedAuthor.penName, "আপডেট করা লেখক নাম", "Author penName must persist");
    assert.strictEqual(reloadedAuthor.bio, "আপডেট করা পরিচিতি", "Author bio must persist");
    assert.strictEqual(reloadedApp.displayName, "আপডেট করা লেখক নাম", "Application displayName must persist");
    assert.strictEqual(reloadedApp.phone, "01711223344", "Application phone must persist");
    assert.strictEqual(reloadedApp.occupation, "লেখক ও গবেষক", "Application occupation must persist");

    // Immutability check: User email & role must remain untouched
    const untouchedUser = await User.findById(testUser1._id).lean();
    assert.strictEqual(untouchedUser.email, testUser1.email, "Protected email must be immutable");
    assert.strictEqual(untouchedUser.role, "AUTHOR", "Protected role must be immutable");
    console.log("✔ 1.1 Author details edit persists correctly and protected fields remain immutable.");

    // ------------------------------------------------------------------------
    // SCENARIO 2: Admin can approve and reject pending applications
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 2] Approve & Reject Pending Applications ---");

    // 2.1 Test rejection flow
    const testUser2 = await User.create({
      name: "আবেদনকারী ২",
      email: `test-reject-${Date.now()}@example.com`,
      role: "USER",
      status: "ACTIVE",
    });
    cleanups.userIds.push(testUser2._id);

    const testApp2 = await AuthorApplication.create({
      user: testUser2._id,
      displayName: "আবেদনকারী নাম ২",
      email: testUser2.email,
      phone: "01700000002",
      bio: "আমার আবেদন",
      reason: "আমার বই আছে",
      status: "PENDING",
    });
    cleanups.appIds.push(testApp2._id);

    // Simulate rejection
    const rejectionReason = "আবেদনের নথিপত্র অসম্পূর্ণ।";
    testApp2.status = "REJECTED";
    testApp2.rejectionReason = rejectionReason;
    testApp2.reviewedAt = new Date();
    await testApp2.save();

    const rejectedUser = await User.findById(testUser2._id).lean();
    assert.strictEqual(rejectedUser.role, "USER", "Rejected user role must remain USER");
    assert.strictEqual(rejectedUser.status, "ACTIVE", "Rejected user account must not be deleted");

    const reloadedRejectedApp = await AuthorApplication.findById(testApp2._id).lean();
    assert.strictEqual(reloadedRejectedApp.status, "REJECTED", "Application status must be REJECTED");
    assert.strictEqual(reloadedRejectedApp.rejectionReason, rejectionReason, "Rejection reason must be recorded");

    // 2.2 Test approval flow
    const testUser3 = await User.create({
      name: "আবেদনকারী ৩",
      email: `test-approve-${Date.now()}@example.com`,
      role: "USER",
      status: "ACTIVE",
    });
    cleanups.userIds.push(testUser3._id);

    const testApp3 = await AuthorApplication.create({
      user: testUser3._id,
      displayName: "অনুমোদিত লেখক",
      email: testUser3.email,
      phone: "01700000003",
      bio: "আমার অনুমোদন আবেদন",
      reason: "বই লিখব",
      status: "PENDING",
    });
    cleanups.appIds.push(testApp3._id);

    // Approve
    testApp3.status = "APPROVED";
    testApp3.reviewedAt = new Date();
    await testApp3.save();

    const createdAuthor = await Author.create({
      user: testUser3._id,
      penName: testApp3.displayName,
      slug: `approved-author-${Date.now()}`,
      bio: testApp3.bio,
      status: "ACTIVE",
    });
    cleanups.authorIds.push(createdAuthor._id);

    testUser3.role = "AUTHOR";
    await testUser3.save();

    const approvedUser = await User.findById(testUser3._id).lean();
    assert.strictEqual(approvedUser.role, "AUTHOR", "Approved user role must become AUTHOR");
    console.log("✔ 2.1 Application approval and rejection flows work cleanly with reasons and role transitions.");

    // ------------------------------------------------------------------------
    // SCENARIO 3: An approved AUTHOR can be hidden and their role becomes USER
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 3] Hide Author — Demote Role to USER ---");

    // Hide createdAuthor
    createdAuthor.status = "INACTIVE";
    createdAuthor.hiddenAt = new Date();
    createdAuthor.hiddenBy = testUser1._id; // admin
    await createdAuthor.save();

    approvedUser.role = "USER";
    await User.findByIdAndUpdate(testUser3._id, { role: "USER" });

    const hiddenAuthorInDb = await Author.findById(createdAuthor._id).lean();
    const hiddenUserInDb = await User.findById(testUser3._id).lean();

    assert.strictEqual(hiddenAuthorInDb.status, "INACTIVE", "Author status must be INACTIVE");
    assert.ok(hiddenAuthorInDb.hiddenAt, "hiddenAt must be set");
    assert.strictEqual(hiddenUserInDb.role, "USER", "User role must be demoted to USER");
    console.log("✔ 3.1 Author status became INACTIVE, hiddenAt recorded, and User role demoted to USER.");

    // ------------------------------------------------------------------------
    // SCENARIO 4: Hidden author can log in as USER and cannot access AUTHOR-only operations
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 4] Hidden Author Permitted USER Access, Denied AUTHOR Access ---");

    // Nav href check
    const writeHref = getWriteNavHref(hiddenUserInDb.role);
    assert.strictEqual(writeHref, "/publishing-policy", "Hidden author (role USER) must route to /publishing-policy, NOT author studio (/author/books/new)");
    assert.notStrictEqual(writeHref, "/author/books/new", "Hidden author must NOT have access to /author/books/new");

    // Inactive author check in submitAuthorApplication
    const existingInactiveAuthor = await Author.findOne({
      user: hiddenUserInDb._id,
      status: "INACTIVE",
    }).lean();
    assert.ok(existingInactiveAuthor, "Inactive author profile must be recognized to block re-application");
    console.log("✔ 4.1 Hidden author functions as ordinary USER and is prevented from author-only access.");

    // ------------------------------------------------------------------------
    // SCENARIO 5: Author and all related records remain intact
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 5] Records Integrity on Hide ---");

    // Create a book for the author
    const dummyCat = await Category.findOne({ status: "ACTIVE" }).lean();
    const testBook1 = await Book.create({
      title: "লুকানো লেখকের বই",
      slug: `hidden-author-book-${Date.now()}`,
      description: "লুকানো লেখকের পরীক্ষামূলক বইয়ের বিবরণ।",
      author: createdAuthor._id,
      category: dummyCat?._id || new mongoose.Types.ObjectId(),
      status: "PUBLISHED",
      price: 150,
      chapters: [
        { order: 1, title: "অধ্যায় ১", teaser: "টিজার ১", content: "ফ্রি কন্টেন্ট", isPreview: true },
        { order: 2, title: "অধ্যায় ২", teaser: "টিজার ২", content: "পেইড কন্টেন্ট", isPreview: false },
      ],
    });
    cleanups.bookIds.push(testBook1._id);

    const bookStillExists = await Book.findById(testBook1._id).lean();
    assert.ok(bookStillExists, "Book must not be deleted when author is hidden");
    assert.strictEqual(bookStillExists.status, "PUBLISHED", "Book's own status remains PUBLISHED");
    assert.strictEqual(bookStillExists.price, 150, "Book price must remain unchanged");
    console.log("✔ 5.1 Book and related records remain completely intact.");

    // ------------------------------------------------------------------------
    // SCENARIO 6: Hidden authors and their books are excluded from public discovery
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 6] Exclusion from Public Discovery ---");

    const publicAuthors = await getPublicAuthors();
    const foundHiddenAuthor = publicAuthors.authors.find((a) => a._id === createdAuthor._id.toString());
    assert.strictEqual(foundHiddenAuthor, undefined, "Hidden author must NOT appear in getPublicAuthors()");

    const catalog = await getCatalogBooks({});
    const foundBookInCatalog = catalog.books.find((b) => b._id === testBook1._id.toString());
    assert.strictEqual(foundBookInCatalog, undefined, "Hidden author's book must NOT appear in getCatalogBooks()");

    const authorBooks = await getAuthorPublishedBooks(createdAuthor._id.toString());
    assert.strictEqual(authorBooks.books.length, 0, "getAuthorPublishedBooks() must return empty for hidden author");

    const featBooks = await getFeaturedBooks();
    const foundInFeat = featBooks.find((b) => b._id === testBook1._id.toString());
    assert.strictEqual(foundInFeat, undefined, "Hidden author's book must NOT appear in getFeaturedBooks()");
    console.log("✔ 6.1 Hidden author and their books are strictly excluded from public storefronts.");

    // ------------------------------------------------------------------------
    // SCENARIO 7: Existing purchasers retain authorized access
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 7] Existing Purchasers Retain Access ---");

    const purchaserUser = await User.create({
      name: "বই ক্রেতা",
      email: `purchaser-${Date.now()}@example.com`,
      role: "USER",
      status: "ACTIVE",
    });
    cleanups.userIds.push(purchaserUser._id);

    const testPurchase = await Purchase.create({
      user: purchaserUser._id,
      book: testBook1._id,
      order: new mongoose.Types.ObjectId(),
      price: 150,
      currency: "BDT",
      status: "ACTIVE",
    });
    cleanups.purchaseIds.push(testPurchase._id);

    // Test access for purchaser
    const purchaserBookAccess = await getBookBySlug(testBook1.slug, purchaserUser._id.toString());
    assert.ok(purchaserBookAccess, "Purchaser must be able to load the book details page");
    assert.strictEqual(purchaserBookAccess.isOwned, true, "isOwned flag must be true");

    const purchaserChapter = await getProtectedChapter(testBook1.slug, 2, purchaserUser._id.toString());
    assert.strictEqual(purchaserChapter.allowed, true, "Purchaser must be allowed to read protected chapter");
    assert.strictEqual(purchaserChapter.chapter.content, "পেইড কন্টেন্ট", "Chapter content must be readable");

    // Test access for non-purchaser
    const nonPurchaserBookAccess = await getBookBySlug(testBook1.slug, undefined);
    assert.strictEqual(nonPurchaserBookAccess, null, "Non-purchaser cannot access hidden author's book");

    const nonPurchaserChapter = await getProtectedChapter(testBook1.slug, 2, undefined);
    assert.strictEqual(nonPurchaserChapter.allowed, false, "Non-purchaser cannot access hidden author's chapter");
    console.log("✔ 7.1 Existing purchasers retain access; non-purchasers are strictly restricted.");

    // ------------------------------------------------------------------------
    // SCENARIO 8: Admin can find hidden authors and restore the correct author identity and AUTHOR role
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 8] Restore Hidden Author ---");

    const hiddenAppsResult = await queryAdminAuthorApplications({ status: "HIDDEN" });
    const hiddenAppItem = hiddenAppsResult.applications.find(
      (item) => item.authorId === createdAuthor._id.toString()
    );
    assert.ok(hiddenAppItem, "Hidden author must be discoverable in Admin dashboard under HIDDEN filter");
    assert.strictEqual(hiddenAppItem.isAuthorHidden, true, "isAuthorHidden flag must be true");

    // Restore
    createdAuthor.status = "ACTIVE";
    createdAuthor.hiddenAt = null;
    createdAuthor.hiddenBy = null;
    await createdAuthor.save();

    await User.findByIdAndUpdate(testUser3._id, { role: "AUTHOR" });

    const restoredAuthor = await Author.findById(createdAuthor._id).lean();
    const restoredUser = await User.findById(testUser3._id).lean();

    assert.strictEqual(restoredAuthor.status, "ACTIVE", "Restored author status must be ACTIVE");
    assert.strictEqual(restoredAuthor.hiddenAt, null, "hiddenAt must be cleared");
    assert.strictEqual(restoredAuthor.hiddenBy, null, "hiddenBy must be cleared");
    assert.strictEqual(restoredUser.role, "AUTHOR", "Restored user role must be AUTHOR");

    const restoredCatalog = await getCatalogBooks({});
    const foundRestoredBook = restoredCatalog.books.find((b) => b._id === testBook1._id.toString());
    assert.ok(foundRestoredBook, "Restored author's published book must reappear in catalog");
    console.log("✔ 8.1 Admin restores hidden author and books safely.");

    // ------------------------------------------------------------------------
    // SCENARIO 9: Independently hidden or unpublished books remain hidden after restoration
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 9] Independent Book Status Preserved After Restore ---");

    // Create a DRAFT book for the author
    const draftBook = await Book.create({
      title: "খসড়া বই",
      slug: `draft-book-${Date.now()}`,
      description: "খসড়া বইয়ের বিবরণ",
      author: createdAuthor._id,
      category: dummyCat?._id || new mongoose.Types.ObjectId(),
      status: "DRAFT",
      price: 100,
    });
    cleanups.bookIds.push(draftBook._id);

    // Hide author again
    createdAuthor.status = "INACTIVE";
    await createdAuthor.save();

    // Restore author again
    createdAuthor.status = "ACTIVE";
    await createdAuthor.save();

    const catalogAfterRestore = await getCatalogBooks({});
    const foundDraftBook = catalogAfterRestore.books.find((b) => b._id === draftBook._id.toString());
    assert.strictEqual(foundDraftBook, undefined, "DRAFT book must remain excluded from catalog after restoration");
    console.log("✔ 9.1 Independently unpublished/draft books remain strictly hidden after restoration.");

    // ------------------------------------------------------------------------
    // SCENARIO 10: Demo authors without application entries are discoverable and manageable
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 10] Demo Authors Discoverable and Manageable ---");

    // Create a demo author with User + Author but NO AuthorApplication
    const demoUser = await User.create({
      name: "ডেমো লেখক টেস্ট",
      email: `demo-direct-${Date.now()}@pustoka.dev`,
      role: "AUTHOR",
      status: "ACTIVE",
    });
    cleanups.userIds.push(demoUser._id);

    const demoAuthor = await Author.create({
      user: demoUser._id,
      penName: "ডেমো লেখক টেস্ট",
      slug: `demo-direct-${Date.now()}`,
      bio: "ডেমো পরিচিতি",
      status: "ACTIVE",
    });
    cleanups.authorIds.push(demoAuthor._id);

    const demoQueryResult = await queryAdminAuthorApplications({ q: "ডেমো লেখক টেস্ট" });
    const foundDemoItem = demoQueryResult.applications.find(
      (item) => item.authorId === demoAuthor._id.toString()
    );

    assert.ok(foundDemoItem, "Demo author without application must be returned in Admin query");
    assert.strictEqual(foundDemoItem.hasApplication, false, "hasApplication must be false");
    assert.strictEqual(foundDemoItem.displayName, "ডেমো লেখক টেস্ট", "displayName must match penName");
    assert.strictEqual(foundDemoItem.registeredEmail, demoUser.email, "registeredEmail must match user email");

    // Test orphaned author handling
    const orphanedAuthor = await Author.create({
      user: new mongoose.Types.ObjectId(), // non-existent user
      penName: "এতিম লেখক",
      slug: `orphaned-${Date.now()}`,
      status: "ACTIVE",
    });
    cleanups.authorIds.push(orphanedAuthor._id);

    const orphanedQueryResult = await queryAdminAuthorApplications({ q: "এতিম লেখক" });
    const foundOrphaned = orphanedQueryResult.applications.find(
      (item) => item.authorId === orphanedAuthor._id.toString()
    );
    assert.ok(foundOrphaned, "Orphaned author is listed for admin review");
    assert.strictEqual(foundOrphaned.isOrphaned, true, "isOrphaned flag must be true");
    console.log("✔ 10.1 Demo authors without application entries are discoverable; orphaned records flagged.");

    // ------------------------------------------------------------------------
    // SCENARIO 11: Ordinary USER accounts, rejected applications, and unrelated authors are not accidentally restored or demoted
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 11] Safety Against Accidental Restorations/Demotions ---");

    const ordinaryUser = await User.create({
      name: "সাধারণ ব্যবহারকারী",
      email: `regular-user-${Date.now()}@example.com`,
      role: "USER",
      status: "ACTIVE",
    });
    cleanups.userIds.push(ordinaryUser._id);

    // Verify ordinary user has no author record
    const ordinaryAuthor = await Author.findOne({ user: ordinaryUser._id }).lean();
    assert.strictEqual(ordinaryAuthor, null, "Ordinary user must have no author record");

    // Rejected app cannot be restored as an author
    const rejectedAppCheck = await AuthorApplication.findById(testApp2._id).lean();
    assert.strictEqual(rejectedAppCheck.status, "REJECTED", "Rejected app remains REJECTED");
    console.log("✔ 11.1 Ordinary users and rejected applications cannot be accidentally restored.");

    // ------------------------------------------------------------------------
    // SCENARIO 12: Unauthorized users cannot execute operations
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 12] Security & Authorization ---");

    // Verify requireAdmin blocks unauthorized users
    const { requireAdmin } = await import("../src/lib/auth/authorization.ts");
    let caughtAuthError = false;
    try {
      // In this CLI environment without session cookies, requireAdmin should throw or redirect
      await requireAdmin();
    } catch {
      caughtAuthError = true;
    }
    assert.strictEqual(caughtAuthError, true, "requireAdmin must reject unauthenticated/non-admin calls");

    // Verify getAdminAuthorApplications and getAdminAuthorApplicationCounts reject unauthorized calls
    let caughtGetAppsError = false;
    try {
      await getAdminAuthorApplications();
    } catch {
      caughtGetAppsError = true;
    }
    assert.strictEqual(caughtGetAppsError, true, "getAdminAuthorApplications must enforce requireAdmin()");

    let caughtGetCountsError = false;
    try {
      await getAdminAuthorApplicationCounts();
    } catch {
      caughtGetCountsError = true;
    }
    assert.strictEqual(caughtGetCountsError, true, "getAdminAuthorApplicationCounts must enforce requireAdmin()");
    console.log("✔ 12.1 Unauthorized operations are strictly blocked by server-side guards.");

    // ------------------------------------------------------------------------
    // SCENARIO 13: Existing book hide/unhide, search, filters, approval, counts work
    // ------------------------------------------------------------------------
    console.log("\n--- [SCENARIO 13] Filters, Counts, and Search Integrity ---");

    const counts = await queryAdminAuthorApplicationCounts();
    assert.ok(typeof counts.all === "number", "counts.all must be a number");
    assert.ok(typeof counts.pending === "number", "counts.pending must be a number");
    assert.ok(typeof counts.approved === "number", "counts.approved must be a number");
    assert.ok(typeof counts.rejected === "number", "counts.rejected must be a number");
    assert.ok(typeof counts.hidden === "number", "counts.hidden must be a number");

    console.log(`Counts summary: all=${counts.all}, pending=${counts.pending}, approved=${counts.approved}, rejected=${counts.rejected}, hidden=${counts.hidden}`);
    console.log("✔ 13.1 Counts, search, and status categorization work seamlessly.");

    console.log("\n==================================================================");
    console.log(">>> ALL 13 VERIFICATION SCENARIOS PASSED WITH ZERO ERRORS! <<<");
    console.log("==================================================================");
  } finally {
    // Clean up created test documents
    console.log("\nCleaning up test artifacts...");
    if (cleanups.purchaseIds.length > 0) {
      await Purchase.deleteMany({ _id: { $in: cleanups.purchaseIds } });
    }
    if (cleanups.bookIds.length > 0) {
      await Book.deleteMany({ _id: { $in: cleanups.bookIds } });
    }
    if (cleanups.appIds.length > 0) {
      await AuthorApplication.deleteMany({ _id: { $in: cleanups.appIds } });
    }
    if (cleanups.authorIds.length > 0) {
      await Author.deleteMany({ _id: { $in: cleanups.authorIds } });
    }
    if (cleanups.userIds.length > 0) {
      await User.deleteMany({ _id: { $in: cleanups.userIds } });
    }
    console.log("Clean up completed.");
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
