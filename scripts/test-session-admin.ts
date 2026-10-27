import assert from "assert";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { encode } from "next-auth/jwt";
import mongoose from "mongoose";

async function testSessionEndpoint() {
  console.log("=== VERIFYING /api/auth/session ENDPOINT & ADMIN ACCESS ===");

  await mongoose.connect(process.env.MONGODB_URI!);
  const adminUser = await mongoose.connection
    .collection("users")
    .findOne({ role: "ADMIN", status: "ACTIVE" });

  assert.ok(adminUser, "Active admin user must exist in DB");
  console.log("✔ Found active admin:", adminUser.email, adminUser.name);

  // 1. Unauthenticated request to /api/auth/session -> 200 with JSON null / empty session
  const unauthRes = await fetch("http://localhost:3000/api/auth/session");
  assert.strictEqual(unauthRes.status, 200, "Unauthenticated session status must be 200");
  assert.strictEqual(
    unauthRes.headers.get("content-type"),
    "application/json",
    "Content-Type must be application/json"
  );
  const unauthBody = await unauthRes.json();
  console.log("✔ Unauthenticated session returns JSON:", JSON.stringify(unauthBody));

  // 2. Authenticated admin request using encoded session token
  const token = await encode({
    token: {
      id: adminUser._id.toString(),
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      status: adminUser.status,
      sub: adminUser._id.toString(),
    },
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
  });

  const authRes = await fetch("http://localhost:3000/api/auth/session", {
    headers: {
      Cookie: `authjs.session-token=${token}`,
    },
  });

  assert.strictEqual(authRes.status, 200, "Authenticated session status must be 200");
  assert.strictEqual(
    authRes.headers.get("content-type"),
    "application/json",
    "Content-Type must be application/json"
  );
  const sessionData = await authRes.json();
  console.log("✔ Authenticated session returns JSON:", JSON.stringify(sessionData));
  assert.ok(sessionData?.user, "Session must contain user object");
  assert.strictEqual(sessionData.user.email, adminUser.email, "Session email must match admin");
  assert.strictEqual(sessionData.user.role, "ADMIN", "Session role must be ADMIN");

  // 3. Test Admin Dashboard access with the admin cookie
  const adminPageRes = await fetch("http://localhost:3000/admin", {
    headers: {
      Cookie: `authjs.session-token=${token}`,
    },
    redirect: "manual",
  });
  console.log("Admin Dashboard HTTP status with admin cookie:", adminPageRes.status);
  assert.strictEqual(adminPageRes.status, 200, "Admin page must return 200 for authorized admin");
  const adminHtml = await adminPageRes.text();
  assert.ok(adminHtml.includes("অ্যাডমিন ড্যাশবোর্ড"), "Admin page must render admin dashboard heading");
  console.log("✔ Authorized admin successfully loaded Admin Dashboard (status 200)");

  // 4. Test Unauthenticated access to /admin -> redirected to /login
  const unauthAdminRes = await fetch("http://localhost:3000/admin", {
    redirect: "manual",
  });
  console.log("Unauthenticated access to /admin status:", unauthAdminRes.status);
  assert.strictEqual(unauthAdminRes.status, 307, "Unauthenticated access to /admin must redirect (307)");
  const redirectLocation = unauthAdminRes.headers.get("location");
  assert.ok(redirectLocation?.includes("/login"), "Redirect location must be /login");
  console.log("✔ Unauthenticated access correctly redirected to:", redirectLocation);

  await mongoose.disconnect();
  console.log("\n=======================================================");
  console.log("🎉 ALL AUTH & ADMIN DASHBOARD CHECKS PASSED!");
  console.log("=======================================================\n");
  process.exit(0);
}

testSessionEndpoint().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
