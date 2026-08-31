"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

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
  maxStock: number;
  image: string | null;
  condition: string | null;
  category: string | null;
}

export type CartItem = CartServiceItem | CartProductItem;

interface CartContextValue {
  items: CartItem[];
  addService: (service: CartServiceItem["service"]) => boolean;
  addProduct: (product: {
    id: number;
    name: string;
    price: number;
    image: string | null;
    condition: string | null;
    category: string | null;
    maxStock: number;
  }) => void;
  removeItem: (id: string) => void;
  updateProductQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "arc-cart";

const ENC_KEY = "arc2024x";

function enc(data: string): string {
  const utf8 = unescape(encodeURIComponent(data));
  let r = "";
  for (let i = 0; i < utf8.length; i++) {
    r += String.fromCharCode(utf8.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length));
  }
  return btoa(r);
}

function dec(encoded: string): string {
  const data = atob(encoded);
  let r = "";
  for (let i = 0; i < data.length; i++) {
    r += String.fromCharCode(data.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length));
  }
  return decodeURIComponent(escape(r));
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(dec(raw));
  } catch {}
  return [];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enc(JSON.stringify(items)));
  }, [items]);

  const addService = useCallback((service: CartServiceItem["service"]): boolean => {
    let added = false;
    setItems((prev) => {
      const exists = prev.find(
        (i) => i.type === "service" && i.service.id === service.id
      );
      if (exists) return prev;
      added = true;
      return [...prev, { id: `svc-${service.id}`, type: "service", service }];
    });
    return added;
  }, []);

  const addProduct = useCallback((product: {
    id: number;
    name: string;
    price: number;
    image: string | null;
    condition: string | null;
    category: string | null;
    maxStock: number;
  }) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.type === "product" && i.productId === product.id
      ) as CartProductItem | undefined;
      
      const currentQty = existing?.quantity || 0;
      const newQty = currentQty + 1;
      
      // Validação de estoque
      if (newQty > product.maxStock) {
        toast.error(`Máximo ${product.maxStock} unidade(s) disponível(is) em estoque`);
        return prev;
      }
      
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id && i.type === "product"
            ? { ...(i as CartProductItem), quantity: newQty }
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
          maxStock: product.maxStock,
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
          ? { 
              ...(i as CartProductItem), 
              quantity: Math.min(quantity, (i as CartProductItem).maxStock) 
            }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
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