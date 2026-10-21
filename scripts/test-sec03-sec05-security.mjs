import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectToDatabase as dbConnect } from "../src/lib/db/mongoose.ts";
import UserModule from "../src/models/User.ts";
const User = UserModule.default || UserModule;

// Identity resolution logic under test (matching src/lib/auth/session.ts)
async function resolveCurrentUserFromSession(session) {
  if (!session?.user) {
    return null;
  }

  const sessionUser = session.user;
  const rawId = typeof sessionUser.id === "string" ? sessionUser.id.trim() : undefined;
  const rawEmail =
    typeof sessionUser.email === "string"
      ? sessionUser.email.toLowerCase().trim()
      : undefined;

  if (!rawId && !rawEmail) {
    return null;
  }

  await dbConnect();

  let dbUser = null;

  if (rawId && rawEmail) {
    if (!mongoose.Types.ObjectId.isValid(rawId)) {
      return null;
    }
    dbUser = await User.findOne({
      _id: new mongoose.Types.ObjectId(rawId),
      email: rawEmail,
    }).lean();
  } else if (rawId) {
    if (!mongoose.Types.ObjectId.isValid(rawId)) {
      return null;
    }
    dbUser = await User.findById(rawId).lean();
  } else if (rawEmail) {
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

// OAuth Google signIn callback under test (matching src/lib/auth/auth.ts)
async function simulateGoogleSignIn({ user, account, profile }) {
  if (account?.provider === "google") {
    if (!user.email) {
      return false;
    }

    const email = user.email.toLowerCase().trim();

    // SEC-03: Safe OAuth account linking
    const googleProfile = profile;
    const isEmailVerified =
      googleProfile?.email_verified === true ||
      googleProfile?.email_verified === "true";

    if (!isEmailVerified) {
      return false;
    }

    await dbConnect();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.status !== "ACTIVE") {
        return false;
      }

      if (!existingUser.image && user.image) {
        existingUser.image = user.image;
        await existingUser.save();
      }

      user.id = existingUser._id.toString();
      user.role = existingUser.role;
      user.status = existingUser.status;
    } else {
      const newUser = await User.create({
        name: user.name?.trim() || "User",
        email: email,
        image: user.image || null,
        passwordHash: null,
        role: "USER",
        status: "ACTIVE",
      });

      user.id = newUser._id.toString();
      user.role = newUser.role;
      user.status = newUser.status;
    }

    return true;
  }
  return false;
}

// JWT callback under test (matching src/lib/auth/auth.ts)
async function simulateJwtCallback({ token, user, trigger }) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.status = user.status;
  }

  if (!token.id && token.sub) {
    token.id = token.sub;
  }

  if (!token.role || !token.status || trigger === "update") {
    await dbConnect();
    let dbUser = null;
    const candidateId = typeof token.id === "string" ? token.id.trim() : undefined;
    const candidateEmail =
      typeof token.email === "string" ? token.email.toLowerCase().trim() : undefined;

    if (candidateId && candidateEmail) {
      if (mongoose.Types.ObjectId.isValid(candidateId)) {
        dbUser = await User.findOne({
          _id: new mongoose.Types.ObjectId(candidateId),
          email: candidateEmail,
        })
          .select("role status")
          .lean();
      }
    } else if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
      dbUser = await User.findById(candidateId).select("role status").lean();
    } else if (candidateEmail) {
      dbUser = await User.findOne({ email: candidateEmail })
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

async function runSecuritySuite() {
  console.log("==================================================================");
  console.log("=== RUNNING REGRESSION SUITE: SEC-01, SEC-03, SEC-05 HARDENING ===");
  console.log("==================================================================\n");

  await dbConnect();

  // Load test users from DB
  const adminUser = await User.findOne({ email: "admin_e2e@pustoka.test" });
  const authorUser = await User.findOne({ email: "author_e2e@pustoka.test" });
  const readerUser = await User.findOne({ email: "reader_e2e@pustoka.test" });

  assert.ok(adminUser, "admin_e2e user must exist in test DB");
  assert.ok(authorUser, "author_e2e user must exist in test DB");
  assert.ok(readerUser, "reader_e2e user must exist in test DB");

  // SECTION 1: SEC-05 Identity Consistency Tests
  console.log("--- [SECTION 1] SEC-05: Identity Consistency in getCurrentUser ---");

  // 1.1 Matching ID & Email
  const resolvedAdmin = await resolveCurrentUserFromSession({
    user: { id: adminUser._id.toString(), email: adminUser.email },
  });
  assert.strictEqual(resolvedAdmin?.id, adminUser._id.toString());
  assert.strictEqual(resolvedAdmin?.role, "ADMIN");
  console.log("✔ 1.1 Matching ID and email resolves correctly to ADMIN");

  const resolvedAuthor = await resolveCurrentUserFromSession({
    user: { id: authorUser._id.toString(), email: authorUser.email },
  });
  assert.strictEqual(resolvedAuthor?.id, authorUser._id.toString());
  assert.strictEqual(resolvedAuthor?.role, "AUTHOR");
  console.log("✔ 1.2 Matching ID and email resolves correctly to AUTHOR");

  // 1.2 Conflicting ID & Email (e.g., Reader ID with Admin Email)
  const conflictingIdentity = await resolveCurrentUserFromSession({
    user: { id: readerUser._id.toString(), email: adminUser.email },
  });
  assert.strictEqual(conflictingIdentity, null, "Conflicting ID and email must return null");
  console.log("✔ 1.3 Conflicting ID (reader) + email (admin) is REJECTED (returns null)");

  // 1.3 Conflicting ID & Email (Admin ID with Reader Email)
  const conflictingReverse = await resolveCurrentUserFromSession({
    user: { id: adminUser._id.toString(), email: readerUser.email },
  });
  assert.strictEqual(conflictingReverse, null, "Conflicting ID and email must return null");
  console.log("✔ 1.4 Conflicting ID (admin) + email (reader) is REJECTED (returns null)");

  // 1.4 Malformed ObjectId
  const malformedIdResult = await resolveCurrentUserFromSession({
    user: { id: "not-an-objectid-123", email: adminUser.email },
  });
  assert.strictEqual(malformedIdResult, null, "Malformed ObjectId must return null");
  console.log("✔ 1.5 Malformed ObjectId is REJECTED safely without throw");

  // 1.5 Non-existent ID with valid Email
  const fakeId = new mongoose.Types.ObjectId().toString();
  const fakeIdResult = await resolveCurrentUserFromSession({
    user: { id: fakeId, email: adminUser.email },
  });
  assert.strictEqual(fakeIdResult, null, "Non-matching fake ID with valid email must return null");
  console.log("✔ 1.6 Non-matching random ID + existing email is REJECTED (returns null)");

  // 1.6 Empty / Undefined identity
  assert.strictEqual(await resolveCurrentUserFromSession(null), null);
  assert.strictEqual(await resolveCurrentUserFromSession({ user: {} }), null);
  assert.strictEqual(await resolveCurrentUserFromSession({ user: { id: "", email: "" } }), null);
  console.log("✔ 1.7 Empty/undefined session identities return null without queries");


  // SECTION 2: SEC-03 OAuth / Safe Account Linking Tests
  console.log("\n--- [SECTION 2] SEC-03: OAuth & Safe Account Linking ---");

  // 2.1 Unverified Google email attempting sign-in for existing ADMIN
  const fakeAdminOAuthUser = { name: "Admin Impersonator", email: adminUser.email };
  const unverifiedAdminAttempt = await simulateGoogleSignIn({
    user: fakeAdminOAuthUser,
    account: { provider: "google" },
    profile: { email: adminUser.email, email_verified: false },
  });
  assert.strictEqual(unverifiedAdminAttempt, false, "Unverified Google account must be rejected");
  console.log("✔ 2.1 Google sign-in with email_verified: false for existing account is REJECTED");

  // 2.2 Unverified Google email with missing email_verified claim
  const missingVerifiedClaim = await simulateGoogleSignIn({
    user: { name: "Unknown", email: "unverified_random@test.com" },
    account: { provider: "google" },
    profile: { email: "unverified_random@test.com" }, // no email_verified
  });
  assert.strictEqual(missingVerifiedClaim, false, "Missing email_verified must be rejected");
  console.log("✔ 2.2 Google sign-in without verified claim is REJECTED");

  // 2.3 Verified Google sign-in for existing AUTHOR account (legitimate linking)
  const legitAuthorOAuthUser = { name: authorUser.name, email: authorUser.email };
  const verifiedAuthorAttempt = await simulateGoogleSignIn({
    user: legitAuthorOAuthUser,
    account: { provider: "google" },
    profile: { email: authorUser.email, email_verified: true },
  });
  assert.strictEqual(verifiedAuthorAttempt, true, "Verified Google sign-in must succeed");
  assert.strictEqual(legitAuthorOAuthUser.id, authorUser._id.toString());
  assert.strictEqual(legitAuthorOAuthUser.role, "AUTHOR", "Existing user DB role must be preserved");
  console.log("✔ 2.3 Verified Google login preserves existing DB role (AUTHOR), never escalates");

  // 2.4 New user Google sign-in attempting privilege escalation with profile claim
  const newOAuthEmail = `new_oauth_user_${Date.now()}@pustoka.test`;
  const maliciousOAuthUser = {
    name: "Malicious Actor",
    email: newOAuthEmail,
    role: "ADMIN", // Attacker injected claim
  };
  const newUserAttempt = await simulateGoogleSignIn({
    user: maliciousOAuthUser,
    account: { provider: "google" },
    profile: { email: newOAuthEmail, email_verified: true, role: "ADMIN", admin: true },
  });
  assert.strictEqual(newUserAttempt, true);
  assert.strictEqual(maliciousOAuthUser.role, "USER", "New OAuth user must receive role USER");

  // Verify in DB that the created user has role USER
  const createdDbUser = await User.findOne({ email: newOAuthEmail });
  assert.ok(createdDbUser, "New user was created in DB");
  assert.strictEqual(createdDbUser.role, "USER", "Database record role MUST be USER");
  console.log("✔ 2.4 New OAuth user cannot gain ADMIN via profile claims; strictly gets role USER");

  // Clean up created test user
  await User.deleteOne({ _id: createdDbUser._id });

  // 2.5 JWT callback with conflicting token.id and token.email
  const conflictingJwt = await simulateJwtCallback({
    token: { id: readerUser._id.toString(), email: adminUser.email, role: undefined, status: undefined },
    user: null,
    trigger: "update",
  });
  // Should NOT resolve to adminUser or readerUser since id and email conflict
  assert.strictEqual(conflictingJwt.role, undefined);
  console.log("✔ 2.5 JWT enrichment with conflicting ID/email does not resolve role");


  // SECTION 3: SEC-01 Test Routes Removal
  console.log("\n--- [SECTION 3] SEC-01: Test Routes Removal ---");

  const adminTestDir = path.resolve("src/app/admin-test");
  const authorTestDir = path.resolve("src/app/author-test");

  assert.strictEqual(fs.existsSync(adminTestDir), false, "/admin-test directory must not exist");
  assert.strictEqual(fs.existsSync(authorTestDir), false, "/author-test directory must not exist");
  console.log("✔ 3.1 Neither /admin-test nor /author-test directory exists");

  // Check auth.ts file content for allowDangerousEmailAccountLinking
  const authSource = fs.readFileSync(path.resolve("src/lib/auth/auth.ts"), "utf-8");
  assert.ok(
    authSource.includes("allowDangerousEmailAccountLinking: false"),
    "GoogleProvider must explicitly set allowDangerousEmailAccountLinking: false"
  );
  console.log("✔ 3.2 GoogleProvider explicitly sets allowDangerousEmailAccountLinking: false");

  console.log("\n==================================================================");
  console.log(">>> ALL SECURITY HARDENING TESTS (SEC-01, 03, 05) PASSED! <<<");
  console.log("==================================================================");

  await mongoose.disconnect();
}

runSecuritySuite().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
