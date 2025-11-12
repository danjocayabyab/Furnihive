// src/components/contexts/CartContext.jsx
import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const STORAGE_KEY = "fh_cart_v1";

const CartContext = createContext(null);

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const { item, qty = 1 } = action.payload;
      const idx = state.findIndex((i) => String(i.id) === String(item.id));
      if (idx >= 0) {
        const next = [...state];
        next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + qty };
        return next;
      }
      return [...state, { ...item, qty }];
    }
    case "UPDATE_QTY": {
      const { id, qty } = action.payload;
      return state.map((i) =>
        String(i.id) === String(id) ? { ...i, qty: Math.max(1, qty) } : i
      );
    }
    case "REMOVE": {
      const { id } = action.payload;
      return state.filter((i) => String(i.id) !== String(id));
    }
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, [], loadFromStorage);

  useEffect(() => saveToStorage(items), [items]);

  const api = useMemo(() => {
    const addItem = (item, qty = 1) =>
      dispatch({ type: "ADD", payload: { item, qty } });
    const updateQty = (id, qty) =>
      dispatch({ type: "UPDATE_QTY", payload: { id, qty } });
    const removeItem = (id) => dispatch({ type: "REMOVE", payload: { id } });
    const clearCart = () => dispatch({ type: "CLEAR" });

    const count = items.reduce((n, it) => n + (it.qty || 1), 0);
    const subtotal = items.reduce(
      (sum, it) => sum + (it.price || 0) * (it.qty || 1),
      0
    );

    return { items, addItem, updateQty, removeItem, clearCart, count, subtotal };
  }, [items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
