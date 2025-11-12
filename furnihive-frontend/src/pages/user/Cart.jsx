// src/pages/user/Cart.jsx
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../components/contexts/CartContext.jsx";

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, clearCart } = useCart();

  const [promo, setPromo] = useState("");
  const [confirm, setConfirm] = useState(null); // { type:"delete"|"clear", id? }

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    const discounts = items.reduce(
      (s, i) => s + ((i.oldPrice || i.price) - (i.price || 0)) * (i.qty || 1),
      0
    );
    const shipping = subtotal >= 25000 || items.length === 0 ? 0 : 500;
    return { subtotal, discounts, shipping, total: subtotal + shipping };
  }, [items]);

  const changeQty = (id, delta) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    updateQty(id, (item.qty || 1) + delta);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/shop" className="text-sm text-[var(--orange-600)] hover:underline">
          ← Continue Shopping
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--brown-700)]">
           Shopping Cart
          <span className="text-[var(--orange-600)] font-normal text-base">
            ({items.length})
          </span>
        </h1>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Items */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--brown-700)]">Your Items</h2>
            {items.length > 0 && (
              <button
                onClick={() => setConfirm({ type: "clear" })}
                className="text-sm text-red-600 hover:underline"
              >
                Clear Cart
              </button>
            )}
          </div>

          {items.length === 0 && (
            <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-6 text-center text-gray-600">
              Your cart is empty.
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--line-amber)] bg-white p-4 flex gap-4"
            >
              {/* Image */}
              <div className="relative">
                {item.oldPrice > item.price && (
                  <span className="absolute left-2 top-2 text-[11px] rounded-md bg-[var(--red-500)] text-white px-2 py-0.5">
                    {Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)}% OFF
                  </span>
                )}
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-28 w-36 object-cover rounded-lg border border-[var(--line-amber)]"
                />
              </div>

              {/* Details */}
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-[var(--brown-700)]">{item.title}</h3>
                <p className="text-sm text-gray-600">by {item.seller}</p>
                <p className="text-sm text-gray-600">Color: {item.color || "Default"}</p>
                <div className="text-sm text-yellow-600">⭐ {item.rating}</div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1 border border-[var(--line-amber)] rounded-md">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="px-2 py-1 hover:bg-[var(--cream-50)]"
                    >
                      −
                    </button>
                    <span className="px-3">{item.qty}</span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="px-2 py-1 hover:bg-[var(--cream-50)]"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-sm text-gray-700">
                    Subtotal:{" "}
                    <span className="font-semibold text-[var(--brown-700)]">
                      {peso((item.price || 0) * (item.qty || 1))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price + actions */}
              <div className="flex flex-col items-end justify-between">
                <div className="text-right">
                  <div className="font-bold text-[var(--brown-700)]">
                    {peso(item.price)}
                  </div>
                  {item.oldPrice && (
                    <div className="text-xs text-gray-500 line-through">
                      {peso(item.oldPrice)}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">per piece</div>
                </div>
                <div className="flex gap-3 text-[var(--orange-600)]">
                  <button title="Save to Wishlist">♡</button>
                  <button
                    title="Remove"
                    onClick={() => setConfirm({ type: "delete", id: item.id })}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="rounded-2xl border border-[var(--line-amber)] bg-white p-5 space-y-4 self-start">
          <h3 className="font-semibold text-[var(--brown-700)]">Order Summary</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Subtotal ({items.length} items)</span>
              <span>{peso(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Product Discounts</span>
              <span>−{peso(totals.discounts)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span>{totals.shipping === 0 ? "FREE" : peso(totals.shipping)}</span>
            </div>
            <div className="my-2 h-px bg-[var(--line-amber)]/60" />
            <div className="flex justify-between font-semibold text-[var(--brown-700)]">
              <span>Total</span>
              <span>{peso(totals.total)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="w-full rounded-lg bg-[var(--orange-600)] px-4 py-3 text-white font-medium hover:brightness-95 disabled:opacity-50"
            disabled={items.length === 0}
          >
            Proceed to Checkout
          </button>
        </aside>
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          type={confirm.type}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === "clear") clearCart();
            else removeItem(confirm.id);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmModal({ type, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
      <div className="bg-white rounded-2xl border border-[var(--line-amber)] max-w-sm w-full p-6 text-center space-y-4">
        <div className="text-4xl">{type === "clear" ? "🧹" : "🗑"}</div>
        <h2 className="font-semibold text-[var(--brown-700)] text-lg">
          {type === "clear" ? "Clear Cart?" : "Remove Item?"}
        </h2>
        <p className="text-sm text-gray-600">
          {type === "clear"
            ? "This will remove all items from your cart."
            : "This item will be removed from your cart."}
        </p>
        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-[var(--orange-600)] px-4 py-2 text-sm text-white hover:brightness-95"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
