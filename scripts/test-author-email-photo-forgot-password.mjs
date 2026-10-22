/**
 * Comprehensive Automated Tests for:
 * 1. Author Email Update & Verification Flow
 * 2. Author Profile Photo Selection (Device Gallery) & Persistence
 * 3. Login Page Forgot Password & Secure Reset Password Flow
 * 4. OAuth and Role Preservation
 */

import assert from "node:assert";
import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_ENV = "test";

import { connectToDatabase as dbConnect } from "../src/lib/db/mongoose.ts";
import UserModule from "../src/models/User.ts";
const User = UserModule.default || UserModule;
import AuthorModule from "../src/models/Author.ts";
const Author = AuthorModule.default || AuthorModule;
import VerificationTokenModule from "../src/models/VerificationToken.ts";
const VerificationToken = VerificationTokenModule.default || VerificationTokenModule;
import { hashPassword, verifyPassword } from "../src/lib/auth/password.ts";
import {
  requestAuthorEmailChangeAction,
  cancelAuthorEmailChangeAction,
  verifyEmailAction,
} from "../src/actions/author-email.ts";
import { updateAuthorProfileAction } from "../src/actions/author-finance.ts";
import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "../src/actions/password-reset.ts";

async function runTests() {
  console.log("=================================================");
  console.log("Starting Ebook Platform Feature Tests...");
  console.log("=================================================\n");

  await dbConnect();

  const testSuffix = Date.now() + "_" + Math.floor(Math.random() * 10000);
  const authorEmail = `test_author_${testSuffix}@example.com`;
  const otherUserEmail = `other_user_${testSuffix}@example.com`;
  const oauthAuthorEmail = `oauth_author_${testSuffix}@example.com`;
  const initialPassword = "InitialPassword123!";

  let testAuthorUser = null;
  let testAuthorDoc = null;
  let otherUser = null;
  let oauthUser = null;
  let oauthAuthorDoc = null;
  const createdUploadPaths = [];

  try {
    // -----------------------------------------------------------------------
    // Setup Fixtures
    // -----------------------------------------------------------------------
    console.log("--- Setting up test fixtures ---");

    const passwordHash = await hashPassword(initialPassword);

    // 1. Author with Credentials
    testAuthorUser = await User.create({
      name: "প্রফেসর ডেমো লেখক",
      email: authorEmail,
      passwordHash,
      role: "AUTHOR",
      status: "ACTIVE",
    });

    testAuthorDoc = await Author.create({
      user: testAuthorUser._id,
      penName: "প্রফেসর ডেমো লেখক",
      slug: `demo-author-${testSuffix}`,
      bio: "পরীক্ষামূলক লেখক পরিচিতি",
      profileImage: null,
      status: "ACTIVE",
    });

    // 2. Another User (for duplicate conflict tests)
    otherUser = await User.create({
      name: "অন্য পাঠক",
      email: otherUserEmail,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
    });

    // 3. Google OAuth Author (passwordHash: null)
    oauthUser = await User.create({
      name: "গুগল লেখক",
      email: oauthAuthorEmail,
      passwordHash: null,
      role: "AUTHOR",
      status: "ACTIVE",
    });

    oauthAuthorDoc = await Author.create({
      user: oauthUser._id,
      penName: "গুগল লেখক",
      slug: `google-author-${testSuffix}`,
      bio: "গুগল প্রোফাইল",
      profileImage: "https://lh3.googleusercontent.com/avatar123",
      status: "ACTIVE",
    });

    console.log("Test fixtures created successfully.\n");

    // =======================================================================
    // FEATURE 1: Author Profile Email Update
    // =======================================================================
    console.log(">>> FEATURE 1: Author Email Update Tests <<<");

    // Case 1: Rejects email change for Google OAuth user (protects OAuth identity)
    globalThis.__TEST_SESSION_USER__ = {
      id: oauthUser._id.toString(),
      name: oauthUser.name,
      email: oauthUser.email,
      role: "AUTHOR",
      status: "ACTIVE",
      image: oauthUser.image ?? null,
    };

    const oauthFormData = new FormData();
    oauthFormData.set("newEmail", `new_${testSuffix}@example.com`);
    const oauthResult = await requestAuthorEmailChangeAction(null, oauthFormData);
    assert.strictEqual(
      oauthResult.success,
      false,
      "Expected OAuth-only account email change to be rejected"
    );
    assert(
      oauthResult.error?.includes("গুগল"),
      `Expected Bengali OAuth error message, got: ${oauthResult.error}`
    );
    console.log("✔ Case 1 Passed: Safely rejected email change on Google OAuth account to protect identity.");

    // Switch session to credentials Author
    globalThis.__TEST_SESSION_USER__ = {
      id: testAuthorUser._id.toString(),
      name: testAuthorUser.name,
      email: testAuthorUser.email,
      role: "AUTHOR",
      status: "ACTIVE",
      image: null,
    };

    // Case 2: Rejects invalid email format
    const invalidEmailFormData = new FormData();
    invalidEmailFormData.set("newEmail", "not-a-valid-email");
    const invalidEmailRes = await requestAuthorEmailChangeAction(null, invalidEmailFormData);
    assert.strictEqual(invalidEmailRes.success, false, "Expected invalid email to fail");
    console.log("✔ Case 2 Passed: Rejected invalid email format.");

    // Case 3: Rejects duplicate email already used by another account
    const dupFormData = new FormData();
    dupFormData.set("newEmail", otherUserEmail);
    const dupRes = await requestAuthorEmailChangeAction(null, dupFormData);
    assert.strictEqual(dupRes.success, false, "Expected duplicate email to fail");
    assert(
      dupRes.error?.includes("ইতোমধ্যে অন্য একটি অ্যাকাউন্টে ব্যবহৃত"),
      `Expected duplicate email error, got: ${dupRes.error}`
    );
    console.log("✔ Case 3 Passed: Rejected duplicate email belonging to another account.");

    // Case 4: Rejects changing to the same email
    const sameEmailFormData = new FormData();
    sameEmailFormData.set("newEmail", authorEmail);
    const sameEmailRes = await requestAuthorEmailChangeAction(null, sameEmailFormData);
    assert.strictEqual(sameEmailRes.success, false, "Expected same email to fail");
    console.log("✔ Case 4 Passed: Rejected request when new email is identical to current email.");

    // Case 5: Successful email change request creates verification token and preserves old email
    const newTargetEmail = `verified_new_${testSuffix}@example.com`;
    const validEmailFormData = new FormData();
    validEmailFormData.set("newEmail", newTargetEmail);

    const emailReqRes = await requestAuthorEmailChangeAction(null, validEmailFormData);
    assert.strictEqual(emailReqRes.success, true, `Expected success, got: ${emailReqRes.error}`);

    // Check DB: verification token was created with SHA-256 hash
    const tokenRecord = await VerificationToken.findOne({
      userId: testAuthorUser._id,
      email: newTargetEmail,
      type: "EMAIL_VERIFICATION",
    });
    assert(tokenRecord, "VerificationToken document should exist in DB");
    assert(tokenRecord.tokenHash, "Token hash should be stored in DB");
    assert(tokenRecord.expiresAt > new Date(), "Token expiration should be in future");

    // Critical check: old email must remain active until verification!
    const authorUserRefetched = await User.findById(testAuthorUser._id);
    assert.strictEqual(
      authorUserRefetched.email,
      authorEmail,
      "Author active email MUST remain old email until verified"
    );
    console.log("✔ Case 5 Passed: Verification token created; active email safely preserved.");

    // Case 6: Cancellation of pending email request
    const cancelRes = await cancelAuthorEmailChangeAction();
    assert.strictEqual(cancelRes.success, true, "Cancel request should succeed");
    const countAfterCancel = await VerificationToken.countDocuments({
      userId: testAuthorUser._id,
      type: "EMAIL_VERIFICATION",
    });
    assert.strictEqual(countAfterCancel, 0, "Pending token should be deleted after cancellation");
    console.log("✔ Case 6 Passed: Pending email change request successfully cancelled.");

    // Re-create request for verification tests
    await requestAuthorEmailChangeAction(null, validEmailFormData);

    // Case 7: Rejects invalid or fake verification token
    const fakeVerifyRes = await verifyEmailAction("invalid-token-12345");
    assert.strictEqual(fakeVerifyRes.success, false, "Invalid token must be rejected");
    console.log("✔ Case 7 Passed: Rejected invalid verification token.");

    // Case 8: Rejects expired token
    const expiredRawToken = "expired_raw_token_value_xyz";
    const expiredHash = crypto.createHash("sha256").update(expiredRawToken).digest("hex");
    await VerificationToken.create({
      userId: testAuthorUser._id,
      email: `expired_${testSuffix}@example.com`,
      tokenHash: expiredHash,
      type: "EMAIL_VERIFICATION",
      expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
    });
    const expiredVerifyRes = await verifyEmailAction(expiredRawToken);
    assert.strictEqual(expiredVerifyRes.success, false, "Expired token must be rejected");
    assert(
      expiredVerifyRes.error?.includes("মেয়াদ শেষ"),
      `Expected expired token message, got: ${expiredVerifyRes.error}`
    );
    console.log("✔ Case 8 Passed: Rejected expired verification token.");

    // Case 9: Successful email verification with valid token
    // We cannot read raw token from DB (it is hashed), so let's simulate with a known raw token
    const validRawToken = "valid_test_token_" + testSuffix;
    const validHash = crypto.createHash("sha256").update(validRawToken).digest("hex");
    await VerificationToken.deleteMany({ userId: testAuthorUser._id, type: "EMAIL_VERIFICATION" });
    await VerificationToken.create({
      userId: testAuthorUser._id,
      email: newTargetEmail,
      tokenHash: validHash,
      type: "EMAIL_VERIFICATION",
      expiresAt: new Date(Date.now() + 86400000),
    });

    const verifySuccessRes = await verifyEmailAction(validRawToken);
    assert.strictEqual(verifySuccessRes.success, true, `Verification should succeed, got: ${verifySuccessRes.error}`);
    assert.strictEqual(verifySuccessRes.newEmail, newTargetEmail);

    const verifiedUser = await User.findById(testAuthorUser._id);
    assert.strictEqual(verifiedUser.email, newTargetEmail, "User email should now be updated to new target email");
    assert.strictEqual(verifiedUser.role, "AUTHOR", "User role MUST remain AUTHOR");

    // Verify author profile is untouched
    const verifiedAuthor = await Author.findById(testAuthorDoc._id);
    assert.strictEqual(verifiedAuthor.penName, "প্রফেসর ডেমো লেখক");
    console.log("✔ Case 9 Passed: Valid token verified; active email updated; author role intact.");

    // Case 10: Single-use enforcement (reusing same token must fail)
    const reuseVerifyRes = await verifyEmailAction(validRawToken);
    assert.strictEqual(reuseVerifyRes.success, false, "Reused token must be rejected");
    console.log("✔ Case 10 Passed: Single-use token enforcement succeeded.\n");

    // =======================================================================
    // FEATURE 2: Author Profile Photo from Device Gallery
    // =======================================================================
    console.log(">>> FEATURE 2: Author Profile Photo Tests <<<");

    // Case 11: Server-side validation: reject oversized image file (> 3MB)
    const oversizedBlob = new Blob([new Uint8Array(4 * 1024 * 1024)], { type: "image/png" });
    const oversizedFile = new File([oversizedBlob], "large.png", { type: "image/png" });
    const oversizedFormData = new FormData();
    oversizedFormData.set("penName", "প্রফেসর ডেমো লেখক");
    oversizedFormData.set("avatarFile", oversizedFile);

    const oversizeRes = await updateAuthorProfileAction(null, oversizedFormData);
    assert.strictEqual(oversizeRes.success, false, "Expected oversized file to be rejected");
    assert(oversizeRes.error?.includes("সর্বোচ্চ ৩ মেগাবাইট"), `Expected size error, got: ${oversizeRes.error}`);
    console.log("✔ Case 11 Passed: Rejected file exceeding 3MB limit.");

    // Case 12: Server-side validation: reject unsupported MIME type
    const pdfBlob = new Blob([new Uint8Array(1024)], { type: "application/pdf" });
    const pdfFile = new File([pdfBlob], "doc.pdf", { type: "application/pdf" });
    const pdfFormData = new FormData();
    pdfFormData.set("penName", "প্রফেসর ডেমো লেখক");
    pdfFormData.set("avatarFile", pdfFile);

    const pdfRes = await updateAuthorProfileAction(null, pdfFormData);
    assert.strictEqual(pdfRes.success, false, "Expected unsupported MIME type to be rejected");
    assert(pdfRes.error?.includes("শুধুমাত্র JPEG, PNG অথবা WebP"), `Expected MIME error, got: ${pdfRes.error}`);
    console.log("✔ Case 12 Passed: Rejected invalid MIME type.");

    // Case 13: Server-side validation: reject fake file with invalid magic bytes
    const fakePngBlob = new Blob([Buffer.from("NOT_A_PNG_FILE_JUST_TEXT")], { type: "image/png" });
    const fakePngFile = new File([fakePngBlob], "fake.png", { type: "image/png" });
    const fakeFormData = new FormData();
    fakeFormData.set("penName", "প্রফেসর ডেমো লেখক");
    fakeFormData.set("avatarFile", fakePngFile);

    const fakeRes = await updateAuthorProfileAction(null, fakeFormData);
    assert.strictEqual(fakeRes.success, false, "Expected corrupt file to be rejected");
    assert(fakeRes.error?.includes("অবৈধ অথবা করাপ্টেড"), `Expected magic byte error, got: ${fakeRes.error}`);
    console.log("✔ Case 13 Passed: Rejected file with spoofed extension and invalid magic bytes.");

    // Case 14: Successful upload with valid PNG image buffer
    // Construct minimal valid 1x1 PNG image buffer
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR header
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND
      0x42, 0x60, 0x82,
    ]);

    const validBlob = new Blob([validPngBuffer], { type: "image/png" });
    const validFile = new File([validBlob], "valid_avatar.png", { type: "image/png" });
    const validUploadFormData = new FormData();
    validUploadFormData.set("penName", "প্রফেসর ডেমো লেখক");
    validUploadFormData.set("bio", "আপডেটেড লেখক পরিচিতি");
    validUploadFormData.set("avatarFile", validFile);

    const uploadRes = await updateAuthorProfileAction(null, validUploadFormData);
    assert.strictEqual(uploadRes.success, true, `Upload failed: ${uploadRes.error}`);

    // Verify DB persistence
    const authorAfterUpload = await Author.findById(testAuthorDoc._id);
    const userAfterUpload = await User.findById(testAuthorUser._id);

    assert(authorAfterUpload.profileImage, "Author.profileImage must be set");
    assert(
      authorAfterUpload.profileImage.startsWith("/uploads/avatars/"),
      `Expected local path, got: ${authorAfterUpload.profileImage}`
    );
    assert.strictEqual(
      userAfterUpload.image,
      authorAfterUpload.profileImage,
      "User.image must be synchronized with Author.profileImage"
    );

    // Verify file actually exists on filesystem
    const diskPath = path.join(process.cwd(), "public", authorAfterUpload.profileImage);
    const fileStat = await fs.stat(diskPath);
    assert(fileStat.size > 0, "Uploaded file must exist on disk with positive size");
    createdUploadPaths.push(diskPath);

    console.log("✔ Case 14 Passed: Valid gallery photo successfully uploaded, persisted in Author & User, and verified on disk.");

    // Case 15: Remove photo cleanly
    const removeFormData = new FormData();
    removeFormData.set("penName", "প্রফেসর ডেমো লেখক");
    removeFormData.set("removeImage", "true");

    const removeRes = await updateAuthorProfileAction(null, removeFormData);
    assert.strictEqual(removeRes.success, true, `Remove failed: ${removeRes.error}`);

    const authorAfterRemove = await Author.findById(testAuthorDoc._id);
    const userAfterRemove = await User.findById(testAuthorUser._id);
    assert.strictEqual(authorAfterRemove.profileImage, null, "Author.profileImage should be null");
    assert.strictEqual(userAfterRemove.image, null, "User.image should be null");
    console.log("✔ Case 15 Passed: Removed photo cleanly from Author and User.\n");

    // =======================================================================
    // FEATURE 3: Login Page: Forgot Password & Reset Password Flow
    // =======================================================================
    console.log(">>> FEATURE 3: Forgot Password & Reset Password Tests <<<");

    // Case 16: Request for non-existent email returns generic success message (no enumeration)
    const nonExistentEmail = `nonexistent_${testSuffix}@example.com`;
    const nonExistentFormData = new FormData();
    nonExistentFormData.set("email", nonExistentEmail);

    const nonExistentRes = await requestPasswordResetAction(null, nonExistentFormData);
    assert.strictEqual(nonExistentRes.success, true, "Generic response should always report success");
    assert(
      nonExistentRes.message?.includes("যদি এই ইমেইলটি"),
      "Message must be generic without revealing email presence"
    );
    const noToken = await VerificationToken.findOne({ email: nonExistentEmail });
    assert.strictEqual(noToken, null, "No token should be created for non-existent email");
    console.log("✔ Case 16 Passed: Generic response returned for non-existent email (prevents enumeration).");

    // Case 17: Request for existing email creates single-use token hash and returns generic message
    const forgotFormData = new FormData();
    forgotFormData.set("email", newTargetEmail); // Active email of testAuthorUser

    const forgotRes = await requestPasswordResetAction(null, forgotFormData);
    assert.strictEqual(forgotRes.success, true, "Forgot request should succeed");
    assert(
      forgotRes.message?.includes("যদি এই ইমেইলটি"),
      "Message must be generic without revealing email presence"
    );

    const resetTokenDoc = await VerificationToken.findOne({
      userId: testAuthorUser._id,
      type: "PASSWORD_RESET",
    });
    assert(resetTokenDoc, "Password reset token should exist in DB");
    assert(resetTokenDoc.tokenHash, "Only token hash must be stored in DB");
    assert.strictEqual(resetTokenDoc.usedAt, null, "Token must be unused initially");
    console.log("✔ Case 17 Passed: Valid forgot request created cryptographic token hash in DB.");

    // Case 18: Reset with invalid token fails
    const invalidResetFormData = new FormData();
    invalidResetFormData.set("token", "bogus_reset_token");
    invalidResetFormData.set("newPassword", "BrandNewPassword123!");
    invalidResetFormData.set("confirmPassword", "BrandNewPassword123!");

    const invalidResetRes = await resetPasswordAction(null, invalidResetFormData);
    assert.strictEqual(invalidResetRes.success, false, "Invalid token reset must fail");
    console.log("✔ Case 18 Passed: Reset with invalid token rejected.");

    // Case 19: Reset with mismatched password fails
    const mismatchFormData = new FormData();
    mismatchFormData.set("token", "some_token");
    mismatchFormData.set("newPassword", "BrandNewPassword123!");
    mismatchFormData.set("confirmPassword", "MismatchedPassword999!");

    const mismatchRes = await resetPasswordAction(null, mismatchFormData);
    assert.strictEqual(mismatchRes.success, false, "Mismatched password must fail");
    assert(mismatchRes.error?.includes("একই হতে হবে"), `Expected mismatch error, got: ${mismatchRes.error}`);
    console.log("✔ Case 19 Passed: Mismatched password rejected.");

    // Case 20: Reset with password under 8 characters fails
    const shortPwdFormData = new FormData();
    shortPwdFormData.set("token", "some_token");
    shortPwdFormData.set("newPassword", "123");
    shortPwdFormData.set("confirmPassword", "123");

    const shortPwdRes = await resetPasswordAction(null, shortPwdFormData);
    assert.strictEqual(shortPwdRes.success, false, "Short password must fail");
    assert(shortPwdRes.error?.includes("কমপক্ষে ৮ অক্ষর"), `Expected length error, got: ${shortPwdRes.error}`);
    console.log("✔ Case 20 Passed: Password shorter than 8 characters rejected.");

    // Case 21: Successful password reset with valid token
    const testRawResetToken = "raw_reset_token_" + testSuffix;
    const testResetTokenHash = crypto.createHash("sha256").update(testRawResetToken).digest("hex");
    await VerificationToken.deleteMany({ userId: testAuthorUser._id, type: "PASSWORD_RESET" });
    await VerificationToken.create({
      userId: testAuthorUser._id,
      email: newTargetEmail,
      tokenHash: testResetTokenHash,
      type: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + 3600000), // 1 hour validity
    });

    const newSecurePassword = "MyBrandNewPassword456!";
    const validResetFormData = new FormData();
    validResetFormData.set("token", testRawResetToken);
    validResetFormData.set("newPassword", newSecurePassword);
    validResetFormData.set("confirmPassword", newSecurePassword);

    const validResetRes = await resetPasswordAction(null, validResetFormData);
    assert.strictEqual(validResetRes.success, true, `Reset failed: ${validResetRes.error}`);

    // Verify DB update
    const userAfterReset = await User.findById(testAuthorUser._id);
    assert(userAfterReset.passwordHash, "passwordHash must be present");
    assert.notStrictEqual(
      userAfterReset.passwordHash,
      passwordHash,
      "Password hash must be changed from original"
    );

    // Verify user role & status are preserved
    assert.strictEqual(userAfterReset.role, "AUTHOR", "User role must remain AUTHOR");
    assert.strictEqual(userAfterReset.status, "ACTIVE", "User status must remain ACTIVE");

    // Verify credential verification: new password works, old password fails
    const isNewValid = await verifyPassword(newSecurePassword, userAfterReset.passwordHash);
    assert.strictEqual(isNewValid, true, "New password must verify successfully");

    const isOldValid = await verifyPassword(initialPassword, userAfterReset.passwordHash);
    assert.strictEqual(isOldValid, false, "Old password must NO LONGER verify");

    console.log("✔ Case 21 Passed: Password successfully reset and verified with bcryptjs; old password invalidated.");

    // Case 22: Single-use enforcement (reusing same reset token fails)
    const reuseResetRes = await resetPasswordAction(null, validResetFormData);
    assert.strictEqual(reuseResetRes.success, false, "Reused reset token must fail");
    console.log("✔ Case 22 Passed: Single-use reset token enforcement succeeded.\n");

    // =======================================================================
    // REGRESSION & OAUTH TESTS
    // =======================================================================
    console.log(">>> REGRESSION & OAUTH TESTS <<<");

    // Case 23: Google OAuth account status and role unchanged
    const oauthUserRefetched = await User.findById(oauthUser._id);
    assert.strictEqual(oauthUserRefetched.role, "AUTHOR");
    assert.strictEqual(oauthUserRefetched.passwordHash, null);
    assert.strictEqual(oauthUserRefetched.status, "ACTIVE");

    const oauthAuthorRefetched = await Author.findById(oauthAuthorDoc._id);
    assert.strictEqual(oauthAuthorRefetched.profileImage, "https://lh3.googleusercontent.com/avatar123");
    console.log("✔ Case 23 Passed: Google OAuth account, role, and external profile image completely intact.");

    console.log("\n=================================================");
    console.log("ALL 23 TESTS PASSED SUCCESSFULLY! 🚀");
    console.log("=================================================");
  } finally {
    // -----------------------------------------------------------------------
    // Cleanup Test Data
    // -----------------------------------------------------------------------
    console.log("\n--- Cleaning up test fixtures ---");
    if (testAuthorUser) await User.deleteOne({ _id: testAuthorUser._id });
    if (testAuthorDoc) await Author.deleteOne({ _id: testAuthorDoc._id });
    if (otherUser) await User.deleteOne({ _id: otherUser._id });
    if (oauthUser) await User.deleteOne({ _id: oauthUser._id });
    if (oauthAuthorDoc) await Author.deleteOne({ _id: oauthAuthorDoc._id });
    await VerificationToken.deleteMany({
      email: { $regex: testSuffix },
    });

    // Cleanup uploaded files
    for (const filePath of createdUploadPaths) {
      try {
        await fs.unlink(filePath);
      } catch {}
    }

    delete globalThis.__TEST_SESSION_USER__;
    await mongoose.disconnect();
    console.log("Cleanup complete.");
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
