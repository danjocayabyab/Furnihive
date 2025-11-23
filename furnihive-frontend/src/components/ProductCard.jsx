import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "./ui/Button.jsx";
import { useCart } from "../components/contexts/CartContext.jsx";
import { useUI } from "../components/contexts/UiContext.jsx";
import { useAuth } from "../components/contexts/AuthContext.jsx";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const cart = useCart();
  const addToCartCtx = typeof cart.add === "function" ? cart.add : cart.addItem;
  const { showAddToCart, openAuth } = useUI();
  const { user } = useAuth();
  const [stockWarning, setStockWarning] = useState("");

  const to = `/product/${product.id ?? ""}`;

  const cartItems = cart?.items || [];
  const inCartQty = cartItems.find((i) => String(i.id) === String(product.id))?.qty || 0;
  const availableStock =
    typeof product?.stock_qty === "number" && product.stock_qty > 0 ? product.stock_qty : null;
  const remainingStock =
    availableStock != null ? Math.max(0, availableStock - inCartQty) : null;

  const onAdd = () => {
    if (!user) {
      openAuth("login");
      return;
    }
    if (availableStock != null && remainingStock !== null && remainingStock <= 0) {
      setStockWarning("You already have the maximum available stock for this product in your cart.");
      return;
    }
    const baseItem = {
      id: product.id,
      seller_id: product.seller_id,
      title: product.title,
      price: Number(product.price),
      oldPrice: Number(product.oldPrice || product.price),
      image: product.image,
      seller: product.seller,
      color: product.color || "Default",
      rating: product.rating,
      weight_kg: product.weight_kg || 0,
      stock_qty: typeof product.stock_qty === "number" ? product.stock_qty : null,
    };
    addToCartCtx(baseItem, 1);
    showAddToCart({
      title: product.title,
      qty: 1,
      onViewCart: () => navigate("/cart"),
    });
  };

  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-white overflow-hidden hover:shadow-card transition relative">
      {/* Clickable image area */}
      <Link to={to} className="relative block">
        <img src={product.image} alt={product.title} className="h-44 w-full object-cover" />
        {product.badge && (
          <span className="absolute left-2 top-2 text-[11px] font-medium rounded-full bg-white/90 px-2 py-1 border border-[var(--line-amber)] text-[var(--orange-600)]">
            {product.badge}
          </span>
        )}
        {product.outOfStock && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-semibold">
            Out of Stock
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="p-3 space-y-2">
        {product.seller && <div className="text-[11px] text-gray-500">{product.seller}</div>}

        <Link to={to} className="block text-sm font-semibold text-[var(--brown-700)] line-clamp-1 hover:underline">
          {product.title}
        </Link>

        <div className="flex items-center gap-2 text-[11px] text-gray-600">
          <span>⭐ {Number(product.rating).toFixed(1)}</span>
          <span>({product.reviews} reviews)</span>
        </div>

        <div className="flex items-baseline gap-2">
          <div className="font-bold text-[var(--brown-700)]">₱{Number(product.price).toLocaleString()}</div>
          {product.oldPrice && (
            <div className="text-xs text-gray-500 line-through">₱{Number(product.oldPrice).toLocaleString()}</div>
          )}
        </div>

        {product.outOfStock ? (
          <Button className="w-full" disabled>Out of Stock</Button>
        ) : (
          <Button className="w-full" variant="secondary" onClick={onAdd}>
            Add to Cart
          </Button>
        )}
      </div>
      {stockWarning && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setStockWarning("")}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--line-amber)] bg-white shadow-xl p-5 space-y-4">
            <div className="text-sm font-semibold text-[var(--brown-700)]">Stock limit reached</div>
            <div className="text-sm text-gray-700">{stockWarning}</div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
                onClick={() => setStockWarning("")}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
