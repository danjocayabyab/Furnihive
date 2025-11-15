// src/components/contexts/CartContext.jsx
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./AuthContext.jsx";

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
  const { user, profile } = useAuth();
  const [items, dispatch] = useReducer(reducer, [], loadFromStorage);
  const cartIdRef = useRef(null);

  useEffect(() => saveToStorage(items), [items]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id || profile?.role !== 'buyer') return;
      try {
        const { data: existing, error } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        const cartId = existing?.id || null;
        cartIdRef.current = cartId;
        if (cartId) {
          const { data: rows, error: itemsErr } = await supabase
            .from("cart_items")
            .select("id, product_id, qty, unit_price, title, image, seller_display, color")
            .eq("cart_id", cartId);
          if (itemsErr) throw itemsErr;
          const mapped = (rows || []).map((r) => ({
            id: r.product_id,
            title: r.title,
            price: Number(r.unit_price || 0),
            oldPrice: Number(r.unit_price || 0),
            image: r.image || "",
            seller: r.seller_display || undefined,
            color: r.color || undefined,
            qty: r.qty || 1,
          }));
          if (!cancelled) {
            dispatch({ type: "CLEAR" });
            mapped.forEach((it) => dispatch({ type: "ADD", payload: { item: it, qty: it.qty } }));
          }
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.role]);

  const api = useMemo(() => {
    const ensureCartId = async () => {
      if (cartIdRef.current) return cartIdRef.current;
      if (!user?.id || profile?.role !== 'buyer') return null;
      const { data: existing } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.id) {
        cartIdRef.current = existing.id;
        return existing.id;
      }
      const { data: created } = await supabase
        .from("carts")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      cartIdRef.current = created?.id || null;
      return cartIdRef.current;
    };

    const addItem = async (item, qty = 1) => {
      dispatch({ type: "ADD", payload: { item, qty } });
      try {
        if (profile?.role !== 'buyer') return; // DB writes only for buyers
        const cartId = await ensureCartId();
        if (!cartId || !item?.id) return;
        const { data: row } = await supabase
          .from("cart_items")
          .select("id, qty")
          .eq("cart_id", cartId)
          .eq("product_id", item.id)
          .maybeSingle();
        if (row?.id) {
          await supabase
            .from("cart_items")
            .update({ qty: (row.qty || 0) + qty })
            .eq("id", row.id);
        } else {
          await supabase.from("cart_items").insert({
            cart_id: cartId,
            product_id: item.id,
            qty: qty,
            unit_price: Number(item.price || 0),
            title: item.title || null,
            image: item.image || null,
            seller_display: item.seller || null,
            color: item.color || null,
          });
        }
      } catch {}
    };

    const updateQty = async (id, qty) => {
      dispatch({ type: "UPDATE_QTY", payload: { id, qty } });
      try {
        if (profile?.role !== 'buyer') return;
        const cartId = await ensureCartId();
        if (!cartId) return;
        const { data: row } = await supabase
          .from("cart_items")
          .select("id")
          .eq("cart_id", cartId)
          .eq("product_id", id)
          .maybeSingle();
        if (row?.id) {
          await supabase
            .from("cart_items")
            .update({ qty: Math.max(1, Number(qty || 1)) })
            .eq("id", row.id);
        }
      } catch {}
    };

    const removeItem = async (id) => {
      dispatch({ type: "REMOVE", payload: { id } });
      try {
        if (profile?.role !== 'buyer') return;
        const cartId = await ensureCartId();
        if (!cartId) return;
        await supabase
          .from("cart_items")
          .delete()
          .eq("cart_id", cartId)
          .eq("product_id", id);
      } catch {}
    };

    const clearCart = async () => {
      dispatch({ type: "CLEAR" });
      try {
        if (profile?.role !== 'buyer') return;
        const cartId = await ensureCartId();
        if (!cartId) return;
        await supabase
          .from("cart_items")
          .delete()
          .eq("cart_id", cartId);
      } catch {}
    };

    const count = items.reduce((n, it) => n + (it.qty || 1), 0);
    const subtotal = items.reduce(
      (sum, it) => sum + (it.price || 0) * (it.qty || 1),
      0
    );

    return { items, addItem, updateQty, removeItem, clearCart, count, subtotal };
  }, [items, user?.id, profile?.role]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
