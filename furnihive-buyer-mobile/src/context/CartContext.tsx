import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type CartItem = {
  id: string | number;
  title: string;
  price: number;
  image: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  total: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  updateQty: (id: string | number, qty: number) => void;
  remove: (id: string | number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add: CartContextValue["add"] = (item, qty = 1) => {
    if (qty <= 0) return;
    setItems((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing) {
        return prev.map((x) =>
          x.id === item.id ? { ...x, qty: x.qty + qty } : x
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  const updateQty: CartContextValue["updateQty"] = (id, qty) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((x) => x.id !== id);
      return prev.map((x) => (x.id === id ? { ...x, qty } : x));
    });
  };

  const remove: CartContextValue["remove"] = (id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const clear: CartContextValue["clear"] = () => {
    setItems([]);
  };

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, total, add, updateQty, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
