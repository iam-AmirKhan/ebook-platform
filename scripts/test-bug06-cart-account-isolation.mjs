/**
 * Focused test suite for BUG-06: Shopping Cart Account Isolation
 *
 * Verifies that:
 * 1. Two different authenticated users never share cart contents.
 * 2. Signing out does not expose the previous user's cart to the next guest session.
 * 3. Switching accounts does not leak or overwrite another account's cart.
 * 4. Guest cart behavior still works and maintains backward compatibility.
 * 5. Guest-to-login migration follows the explicitly implemented safe policy.
 * 6. Existing cart operations and multi-book checkout remain compatible.
 */

import test from "node:test";
import assert from "node:assert";

// In-memory mock localStorage implementation for Node test environment
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(String(key)) ? this.store.get(String(key)) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockStorage = new MockLocalStorage();
globalThis.localStorage = mockStorage;
globalThis.window = {
  localStorage: mockStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};

// Import cart storage methods from CartContext
const {
  getCartStorageKey,
  loadCartFromStorage,
  saveCartToStorage,
  clearUserCartFromStorage,
  migrateGuestCartToUser,
  GUEST_CART_STORAGE_KEY,
  LEGACY_CART_STORAGE_KEY,
} = await import("../src/context/CartContext.tsx");

// Sample book items for testing
const book1 = {
  bookId: "650000000000000000000001",
  slug: "am-antigravity",
  title: "আমি অ্যান্টিগ্র্যাভিটি",
  price: 250,
  originalPrice: 300,
  coverImage: "https://example.com/cover1.jpg",
  authorName: "মুহাম্মদ জাফর ইকবাল",
  currency: "BDT",
};

const book2 = {
  bookId: "650000000000000000000002",
  slug: "shonku-samagra",
  title: "শঙ্কু সমগ্র",
  price: 450,
  originalPrice: 500,
  coverImage: "https://example.com/cover2.jpg",
  authorName: "সত্যজিৎ রায়",
  currency: "BDT",
};

const book3 = {
  bookId: "650000000000000000000003",
  slug: "feluda-samagra",
  title: "ফেলুদা সমগ্র",
  price: 600,
  originalPrice: 700,
  coverImage: "https://example.com/cover3.jpg",
  authorName: "সত্যজিৎ রায়",
  currency: "BDT",
};

const bookGuestOnly = {
  bookId: "650000000000000000000004",
  slug: "himu-mama",
  title: "হিমুর মধ্যদুপুর",
  price: 180,
  originalPrice: 200,
  coverImage: "https://example.com/cover4.jpg",
  authorName: "হুমায়ূন আহমেদ",
  currency: "BDT",
};

test.describe("BUG-06: Isolate Shopping Carts Between Accounts", () => {
  test.beforeEach(() => {
    mockStorage.clear();
  });

  test("1. Two different authenticated users never share cart contents", () => {
    const userA = "user_alpha_111";
    const userB = "user_beta_222";

    // Verify isolated storage keys
    const keyA = getCartStorageKey(userA);
    const keyB = getCartStorageKey(userB);
    assert.strictEqual(keyA, "pustoka_cart_user_user_alpha_111");
    assert.strictEqual(keyB, "pustoka_cart_user_user_beta_222");
    assert.notStrictEqual(keyA, keyB);

    // User A adds Book 1
    saveCartToStorage(userA, [book1]);

    // User B adds Book 2
    saveCartToStorage(userB, [book2]);

    // Verify User A only sees Book 1
    const cartA = loadCartFromStorage(userA);
    assert.strictEqual(cartA.length, 1);
    assert.strictEqual(cartA[0].bookId, book1.bookId);
    assert.strictEqual(cartA[0].title, book1.title);

    // Verify User B only sees Book 2
    const cartB = loadCartFromStorage(userB);
    assert.strictEqual(cartB.length, 1);
    assert.strictEqual(cartB[0].bookId, book2.bookId);
    assert.strictEqual(cartB[0].title, book2.title);

    // User A clears their cart
    clearUserCartFromStorage(userA);
    assert.strictEqual(loadCartFromStorage(userA).length, 0);

    // User B's cart must remain completely unaffected
    const cartBAfter = loadCartFromStorage(userB);
    assert.strictEqual(cartBAfter.length, 1);
    assert.strictEqual(cartBAfter[0].bookId, book2.bookId);
  });

  test("2. Signing out does not expose the previous user's cart to the next guest session", () => {
    const userA = "user_alpha_111";

    // User A has books in cart
    saveCartToStorage(userA, [book1, book3]);

    // Active session ends (sign out -> activeUserId is null/guest)
    const guestCart = loadCartFromStorage(null);

    // Guest cart MUST be empty
    assert.strictEqual(guestCart.length, 0);

    // User A's cart is still securely stored under User A's key
    const userACart = loadCartFromStorage(userA);
    assert.strictEqual(userACart.length, 2);
    assert.strictEqual(userACart[0].bookId, book1.bookId);
    assert.strictEqual(userACart[1].bookId, book3.bookId);
  });

  test("3. Switching accounts does not leak or overwrite another account's cart", () => {
    const userA = "user_alpha_111";
    const userB = "user_beta_222";

    // User A has [book1, book3]
    saveCartToStorage(userA, [book1, book3]);

    // User B has [book2]
    saveCartToStorage(userB, [book2]);

    // Switch to User B: load User B's cart
    const cartB = loadCartFromStorage(userB);
    assert.strictEqual(cartB.length, 1);
    assert.strictEqual(cartB[0].bookId, book2.bookId);

    // User B modifies their cart: removes book2, adds book1 and bookGuestOnly
    saveCartToStorage(userB, [book1, bookGuestOnly]);
    assert.strictEqual(loadCartFromStorage(userB).length, 2);

    // Switch back to User A: User A's cart must remain unchanged
    const cartA = loadCartFromStorage(userA);
    assert.strictEqual(cartA.length, 2);
    assert.strictEqual(cartA[0].bookId, book1.bookId);
    assert.strictEqual(cartA[1].bookId, book3.bookId);
  });

  test("4. Guest cart behavior still works and maintains backward compatibility", () => {
    // Unauthenticated guest storage key
    const guestKey = getCartStorageKey(null);
    assert.strictEqual(guestKey, GUEST_CART_STORAGE_KEY);

    // Guest adds book
    saveCartToStorage(null, [bookGuestOnly]);
    const guestCart = loadCartFromStorage(null);
    assert.strictEqual(guestCart.length, 1);
    assert.strictEqual(guestCart[0].bookId, bookGuestOnly.bookId);

    // Test backward compatibility: legacy global cart key migration
    mockStorage.clear();
    mockStorage.setItem(LEGACY_CART_STORAGE_KEY, JSON.stringify([book1]));

    // Reading guest cart should automatically migrate legacy items to guest key
    const migratedGuestCart = loadCartFromStorage(null);
    assert.strictEqual(migratedGuestCart.length, 1);
    assert.strictEqual(migratedGuestCart[0].bookId, book1.bookId);

    // Verify legacy key was cleaned up and new guest key is populated
    assert.strictEqual(mockStorage.getItem(LEGACY_CART_STORAGE_KEY), null);
    assert.ok(mockStorage.getItem(GUEST_CART_STORAGE_KEY) !== null);
  });

  test("5. Guest-to-login migration follows the explicitly implemented safe policy", () => {
    const userC = "user_gamma_333";

    // 1. Guest browses as unauthenticated visitor and adds [book1, bookGuestOnly]
    saveCartToStorage(null, [book1, bookGuestOnly]);

    // 2. User C already had [book1, book2] in their user cart from a previous session
    saveCartToStorage(userC, [book1, book2]);

    // 3. Guest signs in as User C -> trigger migration
    const result = migrateGuestCartToUser(userC);
    assert.strictEqual(result.migrated, true);

    // 4. Verify merged items:
    // User C already had book1 and book2. Guest had book1 and bookGuestOnly.
    // Deduplication should ensure book1 is not duplicated.
    const merged = result.items;
    assert.strictEqual(merged.length, 3);
    const bookIds = merged.map((b) => b.bookId);
    assert.ok(bookIds.includes(book1.bookId));
    assert.ok(bookIds.includes(book2.bookId));
    assert.ok(bookIds.includes(bookGuestOnly.bookId));

    // 5. Verify guest cart is cleared so it cannot leak to subsequent visitors
    const guestCartAfterLogin = loadCartFromStorage(null);
    assert.strictEqual(guestCartAfterLogin.length, 0);

    // 6. User C signs out -> guest cart remains clean and empty
    const guestCartAfterLogout = loadCartFromStorage(null);
    assert.strictEqual(guestCartAfterLogout.length, 0);

    // 7. Another guest browsing does not see User C's books
    assert.strictEqual(mockStorage.getItem(GUEST_CART_STORAGE_KEY), null);
  });

  test("6. Existing cart operations and multi-book checkout remain compatible", () => {
    const userCheckout = "user_checkout_444";

    // Multi-book checkout requires items with all CartItem fields
    const multiItems = [book1, book2, book3];
    saveCartToStorage(userCheckout, multiItems);

    const loaded = loadCartFromStorage(userCheckout);
    assert.strictEqual(loaded.length, 3);

    // Verify all CartItem properties expected by MultiBookCheckoutForm
    for (const item of loaded) {
      assert.ok(typeof item.bookId === "string");
      assert.ok(typeof item.slug === "string");
      assert.ok(typeof item.title === "string");
      assert.ok(typeof item.price === "number");
      assert.ok(typeof item.currency === "string");
      assert.ok("coverImage" in item);
      assert.ok("authorName" in item);
    }

    // Verify total calculation matches multi-book checkout expectations
    const total = loaded.reduce((sum, item) => sum + item.price, 0);
    assert.strictEqual(total, 250 + 450 + 600); // 1300 BDT

    // Simulate multi-book checkout completion: clearCart for the buyer
    clearUserCartFromStorage(userCheckout);
    assert.strictEqual(loadCartFromStorage(userCheckout).length, 0);

    // Other users' carts remain untouched
    saveCartToStorage("other_user", [book1]);
    clearUserCartFromStorage(userCheckout);
    assert.strictEqual(loadCartFromStorage("other_user").length, 1);
  });
});
