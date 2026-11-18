import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProductCardView } from "@/data/product-types";

/**
 * ============================================================
 * Wishlist Hook — localStorage-persisted favourites
 * ============================================================
 * - Storage key: ikhlas_wishlist_v1
 * - Max items: 100
 * ============================================================
 */

interface WishlistItem {
  id: string;
  slug?: string;
  name: string;
  price: number;
  emoji: string;
  image?: string;
  /** Timestamp the item was added (epoch ms) — used to sort newest first */
  addedAt: number;
}

const STORAGE_KEY = "ikhlas_wishlist_v1";
const MAX_ITEMS = 100;

const wishlistStorage = {
  read(): WishlistItem[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as WishlistItem[];
      return Array.isArray(parsed)
        ? parsed.filter((i) => i?.id && typeof i.addedAt === "number").slice(0, MAX_ITEMS)
        : [];
    } catch {
      return [];
    }
  },
  write(items: WishlistItem[]) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("ikhlas:wishlist-change"));
    } catch {
      // Quota exceeded — silently ignore
    }
  },
  subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => cb();
    window.addEventListener("ikhlas:wishlist-change", handler);
    const onFocus = () => cb();
    window.addEventListener("focus", onFocus);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) cb();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("ikhlas:wishlist-change", handler);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  },
};

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>(() => wishlistStorage.read());

  useEffect(() => {
    return wishlistStorage.subscribe(() => setItems(wishlistStorage.read()));
  }, []);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const add = useCallback((p: ProductCardView) => {
    const current = wishlistStorage.read();
    if (current.some((i) => i.id === p.id)) return;
    const next: WishlistItem[] = [
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        emoji: p.emoji,
        image: p.image,
        addedAt: Date.now(),
      },
      ...current,
    ].slice(0, MAX_ITEMS);
    wishlistStorage.write(next);
  }, []);

  const remove = useCallback((id: string) => {
    wishlistStorage.write(wishlistStorage.read().filter((i) => i.id !== id));
  }, []);

  const toggle = useCallback(
    (p: ProductCardView) => {
      if (items.some((i) => i.id === p.id)) remove(p.id);
      else add(p);
    },
    [items, add, remove],
  );

  const clear = useCallback(() => wishlistStorage.write([]), []);

  return useMemo(
    () => ({ items, count: items.length, has, add, remove, toggle, clear }),
    [items, has, add, remove, toggle, clear],
  );
}
