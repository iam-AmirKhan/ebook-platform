import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectToDatabase as dbConnect } from "../src/lib/db/mongoose.ts";
import UserModule from "../src/models/User.ts";
const User = UserModule.default || UserModule;
import { getWriteNavHref, getProfileNavHref } from "../src/lib/auth/navigation.ts";
import { getAccountDashboardData } from "../src/lib/data/account.ts";

// Extract jwt & session callback logic matching src/lib/auth/auth.ts
async function runJwtCallback({ token, user, trigger }) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.status = user.status;
  }

  // Ensure token.id is mapped from token.sub if not present
  if (!token.id && token.sub) {
    token.id = token.sub;
  }

  // Enrich or refresh missing role/status on reloads or token updates
  if (!token.role || !token.status || trigger === "update") {
    await dbConnect();
    let dbUser = null;
    const candidateId = token.id;
    if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
      dbUser = await User.findById(candidateId).select("role status").lean();
    }
    if (!dbUser && token.email) {
      dbUser = await User.findOne({ email: token.email.toLowerCase().trim() })
        .select("role status")
        .lean();
    }
    if (dbUser) {
      token.id = dbUser._id.toString();
      token.role = dbUser.role;
      token.status = dbUser.status;
    }
  }

  return token;
}

async function runSessionCallback({ session, token }) {
  if (token && session.user) {
    const resolvedId = token.id || token.sub;
    session.user.id = resolvedId;
    session.user.role = token.role;
    session.user.status = token.status;
  }
  return session;
}

// Logic matching src/lib/auth/session.ts: getCurrentUser
async function resolveCurrentUserFromSession(session) {
  if (!session?.user) {
    return null;
  }

  const sessionUser = session.user;
  const rawId = sessionUser.id;
  const rawEmail = sessionUser.email?.toLowerCase().trim();

  if (!rawId && !rawEmail) {
    return null;
  }

  await dbConnect();

  let dbUser = null;
  if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
    dbUser = await User.findById(rawId).lean();
  }
  if (!dbUser && rawEmail) {
    dbUser = await User.findOne({ email: rawEmail }).lean();
  }

  if (!dbUser || dbUser.status !== "ACTIVE") {
    return null;
  }

  return {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image ?? sessionUser.image ?? null,
    role: dbUser.role,
    status: dbUser.status,
  };
}

async function runSuite() {
  console.log("=== RUNNING REGRESSION SUITE: PROFILE RELOAD & ROLE IDENTITY FLOW ===");

  await dbConnect();

  // Test accounts: ADMIN, AUTHOR, USER
  const testAccounts = [
    { email: "admin_e2e@pustoka.test", expectedRole: "ADMIN", expectedWriteHref: "/admin/books" },
    { email: "author_e2e@pustoka.test", expectedRole: "AUTHOR", expectedWriteHref: "/author/books/new" },
    { email: "reader_e2e@pustoka.test", expectedRole: "USER", expectedWriteHref: "/publishing-policy" },
  ];

  for (const acct of testAccounts) {
    console.log(`\n--- Testing Account: ${acct.email} (${acct.expectedRole}) ---`);

    const dbDoc = await User.findOne({ email: acct.email }).lean();
    assert.ok(dbDoc, `Database document must exist for ${acct.email}`);
    assert.strictEqual(dbDoc.role, acct.expectedRole, `Database role must be ${acct.expectedRole}`);

    const userPayload = {
      id: dbDoc._id.toString(),
      name: dbDoc.name,
      email: dbDoc.email,
      role: dbDoc.role,
      status: dbDoc.status,
    };

    // 1. Initial Login Flow
    console.log(`[1] Simulating initial login for ${acct.expectedRole}`);
    let token = await runJwtCallback({
      token: { sub: userPayload.id, email: userPayload.email },
      user: userPayload,
      account: { provider: "credentials" },
    });

    let session = await runSessionCallback({
      session: { user: { name: userPayload.name, email: userPayload.email } },
      token,
    });

    let resolvedUser = await resolveCurrentUserFromSession(session);
    assert.ok(resolvedUser, "Resolved user must be non-null before reload");
    assert.strictEqual(resolvedUser.id, userPayload.id, "Resolved user ID must match logged-in user");
    assert.strictEqual(resolvedUser.email, userPayload.email, "Resolved user email must match");
    assert.strictEqual(resolvedUser.role, acct.expectedRole, `Role before reload must be ${acct.expectedRole}`);

    // Verify navigation links before reload
    const writeHrefBefore = getWriteNavHref(resolvedUser.role);
    assert.strictEqual(writeHrefBefore, acct.expectedWriteHref, `Write href before reload must match expected`);
    const profileHrefBefore = getProfileNavHref();
    assert.strictEqual(profileHrefBefore, "/account", `Profile href must always be /account`);

    // Verify account private data
    const dashboardDataBefore = await getAccountDashboardData(resolvedUser.id);
    assert.ok(dashboardDataBefore, "Dashboard data must be returned");

    // 2. Page Reload Simulation (F5 Hard Reload)
    // On reload, NextAuth reads the cookie token and calls jwt with user=undefined
    console.log(`[2] Simulating page reload (F5) for ${acct.expectedRole}`);

    // Simulate token payload deserialized from cookie (user is undefined)
    const cookieToken = {
      sub: token.id,
      email: token.email,
      role: token.role,
      status: token.status,
      // Note: token.id might or might not be explicitly present
    };

    const reloadedToken = await runJwtCallback({
      token: cookieToken,
      user: undefined,
      account: undefined,
      trigger: undefined,
    });

    const reloadedSession = await runSessionCallback({
      session: { user: { name: dbDoc.name, email: dbDoc.email } },
      token: reloadedToken,
    });

    const reloadedUser = await resolveCurrentUserFromSession(reloadedSession);
    assert.ok(reloadedUser, "Resolved user after reload must NOT be null");
    assert.strictEqual(reloadedUser.id, userPayload.id, "User ID after reload must remain exact authenticated user");
    assert.strictEqual(reloadedUser.email, userPayload.email, "Email after reload must remain exact authenticated user");
    assert.strictEqual(
      reloadedUser.role,
      acct.expectedRole,
      `User role after reload MUST BE ${acct.expectedRole}, never an Admin fallback!`
    );

    // Verify navigation links after reload
    const writeHrefAfter = getWriteNavHref(reloadedUser.role);
    assert.strictEqual(writeHrefAfter, acct.expectedWriteHref, `Write href after reload must match expected`);
    const profileHrefAfter = getProfileNavHref();
    assert.strictEqual(profileHrefAfter, "/account", `Profile href after reload must remain /account`);

    // 3. Page Reload when token only has sub/email (worst-case token roundtrip)
    console.log(`[3] Simulating reload with minimal token (only sub and email)`);
    const minimalCookieToken = {
      sub: userPayload.id,
      email: userPayload.email,
    };
    const recoveredToken = await runJwtCallback({
      token: minimalCookieToken,
      user: undefined,
      account: undefined,
      trigger: undefined,
    });
    const recoveredSession = await runSessionCallback({
      session: { user: { email: userPayload.email } },
      token: recoveredToken,
    });
    const recoveredUser = await resolveCurrentUserFromSession(recoveredSession);
    assert.ok(recoveredUser, "User must be recovered from MongoDB via sub/email");
    assert.strictEqual(recoveredUser.id, userPayload.id, "Recovered ID must match");
    assert.strictEqual(recoveredUser.role, acct.expectedRole, `Recovered role must be ${acct.expectedRole}`);

    // Verify account data isolation: querying with non-existent or invalid ID must return empty, never another user's data
    const invalidData = await getAccountDashboardData("invalid_id_format");
    assert.strictEqual(invalidData.library.length, 0, "Invalid user ID must return empty library");
    assert.strictEqual(invalidData.purchaseHistory.length, 0, "Invalid user ID must return empty purchases");
  }

  // 4. Test Account Switching
  console.log("\n--- Testing Account Switching Flow ---");
  // Log in as USER
  const userDoc = await User.findOne({ email: "reader_e2e@pustoka.test" }).lean();
  let userToken = await runJwtCallback({
    token: { sub: userDoc._id.toString(), email: userDoc.email },
    user: { id: userDoc._id.toString(), email: userDoc.email, role: userDoc.role, status: userDoc.status },
  });
  let userSession = await runSessionCallback({ session: { user: {} }, token: userToken });
  let activeUser = await resolveCurrentUserFromSession(userSession);
  assert.strictEqual(activeUser.role, "USER");
  assert.strictEqual(getWriteNavHref(activeUser.role), "/publishing-policy");

  // Sign out -> unauthenticated
  console.log("[SignOut] User signs out -> session is null");
  let unauthNav = getWriteNavHref(null);
  assert.strictEqual(unauthNav, "/publishing-policy", "Unauthenticated visitor write link must be /publishing-policy");

  // Sign in as AUTHOR
  console.log("[SignIn] Author signs in");
  const authorDoc = await User.findOne({ email: "author_e2e@pustoka.test" }).lean();
  let authorToken = await runJwtCallback({
    token: { sub: authorDoc._id.toString(), email: authorDoc.email },
    user: { id: authorDoc._id.toString(), email: authorDoc.email, role: authorDoc.role, status: authorDoc.status },
  });
  let authorSession = await runSessionCallback({ session: { user: {} }, token: authorToken });
  let activeAuthor = await resolveCurrentUserFromSession(authorSession);
  assert.strictEqual(activeAuthor.role, "AUTHOR");
  assert.strictEqual(getWriteNavHref(activeAuthor.role), "/author/books/new");

  // Reload author session
  console.log("[Reload] Author reloads page");
  let reloadedAuthorToken = await runJwtCallback({ token: { ...authorToken }, user: undefined });
  let reloadedAuthorSession = await runSessionCallback({ session: { user: {} }, token: reloadedAuthorToken });
  let reloadedAuthor = await resolveCurrentUserFromSession(reloadedAuthorSession);
  assert.strictEqual(reloadedAuthor.role, "AUTHOR");
  assert.strictEqual(reloadedAuthor.email, "author_e2e@pustoka.test");

  // Sign out -> sign in as ADMIN
  console.log("[SignIn] Admin signs in");
  const adminDoc = await User.findOne({ email: "admin_e2e@pustoka.test" }).lean();
  let adminToken = await runJwtCallback({
    token: { sub: adminDoc._id.toString(), email: adminDoc.email },
    user: { id: adminDoc._id.toString(), email: adminDoc.email, role: adminDoc.role, status: adminDoc.status },
  });
  let adminSession = await runSessionCallback({ session: { user: {} }, token: adminToken });
  let activeAdmin = await resolveCurrentUserFromSession(adminSession);
  assert.strictEqual(activeAdmin.role, "ADMIN");
  assert.strictEqual(getWriteNavHref(activeAdmin.role), "/admin/books");

  console.log("\n>>> ALL REGRESSION SUITE TESTS COMPLETED AND PASSED SUCCESSFULLY! <<<\n");
  await mongoose.disconnect();
}

runSuite().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
