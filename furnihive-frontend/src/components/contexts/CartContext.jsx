// src/components/contexts/CartContext.jsx
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./AuthContext.jsx";

const STORAGE_KEY_BASE = "fh_cart_v1";

function storageKeyForUser(userId) {
  return userId ? `${STORAGE_KEY_BASE}_${userId}` : `${STORAGE_KEY_BASE}_guest`;
}

const CartContext = createContext(null);

function loadFromStorage(userId) {
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(userId, items) {
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(items));
  } catch {}
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const { item, qty = 1 } = action.payload;
      const idx = state.findIndex((i) => String(i.id) === String(item.id));
      if (idx >= 0) {
        const next = [...state];
        const current = next[idx];
        const maxStock =
          typeof item.stock_qty === "number"
            ? item.stock_qty
            : typeof current.stock_qty === "number"
            ? current.stock_qty
            : null;
        const newQtyRaw = (current.qty || 1) + qty;
        const newQty = maxStock != null ? Math.min(newQtyRaw, maxStock) : newQtyRaw;
        next[idx] = { ...current, stock_qty: maxStock ?? current.stock_qty ?? item.stock_qty, qty: newQty };
        return next;
      }
      return [
        ...state,
        {
          ...item,
          stock_qty:
            typeof item.stock_qty === "number" ? item.stock_qty : item.stock_qty == null ? null : item.stock_qty,
          qty,
        },
      ];
    }
    case "UPDATE_QTY": {
      const { id, qty } = action.payload;
      return state.map((i) =>
        String(i.id) === String(id)
          ? {
              ...i,
              qty:
                typeof i.stock_qty === "number"
                  ? Math.max(1, Math.min(qty, i.stock_qty))
                  : Math.max(1, qty),
            }
          : i
      );
    }
    case "REMOVE": {
      const { id } = action.payload;
      return state.filter((i) => String(i.id) !== String(id));
    }
    case "CLEAR":
      return [];
    case "SET": {
      return Array.isArray(action.payload) ? action.payload : [];
    }
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const { user, profile } = useAuth();
  const [items, dispatch] = useReducer(reducer, []);
  const cartIdRef = useRef(null);

  // Persist cart per user (or guest) in localStorage
  useEffect(() => {
    const userId = user?.id || null;
    saveToStorage(userId, items);
  }, [items, user?.id]);

  // When user changes, hydrate cart from the appropriate storage bucket
  useEffect(() => {
    const userId = user?.id || null;
    const stored = loadFromStorage(userId);
    dispatch({ type: "SET", payload: stored });
  }, [user?.id]);

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
            .select(
              "id, product_id, qty, unit_price, title, image, seller_display, color, weight_kg"
            )
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
            weight_kg: r.weight_kg || 0,
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
          const maxStock =
            typeof item.stock_qty === "number" ? item.stock_qty : null;
          const newQtyRaw = (row.qty || 0) + qty;
          const newQty = maxStock != null ? Math.min(newQtyRaw, maxStock) : newQtyRaw;
          await supabase
            .from("cart_items")
            .update({ qty: newQty })
            .eq("id", row.id);
        } else {
          const initialQty =
            typeof item.stock_qty === "number" ? Math.min(qty, item.stock_qty) : qty;
          await supabase.from("cart_items").insert({
            cart_id: cartId,
            product_id: item.id,
            qty: initialQty,
            unit_price: Number(item.price || 0),
            title: item.title || null,
            image: item.image || null,
            seller_display: item.seller || null,
            color: item.color || null,
            weight_kg: item.weight_kg || null,
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
          const currentItem = items.find((it) => String(it.id) === String(id));
          const maxStock =
            currentItem && typeof currentItem.stock_qty === "number"
              ? currentItem.stock_qty
              : null;
          const clampedQty = maxStock != null ? Math.min(Math.max(1, Number(qty || 1)), maxStock) : Math.max(1, Number(qty || 1));
          await supabase
            .from("cart_items")
            .update({ qty: clampedQty })
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
