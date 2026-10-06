"use client";

import React, { createContext, useContext, useSyncExternalStore, useMemo, useCallback } from "react";
import type { CatalogueProduct } from "@/lib/catalogue";
import { SIZE_LABELS, SIZE_IDS, MAX_QUANTITY_PER_LINE, MAX_LINE_ITEMS } from "@/lib/order-validation";
import { pricePlaceholder } from "@/lib/currency";

export interface CartItem {
  id: string; // e.g. "glazed-truffle__size-m__len-Medium"
  productId: string;
  productSlug: string;
  name: string;
  descriptor: string;
  price: string; // the PKR no-price placeholder, until the set is priced
  size: string; // "xs" | "s" | "m" | "l" | "custom"
  sizeLabel: string; // "XS" | "S" | "M" | "L" | "Custom"
  length: string; // "Short" | "Medium" | "Long"
  shape: string;
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
  };
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  subtotalPlaceholder: string;
  addItem: (product: CatalogueProduct, size: string, length: string, quantity?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "nails-by-fufs-cart";

// In-memory store and listeners for useSyncExternalStore
let cartItemsStore: CartItem[] = [];
let hasLoadedFromStorage = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * The persisted bag is untrusted input: it lives in localStorage, which the
 * customer — or any script running on the page — can edit freely. Nothing here
 * is treated as authoritative (checkout re-prices every line server-side from
 * the catalogue), but the UI should not render junk from a tampered store, so
 * entries are shape-checked, options validated, quantities clamped and the
 * number of lines bounded.
 */
function sanitizeStoredItems(raw: unknown[]): CartItem[] {
  const items: CartItem[] = [];

  for (const entry of raw) {
    if (items.length >= MAX_LINE_ITEMS) break;
    if (typeof entry !== "object" || entry === null) continue;

    const item = entry as Partial<CartItem>;
    const size = typeof item.size === "string" ? item.size.toLowerCase() : "";
    const quantity = typeof item.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : 0;

    if (
      typeof item.id !== "string" ||
      typeof item.productId !== "string" ||
      typeof item.productSlug !== "string" ||
      typeof item.name !== "string" ||
      typeof item.length !== "string" ||
      !SIZE_IDS.includes(size as keyof typeof SIZE_LABELS) ||
      quantity < 1
    ) {
      continue;
    }

    items.push({
      ...(item as CartItem),
      size,
      sizeLabel: SIZE_LABELS[size as keyof typeof SIZE_LABELS] ?? size.toUpperCase(),
      // Display-only string; long or unexpected values fall back to the
      // placeholder rather than rendering whatever was injected.
      price:
        typeof item.price === "string" && item.price.length <= 16
          ? item.price
          : pricePlaceholder(),
      quantity: Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, Math.round(quantity))),
    });
  }

  return items;
}

function loadInitialCart() {
  if (typeof window === "undefined" || hasLoadedFromStorage) return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        cartItemsStore = sanitizeStoredItems(parsed);
      }
    }
  } catch {
    // Ignore read error
  } finally {
    hasLoadedFromStorage = true;
  }
}

function saveCart(newItems: CartItem[]) {
  cartItemsStore = newItems;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch {
      // Ignore write errors
    }
  }
  emitChange();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  
  // Listen for storage events from other tabs/windows
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          cartItemsStore = parsed;
          emitChange();
        }
      } catch {
        // Ignore parse error
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function getSnapshot(): CartItem[] {
  if (!hasLoadedFromStorage && typeof window !== "undefined") {
    loadInitialCart();
  }
  return cartItemsStore;
}

const EMPTY_SERVER_CART: CartItem[] = [];
function getServerSnapshot(): CartItem[] {
  return EMPTY_SERVER_CART;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const addItem = useCallback(
    (product: CatalogueProduct, size: string, length: string, quantity: number = 1) => {
      const sanitizedSize = size.toLowerCase();
      const itemId = `${product.id}__size-${sanitizedSize}__len-${length}`;
      const sizeLabel = SIZE_LABELS[sanitizedSize as keyof typeof SIZE_LABELS] ?? size.toUpperCase();

      const existingIndex = cartItemsStore.findIndex((item) => item.id === itemId);

      if (existingIndex > -1) {
        // Increment quantity for matching configuration (capped at 10)
        const next = [...cartItemsStore];
        const newQty = Math.min(10, next[existingIndex].quantity + quantity);
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: newQty,
        };
        saveCart(next);
        return;
      }

      // Add new separate configuration line item
      const newItem: CartItem = {
        id: itemId,
        productId: product.id,
        productSlug: product.slug,
        name: product.name,
        descriptor: product.descriptor,
        price: product.price,
        size: sanitizedSize,
        sizeLabel,
        length,
        shape: product.shape,
        imagePlaceholder: product.imagePlaceholder,
        quantity: Math.min(10, Math.max(1, quantity)),
      };

      saveCart([...cartItemsStore, newItem]);
    },
    []
  );

  const removeItem = useCallback((cartItemId: string) => {
    saveCart(cartItemsStore.filter((item) => item.id !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      saveCart(cartItemsStore.filter((item) => item.id !== cartItemId));
      return;
    }

    const clamped = Math.min(10, Math.max(1, newQuantity));
    saveCart(
      cartItemsStore.map((item) =>
        item.id === cartItemId ? { ...item, quantity: clamped } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    saveCart([]);
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotalPlaceholder: pricePlaceholder(),
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
