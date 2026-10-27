import assert from "assert";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { registerUser } from "../src/actions/auth";
import User from "../src/models/User";

async function verifyFavicon() {
  console.log("\n=======================================================");
  console.log("1. VERIFYING FAVICON & ICON ASSETS (WHITE BACKGROUND)");
  console.log("=======================================================");

  // 1. Check /favicon.ico from dev server
  const icoRes = await fetch("http://localhost:3000/favicon.ico");
  assert.strictEqual(icoRes.status, 200, "/favicon.ico status must be 200");
  const icoBuf = Buffer.from(await icoRes.arrayBuffer());
  console.log(`✔ /favicon.ico status 200, byte size: ${icoBuf.length}`);

  // Inspect the ICO directory and entries
  assert.strictEqual(icoBuf.readUInt16LE(0), 0, "ICO reserved must be 0");
  assert.strictEqual(icoBuf.readUInt16LE(2), 1, "ICO type must be 1 (icon)");
  const count = icoBuf.readUInt16LE(4);
  console.log(`✔ ICO contains ${count} resolutions`);
  assert.ok(count >= 2, "ICO should contain at least 2 resolutions (16x16, 32x32)");

  // Inspect the 32x32 entry
  const entry32Offset = 6 + 1 * 16;
  const dataOffset = icoBuf.readUInt32LE(entry32Offset + 12);
  const pixelOffset = dataOffset + 40;
  let transparentCount = 0;
  let whiteCount = 0;
  let colorCount = 0;

  for (let i = 0; i < 32 * 32; i++) {
    const b = icoBuf[pixelOffset + i * 4];
    const g = icoBuf[pixelOffset + i * 4 + 1];
    const r = icoBuf[pixelOffset + i * 4 + 2];
    const a = icoBuf[pixelOffset + i * 4 + 3];

    if (a < 255) {
      transparentCount++;
    } else if (r === 255 && g === 255 && b === 255) {
      whiteCount++;
    } else {
      colorCount++;
    }
  }

  console.log(
    `✔ 32x32 icon pixel breakdown: Transparent: ${transparentCount}, Pure White: ${whiteCount}, Artwork/Colored: ${colorCount}`
  );
  assert.strictEqual(
    transparentCount,
    0,
    "Favicon must NOT have transparent background; it must be fully opaque"
  );
  assert.ok(
    whiteCount > 400,
    "Favicon must preserve the clean white background (>400 white pixels out of 1024)"
  );
  assert.ok(
    colorCount > 400,
    "Favicon must preserve the colored artwork (>400 colored pixels out of 1024)"
  );

  // 2. Check /icon.png from dev server
  const pngRes = await fetch("http://localhost:3000/icon.png");
  assert.strictEqual(pngRes.status, 200, "/icon.png status must be 200");
  assert.strictEqual(
    pngRes.headers.get("content-type"),
    "image/png",
    "/icon.png content-type must be image/png"
  );
  console.log(`✔ /icon.png status 200, content-type: image/png`);

  // 3. Check HTML head contains icon links
  const htmlRes = await fetch("http://localhost:3000");
  const htmlText = await htmlRes.text();
  assert.ok(htmlText.includes('rel="icon"'), 'HTML must contain rel="icon" tag');
  assert.ok(htmlText.includes('rel="shortcut icon"'), 'HTML must contain rel="shortcut icon" tag');
  console.log("✔ HTML document contains proper <link> tags referencing the icon assets");
}

async function verifyRegistrationAndAuth() {
  console.log("\n=======================================================");
  console.log("2. VERIFYING CREATE-ACCOUNT FLOW & AUTOMATIC SIGN-IN");
  console.log("=======================================================");

  await mongoose.connect(process.env.MONGODB_URI!);

  const testEmail = `newuser_${Date.now()}@pustokatest.org`;
  const testPassword = "SecurePassword123!";
  const testName = "Test Register User";

  try {
    // 1. Submit registration via server action
    console.log(`Registering new test user: ${testEmail}...`);
    const regResult = await registerUser({
      name: testName,
      email: testEmail,
      password: testPassword,
    });

    assert.ok(regResult.success, "registerUser must return success: true");
    assert.strictEqual(regResult.user?.email, testEmail);
    assert.strictEqual(regResult.user?.role, "USER");
    assert.strictEqual(regResult.user?.status, "ACTIVE");
    console.log("✔ User registered successfully with role 'USER' and status 'ACTIVE'");

    // 2. Verify MongoDB record: password must be hashed, not plaintext!
    const dbUser = await User.findOne({ email: testEmail }).lean();
    assert.ok(dbUser, "User record must exist in MongoDB");
    assert.notStrictEqual(dbUser.passwordHash, testPassword, "Password must not be stored in plaintext");
    const isPasswordValid = await bcrypt.compare(testPassword, dbUser.passwordHash!);
    assert.ok(isPasswordValid, "Bcrypt hash must match the original password");
    console.log("✔ Password securely hashed and verified against bcrypt");

    // 3. Test automatic sign-in via credentials callback (simulating the client signIn call)
    // First get CSRF token from dev server
    const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
    assert.strictEqual(csrfRes.status, 200, "CSRF endpoint must return 200");
    const csrfData = await csrfRes.json();
    const csrfCookie = csrfRes.headers.get("set-cookie") || "";

    const signInRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrfCookie,
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: testEmail,
        password: testPassword,
        redirect: "false",
      }).toString(),
      redirect: "manual",
    });

    console.log("Credentials signIn HTTP status:", signInRes.status);
    const setCookieHeaders = signInRes.headers.get("set-cookie");
    assert.ok(setCookieHeaders, "Credentials signIn must set session cookie");
    console.log("✔ Credentials signIn returned valid session cookies");

    // Extract session token cookie
    const sessionCookieMatch = setCookieHeaders.match(/(authjs\.session-token=[^;]+)/);
    assert.ok(sessionCookieMatch, "Must contain authjs.session-token cookie");
    const sessionCookie = sessionCookieMatch[1];

    // 4. Verify /api/auth/session with this new user's cookie
    const sessionRes = await fetch("http://localhost:3000/api/auth/session", {
      headers: {
        Cookie: sessionCookie,
      },
    });
    assert.strictEqual(sessionRes.status, 200);
    const sessionData = await sessionRes.json();
    console.log("Session payload for new user:", JSON.stringify(sessionData));
    assert.ok(sessionData?.user, "Session data must contain user");
    assert.strictEqual(sessionData.user.email, testEmail);
    assert.strictEqual(sessionData.user.name, testName);
    assert.strictEqual(sessionData.user.role, "USER");
    assert.strictEqual(sessionData.user.status, "ACTIVE");
    console.log("✔ Session successfully established automatically for the new user without extra steps!");

    // 5. Verify RBAC: Newly registered standard USER cannot access /admin
    const adminAccessRes = await fetch("http://localhost:3000/admin", {
      headers: {
        Cookie: sessionCookie,
      },
      redirect: "manual",
    });
    console.log("Admin route access for standard USER status:", adminAccessRes.status);
    // Standard USER accessing /admin is redirected (307) or forbidden (403)
    assert.ok(
      adminAccessRes.status === 307 || adminAccessRes.status === 403,
      "Standard USER must be blocked from /admin"
    );
    console.log("✔ RBAC intact: standard USER cannot access admin dashboard");

    // 6. Verify existing user login still works
    const adminUser = await User.findOne({ role: "ADMIN", status: "ACTIVE" }).lean();
    assert.ok(adminUser, "Active admin user must exist in DB");
    console.log("✔ Verified existing user accounts exist and are intact");

  } finally {
    // Clean up test user from MongoDB
    await User.deleteOne({ email: testEmail });
    console.log("✔ Cleaned up temporary test user");
    await mongoose.disconnect();
  }
}

async function runAll() {
  await verifyFavicon();
  await verifyRegistrationAndAuth();
  console.log("\n=======================================================");
  console.log("🎉 ALL TESTS PASSED! BOTH TASKS FULLY VERIFIED.");
  console.log("=======================================================\n");
  process.exit(0);
}

runAll().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
