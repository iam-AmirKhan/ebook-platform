/**
 * Focused test suite for BLOCKER-04: Remove Hardcoded Payment Account Fallbacks
 *
 * Verifies that:
 * 1. Empty/uninitialized settings return both payment methods disabled and empty account numbers.
 * 2. The previously hardcoded personal numbers are absent from public checkout settings and fallback source configuration.
 * 3. Valid admin-configured numbers are returned correctly when their payment methods are enabled.
 * 4. An intentionally empty account number remains empty and cannot activate that payment method.
 * 5. Public settings never expose commission percentage or internal metadata.
 * 6. Existing checkout consumers remain compatible with the unchanged public response shape.
 */

import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

// Ensure test environment is active
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/mock-in-memory-db";

// Import PlatformSettings model first
const PlatformSettingsModule = await import("../src/models/PlatformSettings.ts");
const PlatformSettings = PlatformSettingsModule.default || PlatformSettingsModule;

// Setup in-memory mock connection cache so dbConnect resolves immediately
global.mongooseCache = {
  conn: mongoose,
  promise: Promise.resolve(mongoose),
};
mongoose.connect = async () => mongoose;

const {
  getPlatformSettings,
  getPublicPaymentSettings,
  DEFAULT_SETTINGS,
} = await import("../src/lib/data/platform-settings.ts");

const PREVIOUS_HARDCODED_BKASH = "01813453346";
const PREVIOUS_HARDCODED_NAGAD = "01312027483";

test.describe("BLOCKER-04: Remove Hardcoded Payment Account Fallbacks", () => {
  let mockDoc = null;

  test.beforeEach(() => {
    mockDoc = null;

    // Stub PlatformSettings.findOne
    PlatformSettings.findOne = () => ({
      lean: async () => (mockDoc ? JSON.parse(JSON.stringify(mockDoc)) : null),
    });

    // Stub PlatformSettings.create
    PlatformSettings.create = async (docData) => {
      mockDoc = {
        _id: new mongoose.Types.ObjectId("650000000000000000000099"),
        ...docData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return {
        toObject: () => JSON.parse(JSON.stringify(mockDoc)),
      };
    };
  });

  test("1. Empty/uninitialized settings return both payment methods disabled and empty account numbers", async () => {
    // Database has zero documents (mockDoc = null)
    const publicSettings = await getPublicPaymentSettings();

    assert.strictEqual(publicSettings.bkashEnabled, false);
    assert.strictEqual(publicSettings.nagadEnabled, false);
    assert.strictEqual(publicSettings.bkashAccountNumber, "");
    assert.strictEqual(publicSettings.nagadAccountNumber, "");
    assert.ok(typeof publicSettings.bkashInstructions === "string");
    assert.ok(typeof publicSettings.nagadInstructions === "string");

    // Also verify admin platform settings
    const adminSettings = await getPlatformSettings();
    assert.strictEqual(adminSettings.bkashEnabled, false);
    assert.strictEqual(adminSettings.nagadEnabled, false);
    assert.strictEqual(adminSettings.bkashAccountNumber, "");
    assert.strictEqual(adminSettings.nagadAccountNumber, "");
    assert.strictEqual(adminSettings.commissionPercent, 30);
  });

  test("2. The previously hardcoded personal numbers are absent from public checkout settings and fallback source configuration", async () => {
    // Verify DEFAULT_SETTINGS source configuration
    assert.strictEqual(DEFAULT_SETTINGS.bkashAccountNumber, "");
    assert.strictEqual(DEFAULT_SETTINGS.nagadAccountNumber, "");
    assert.strictEqual(DEFAULT_SETTINGS.bkashEnabled, false);
    assert.strictEqual(DEFAULT_SETTINGS.nagadEnabled, false);

    assert.notStrictEqual(DEFAULT_SETTINGS.bkashAccountNumber, PREVIOUS_HARDCODED_BKASH);
    assert.notStrictEqual(DEFAULT_SETTINGS.nagadAccountNumber, PREVIOUS_HARDCODED_NAGAD);

    // Verify public settings from uninitialized state
    const publicSettings = await getPublicPaymentSettings();
    assert.notStrictEqual(publicSettings.bkashAccountNumber, PREVIOUS_HARDCODED_BKASH);
    assert.notStrictEqual(publicSettings.nagadAccountNumber, PREVIOUS_HARDCODED_NAGAD);

    const jsonString = JSON.stringify(publicSettings);
    assert.ok(!jsonString.includes(PREVIOUS_HARDCODED_BKASH));
    assert.ok(!jsonString.includes(PREVIOUS_HARDCODED_NAGAD));
  });

  test("3. Valid admin-configured numbers are returned correctly when their payment methods are enabled", async () => {
    mockDoc = {
      _id: new mongoose.Types.ObjectId("650000000000000000000099"),
      commissionPercent: 25,
      bkashEnabled: true,
      nagadEnabled: true,
      bkashAccountNumber: "01700000001",
      nagadAccountNumber: "01800000002",
      bkashInstructions: "Custom bKash instructions",
      nagadInstructions: "Custom Nagad instructions",
      updatedAt: new Date("2026-10-21T10:00:00Z"),
    };

    const publicSettings = await getPublicPaymentSettings();
    assert.strictEqual(publicSettings.bkashEnabled, true);
    assert.strictEqual(publicSettings.nagadEnabled, true);
    assert.strictEqual(publicSettings.bkashAccountNumber, "01700000001");
    assert.strictEqual(publicSettings.nagadAccountNumber, "01800000002");
    assert.strictEqual(publicSettings.bkashInstructions, "Custom bKash instructions");
    assert.strictEqual(publicSettings.nagadInstructions, "Custom Nagad instructions");

    const adminSettings = await getPlatformSettings();
    assert.strictEqual(adminSettings.commissionPercent, 25);
    assert.strictEqual(adminSettings.bkashAccountNumber, "01700000001");
  });

  test("4. An intentionally empty account number remains empty and cannot activate that payment method", async () => {
    // Admin toggled bkashEnabled: true, but left or cleared the account number to ""
    mockDoc = {
      _id: new mongoose.Types.ObjectId("650000000000000000000099"),
      commissionPercent: 30,
      bkashEnabled: true, // <-- Toggled ON in DB
      nagadEnabled: false,
      bkashAccountNumber: "", // <-- Empty string
      nagadAccountNumber: "   ", // <-- Whitespace string
      bkashInstructions: "Instructions",
      nagadInstructions: "Instructions",
      updatedAt: new Date(),
    };

    const publicSettings = await getPublicPaymentSettings();
    // Payment method must NOT be active when account number is empty
    assert.strictEqual(publicSettings.bkashEnabled, false);
    assert.strictEqual(publicSettings.nagadEnabled, false);
    assert.strictEqual(publicSettings.bkashAccountNumber, "");
    assert.strictEqual(publicSettings.nagadAccountNumber, "");

    // Must NOT fall back to old hardcoded numbers
    assert.notStrictEqual(publicSettings.bkashAccountNumber, PREVIOUS_HARDCODED_BKASH);
    assert.notStrictEqual(publicSettings.nagadAccountNumber, PREVIOUS_HARDCODED_NAGAD);
  });

  test("5. Public settings never expose commission percentage or internal metadata", async () => {
    mockDoc = {
      _id: new mongoose.Types.ObjectId("650000000000000000000099"),
      commissionPercent: 40,
      bkashEnabled: true,
      nagadEnabled: true,
      bkashAccountNumber: "01711111111",
      nagadAccountNumber: "01722222222",
      bkashInstructions: "Instructions",
      nagadInstructions: "Instructions",
      updatedAt: new Date("2026-10-21T10:00:00Z"),
    };

    const publicSettings = await getPublicPaymentSettings();
    const publicKeys = Object.keys(publicSettings);

    // Expected public fields only
    const expectedKeys = [
      "bkashEnabled",
      "nagadEnabled",
      "bkashAccountNumber",
      "nagadAccountNumber",
      "bkashInstructions",
      "nagadInstructions",
    ];

    assert.deepStrictEqual(publicKeys.sort(), expectedKeys.sort());

    // Strict non-exposure checks
    assert.strictEqual("commissionPercent" in publicSettings, false);
    assert.strictEqual("_id" in publicSettings, false);
    assert.strictEqual("updatedAt" in publicSettings, false);
    assert.strictEqual((publicSettings).commissionPercent, undefined);
  });

  test("6. Existing checkout consumers remain compatible with the unchanged public response shape", async () => {
    // Both CheckoutForm and MultiBookCheckoutForm rely on these exact properties
    const publicSettings = await getPublicPaymentSettings();

    assert.ok(typeof publicSettings.bkashEnabled === "boolean");
    assert.ok(typeof publicSettings.nagadEnabled === "boolean");
    assert.ok(typeof publicSettings.bkashAccountNumber === "string");
    assert.ok(typeof publicSettings.nagadAccountNumber === "string");
    assert.ok(typeof publicSettings.bkashInstructions === "string");
    assert.ok(typeof publicSettings.nagadInstructions === "string");

    // Checkout form logic test: when both disabled, checkout properly determines neither is available
    const hasBkash = publicSettings.bkashEnabled;
    const hasNagad = publicSettings.nagadEnabled;
    const defaultMethod = hasBkash ? "BKASH" : hasNagad ? "NAGAD" : null;

    assert.strictEqual(defaultMethod, null);
    assert.strictEqual(!hasBkash && !hasNagad, true);
  });
});
