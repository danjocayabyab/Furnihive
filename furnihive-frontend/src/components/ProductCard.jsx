import { Link, useNavigate } from "react-router-dom";
import Button from "./ui/Button.jsx";
import { useCart } from "../components/contexts/CartContext.jsx";
import { useUI } from "../components/contexts/UiContext.jsx";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const cart = useCart();
  const addToCartCtx = typeof cart.add === "function" ? cart.add : cart.addItem;
  const { showAddToCart } = useUI();

  const to = `/product/${product.id ?? ""}`;

  const onAdd = () => {
    const baseItem = {
      id: product.id,
      title: product.title,
      price: Number(product.price),
      oldPrice: Number(product.oldPrice || product.price),
      image: product.image,
      seller: product.seller,
      color: product.color || "Default",
      rating: product.rating,
    };
    addToCartCtx(baseItem, 1);
    showAddToCart({
      title: product.title,
      qty: 1,
      onViewCart: () => navigate("/cart"),
    });
  };

  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-white overflow-hidden hover:shadow-card transition">
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
    </div>
  );
}
