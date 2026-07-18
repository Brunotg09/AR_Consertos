"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface CartServiceItem {
  id: string;
  type: "service";
  service: {
    id: string;
    name: string;
    description: string;
    category: string;
    type: "convencional" | "inverter";
    badgeGarantia: string;
    imagesFolder: string;
    totalImages: number;
    iconName: string;
    discountPercentage: number;
  };
}

export interface CartProductItem {
  id: string;
  type: "product";
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  condition: string | null;
  category: string | null;
}

export type CartItem = CartServiceItem | CartProductItem;

interface CartContextValue {
  items: CartItem[];
  addService: (service: CartServiceItem["service"]) => void;
  addProduct: (product: {
    id: number;
    name: string;
    price: number;
    image: string | null;
    condition: string | null;
    category: string | null;
  }) => void;
  removeItem: (id: string) => void;
  updateProductQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "ar-consertos-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addService = useCallback((service: CartServiceItem["service"]) => {
    setItems((prev) => {
      const exists = prev.find(
        (i) => i.type === "service" && i.service.id === service.id
      );
      if (exists) return prev;
      return [...prev, { id: `svc-${service.id}`, type: "service", service }];
    });
  }, []);

  const addProduct = useCallback((product: {
    id: number;
    name: string;
    price: number;
    image: string | null;
    condition: string | null;
    category: string | null;
  }) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.type === "product" && i.productId === product.id
      ) as CartProductItem | undefined;
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id && i.type === "product"
            ? { ...(i as CartProductItem), quantity: (i as CartProductItem).quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          id: `prd-${product.id}-${Date.now()}`,
          type: "product",
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
          condition: product.condition,
          category: product.category,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateProductQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === id && i.type === "product"
          ? { ...(i as CartProductItem), quantity }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => {
    if (i.type === "product") return sum + i.quantity;
    return sum + 1;
  }, 0);

  const subtotal = items.reduce((sum, i) => {
    if (i.type === "product") return sum + i.price * i.quantity;
    return sum;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addService,
        addProduct,
        removeItem,
        updateProductQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
