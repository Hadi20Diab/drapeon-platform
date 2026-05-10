import type { CatalogProduct } from "./api";

export interface StoredCommerceItem extends CatalogProduct {
  quantity: number;
}

const cartKey = "drapeon.cart";
const wishlistKey = "drapeon.wishlist";

function readItems(key: string): StoredCommerceItem[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredCommerceItem[]) : [];
  } catch {
    return [];
  }
}

function writeItems(key: string, items: StoredCommerceItem[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function readCart(): StoredCommerceItem[] {
  return readItems(cartKey);
}

export function readWishlist(): StoredCommerceItem[] {
  return readItems(wishlistKey);
}

export function addToCart(product: CatalogProduct): StoredCommerceItem[] {
  const items = readCart();
  const existing = items.find((item) => item.id === product.id);
  const next = existing
    ? items.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      )
    : [...items, { ...product, quantity: 1 }];

  writeItems(cartKey, next);
  return next;
}

export function addToWishlist(product: CatalogProduct): StoredCommerceItem[] {
  const items = readWishlist();
  const next = items.some((item) => item.id === product.id)
    ? items
    : [...items, { ...product, quantity: 1 }];

  writeItems(wishlistKey, next);
  return next;
}

export function removeFromCart(productId: string): StoredCommerceItem[] {
  const next = readCart().filter((item) => item.id !== productId);
  writeItems(cartKey, next);
  return next;
}

export function removeFromWishlist(productId: string): StoredCommerceItem[] {
  const next = readWishlist().filter((item) => item.id !== productId);
  writeItems(wishlistKey, next);
  return next;
}

export function isInWishlist(productId: string): boolean {
  return readWishlist().some((item) => item.id === productId);
}

export function toggleWishlist(product: CatalogProduct): { active: boolean; items: StoredCommerceItem[] } {
  const active = isInWishlist(product.id);

  if (active) {
    return {
      active: false,
      items: removeFromWishlist(product.id)
    };
  }

  return {
    active: true,
    items: addToWishlist(product)
  };
}
