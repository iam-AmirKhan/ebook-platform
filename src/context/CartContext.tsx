"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";
import { getSession } from "next-auth/react";

export interface CartItem {
  bookId: string;
  slug: string;
  title: string;
  price: number;
  originalPrice?: number;
  coverImage: string | null;
  authorName: string;
  currency: string;
}

export interface CartContextType {
  items: CartItem[];
  count: number;
  isLoaded: boolean;
  activeUserId: string | null;
  addItem: (item: CartItem) => {
    success: boolean;
    alreadyInCart?: boolean;
    message: string;
  };
  removeItem: (bookId: string) => void;
  clearCart: () => void;
  isInCart: (bookId: string) => boolean;
}

export interface CartProviderProps {
  children: React.ReactNode;
  userId?: string | null;
  initialUserId?: string | null;
}

export const CART_STORAGE_KEY = "pustoka_cart_v1";
export const LEGACY_CART_STORAGE_KEY = "pustoka_cart_v1";
export const GUEST_CART_STORAGE_KEY = "pustoka_cart_guest_v1";

/**
 * Returns the isolated storage key for a user account or guest session.
 * - Authenticated: `pustoka_cart_user_${userId}`
 * - Guest: `pustoka_cart_guest_v1`
 */
export function getCartStorageKey(userId?: string | null): string {
  if (userId && typeof userId === "string" && userId.trim().length > 0) {
    return `pustoka_cart_user_${userId.trim()}`;
  }
  return GUEST_CART_STORAGE_KEY;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as unknown as { localStorage?: Storage }).localStorage
  ) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return null;
}

function sanitizeCartItems(items: unknown[]): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item): item is CartItem =>
      Boolean(
        item &&
          typeof item === "object" &&
          "bookId" in item &&
          typeof (item as CartItem).bookId === "string" &&
          (item as CartItem).bookId.length > 0 &&
          "title" in item &&
          typeof (item as CartItem).title === "string" &&
          "price" in item &&
          typeof (item as CartItem).price === "number"
      )
  );
}

/**
 * Loads cart items for a specific account or guest session from local storage.
 * Handles legacy cart migration if reading guest cart.
 */
export function loadCartFromStorage(userId?: string | null): CartItem[] {
  const storage = getStorage();
  if (!storage) return [];

  const key = getCartStorageKey(userId);
  try {
    const raw = storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return sanitizeCartItems(parsed);
      }
    }

    // Backward compatibility: If guest cart is empty, check legacy global cart key
    if (!userId) {
      const legacyRaw = storage.getItem(LEGACY_CART_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
          const items = sanitizeCartItems(legacyParsed);
          storage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
          storage.removeItem(LEGACY_CART_STORAGE_KEY);
          return items;
        }
      }
    }
  } catch {
    // Ignore JSON parse or storage errors
  }
  return [];
}

/**
 * Persists cart items for a specific account or guest session to local storage.
 */
export function saveCartToStorage(
  userId: string | null | undefined,
  items: CartItem[]
): void {
  const storage = getStorage();
  if (!storage) return;

  const key = getCartStorageKey(userId);
  try {
    if (items.length === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(items));
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

/**
 * Clears cart for a specific account or guest session.
 */
export function clearUserCartFromStorage(userId?: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  const key = getCartStorageKey(userId);
  try {
    storage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

/**
 * Guest-to-Login Migration Policy:
 * When an unauthenticated guest logs in:
 * 1. Read existing user items from `pustoka_cart_user_${userId}`.
 * 2. Read guest items from `pustoka_cart_guest_v1`.
 * 3. Merge guest items into user cart (deduplicating by `bookId`).
 * 4. Save merged cart under the user's isolated key.
 * 5. Clear guest cart so guest storage is empty for the next visitor/sign-out.
 */
export function migrateGuestCartToUser(userId: string): {
  migrated: boolean;
  items: CartItem[];
} {
  const storage = getStorage();
  if (!storage || !userId || typeof userId !== "string" || userId.trim().length === 0) {
    return { migrated: false, items: loadCartFromStorage(userId) };
  }

  const cleanUserId = userId.trim();
  const guestItems = loadCartFromStorage(null);

  if (guestItems.length === 0) {
    return { migrated: false, items: loadCartFromStorage(cleanUserId) };
  }

  const userItems = loadCartFromStorage(cleanUserId);
  const existingBookIds = new Set(userItems.map((it) => it.bookId));

  const mergedItems = [...userItems];
  for (const guestItem of guestItems) {
    if (!existingBookIds.has(guestItem.bookId)) {
      mergedItems.push(guestItem);
      existingBookIds.add(guestItem.bookId);
    }
  }

  saveCartToStorage(cleanUserId, mergedItems);
  saveCartToStorage(null, []);
  try {
    storage.removeItem(GUEST_CART_STORAGE_KEY);
    storage.removeItem(LEGACY_CART_STORAGE_KEY);
  } catch {
    // Ignore errors
  }

  return { migrated: true, items: mergedItems };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  children,
  userId,
  initialUserId,
}: CartProviderProps) {
  // Client-resolved session user ID (undefined = not resolved yet, null = guest, string = authenticated)
  const [sessionUserId, setSessionUserId] = useState<string | null | undefined>(
    initialUserId !== undefined ? initialUserId : undefined
  );

  // If userId prop is explicitly passed, it takes strict precedence
  const effectiveUserId = userId !== undefined ? userId : sessionUserId;

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Client-side session resolution when userId was not provided via props
  useEffect(() => {
    if (userId !== undefined) return;

    let isCancelled = false;

    async function checkSession() {
      try {
        const session = await getSession();
        if (!isCancelled) {
          const sid = session?.user?.id ? String(session.user.id).trim() : null;
          setSessionUserId(sid);
        }
      } catch {
        if (!isCancelled) {
          setSessionUserId(null);
        }
      }
    }

    if (sessionUserId === undefined) {
      checkSession();
    }

    const handleFocus = () => {
      checkSession();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      isCancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId, sessionUserId]);

  // Load items whenever effectiveUserId is determined or changes
  useEffect(() => {
    if (effectiveUserId === undefined) {
      // Fallback: If session resolution encounters an error or takes too long,
      // never leave dashboard or components stuck loading indefinitely
      const fallbackTimer = setTimeout(() => {
        if (!isLoaded) {
          const loadedItems = loadCartFromStorage(null);
          setItems(loadedItems);
          setIsLoaded(true);
        }
      }, 2000);
      return () => clearTimeout(fallbackTimer);
    }

    const timer = setTimeout(() => {
      if (effectiveUserId) {
        // Authenticated user: apply guest-to-login migration policy
        const { items: loadedItems } = migrateGuestCartToUser(effectiveUserId);
        setItems(loadedItems);
        setIsLoaded(true);
      } else {
        // Guest user: load guest cart
        const loadedItems = loadCartFromStorage(null);
        setItems(loadedItems);
        setIsLoaded(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [effectiveUserId, isLoaded]);

  // Listen for storage events (cross-tab sync) and custom in-tab update events
  useEffect(() => {
    if (typeof window === "undefined" || effectiveUserId === undefined) return;

    const expectedKey = getCartStorageKey(effectiveUserId);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === expectedKey) {
        const refreshed = loadCartFromStorage(effectiveUserId);
        setItems(refreshed);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<{ userId: string | null; items: CartItem[] }>;
      if (custom.detail && custom.detail.userId === (effectiveUserId ?? null)) {
        setItems(custom.detail.items);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("pustoka:cart-updated", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pustoka:cart-updated", handleCustomEvent);
    };
  }, [effectiveUserId]);

  const dispatchUpdate = useCallback((targetUserId: string | null, newItems: CartItem[]) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pustoka:cart-updated", {
          detail: { userId: targetUserId, items: newItems },
        })
      );
    }
  }, []);

  const isInCart = useCallback(
    (bookId: string) => {
      return items.some((it) => it.bookId === bookId);
    },
    [items]
  );

  const addItem = useCallback(
    (item: CartItem) => {
      if (!item.bookId) {
        return { success: false, message: "বইটির তথ্য সঠিক নয়।" };
      }

      const currentUid = effectiveUserId ?? null;
      const currentItems = isLoaded ? items : loadCartFromStorage(currentUid);

      const alreadyExists = currentItems.some((it) => it.bookId === item.bookId);
      if (alreadyExists) {
        return {
          success: false,
          alreadyInCart: true,
          message: "বইটি ইতিমধ্যে আপনার কার্টে রয়েছে।",
        };
      }

      const updated = [...currentItems, item];
      setItems(updated);
      saveCartToStorage(currentUid, updated);
      dispatchUpdate(currentUid, updated);

      return {
        success: true,
        alreadyInCart: false,
        message: "বইটি সফলভাবে কার্টে যোগ করা হয়েছে।",
      };
    },
    [items, isLoaded, effectiveUserId, dispatchUpdate]
  );

  const removeItem = useCallback(
    (bookId: string) => {
      const currentUid = effectiveUserId ?? null;
      const currentItems = isLoaded ? items : loadCartFromStorage(currentUid);
      const updated = currentItems.filter((it) => it.bookId !== bookId);
      setItems(updated);
      saveCartToStorage(currentUid, updated);
      dispatchUpdate(currentUid, updated);
    },
    [items, isLoaded, effectiveUserId, dispatchUpdate]
  );

  const clearCart = useCallback(() => {
    const currentUid = effectiveUserId ?? null;
    setItems([]);
    saveCartToStorage(currentUid, []);
    dispatchUpdate(currentUid, []);
  }, [effectiveUserId, dispatchUpdate]);

  const value = useMemo<CartContextType>(
    () => ({
      items,
      count: items.length,
      isLoaded,
      activeUserId: effectiveUserId ?? null,
      addItem,
      removeItem,
      clearCart,
      isInCart,
    }),
    [items, isLoaded, effectiveUserId, addItem, removeItem, clearCart, isInCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
