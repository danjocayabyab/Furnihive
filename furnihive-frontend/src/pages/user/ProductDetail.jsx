// src/pages/user/ProductDetail.jsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Button from "../../components/ui/Button.jsx";
import { featured as mockProducts } from "../../data/mockProducts.js";
import ReviewSummary from "../../components/reviews/ReviewSummary.jsx";
import ReviewCard from "../../components/reviews/ReviewCard.jsx";

import { useCart } from "../../components/contexts/CartContext.jsx";
import { useUI } from "../../components/contexts/UiContext.jsx";

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // product (from mock list for now)
  const product = useMemo(
    () => mockProducts.find((p) => String(p.id) === String(id)) || mockProducts[0],
    [id]
  );

  // state
  const [selectedColor, setSelectedColor] = useState("Charcoal Gray");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("description");

  // contexts
  const cart = useCart();
  const addToCartCtx = typeof cart.add === "function" ? cart.add : cart.addItem;
  const { showAddToCart } = useUI();

  // thumbnails (re-use main image for the mock)
  const thumbs = [product.image, product.image, product.image];

  // build a cart item shape
  const baseItem = {
    id: product.id,
    title: product.title,
    price: Number(product.price),
    oldPrice: Number(product.oldPrice || product.price),
    image: product.image,
    seller: product.seller || "Manila Furniture Co.",
    color: selectedColor,
    rating: product.rating,
  };

  /* ------------------ actions ------------------ */
  const handleAddToCart = () => {
    addToCartCtx(baseItem, qty);
    showAddToCart({
      title: product.title,
      qty,
      onViewCart: () => navigate("/cart"),
    });
  };

  const handleBuyNow = () => {
    addToCartCtx(baseItem, qty);
    navigate("/checkout");
  };

  const openChat = () => {
    navigate(`/messages?seller=${encodeURIComponent(baseItem.seller)}`, {
      state: {
        seller: {
          name: baseItem.seller,
          product: { id: baseItem.id, title: baseItem.title, image: baseItem.image },
        },
        prefill: `Hi! I'm interested in "${baseItem.title}". Is it available in ${selectedColor}?`,
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-8">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-600 flex gap-2 flex-wrap">
        <Link to="/shop" className="text-[var(--orange-600)] hover:underline">Back to Shop</Link>
        <span>/</span>
        <span>{product.category || "Living Room"}</span>
        <span>/</span>
        <span className="text-[var(--brown-700)] font-semibold">{product.title}</span>
      </div>

      {/* Top: images + summary */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Images */}
        <div>
          <div className="rounded-xl border border-[var(--line-amber)] overflow-hidden">
            <img src={product.image} alt={product.title} className="w-full object-cover h-80" />
          </div>
          <div className="mt-3 flex gap-2">
            {thumbs.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`thumb-${i}`}
                className="h-20 w-24 object-cover rounded-md border border-[var(--line-amber)] cursor-pointer"
              />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-[var(--brown-700)]">{product.title}</h1>
          <p className="text-sm text-gray-600">
            by{" "}
            <span className="text-[var(--orange-600)]">
              {product.seller || "Manila Furniture Co."}
            </span>
          </p>

          {/* Rating */}
          <div className="text-sm text-gray-700">
            ⭐ {Number(product.rating).toFixed(1)} ({product.reviews} reviews)
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-[var(--brown-700)]">
              {peso(product.price)}
            </div>
            {product.oldPrice && (
              <>
                <div className="text-gray-500 line-through">
                  {peso(product.oldPrice)}
                </div>
                <span className="text-green-600 font-medium">
                  Save {peso(Number(product.oldPrice) - Number(product.price))}
                </span>
              </>
            )}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Color:</span>
            {["Charcoal Gray", "Blue"].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${
                  selectedColor === c ? "border-[var(--orange-600)]" : "border-gray-300"
                }`}
                title={c}
                style={{ backgroundColor: c === "Blue" ? "#2563eb" : "#444" }}
              />
            ))}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Quantity:</span>
            <div className="flex items-center border rounded-lg">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1">
                -
              </button>
              <span className="px-4">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="px-3 py-1">
                +
              </button>
            </div>
            <span className="text-xs text-gray-500">12 items available</span>
          </div>

          {/* Actions */}
          <Button className="w-full" onClick={handleAddToCart}>
            Add to Cart – {peso(Number(product.price) * qty)}
          </Button>
          <Button className="w-full" variant="secondary" onClick={handleBuyNow}>
            Buy Now
          </Button>

          {/* Services */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs mt-4">
            <div className="border rounded-lg py-3">🚚<br />Free Delivery</div>
            <div className="border rounded-lg py-3">🛡<br />2 Year Warranty</div>
            <div className="border rounded-lg py-3">↩️<br />30-Day Returns</div>
          </div>

          {/* Seller info */}
          <div className="border rounded-lg p-3 flex items-center justify-between mt-4">
            <div>
              <div className="font-semibold">{product.seller || "Manila Furniture Co."}</div>
              <div className="text-xs text-gray-600">⭐ 4.9 • 2847 sales</div>
            </div>
            <Button variant="secondary" className="text-xs px-3 py-1" onClick={openChat}>
              Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b">
          {["description", "specs", "reviews"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t
                  ? "text-[var(--orange-600)] border-b-2 border-[var(--orange-600)]"
                  : "text-gray-600"
              }`}
            >
              {t === "description" && "Description"}
              {t === "specs" && "Specifications"}
              {t === "reviews" && `Reviews (${product.reviews})`}
            </button>
          ))}
        </div>

        {/* Panels */}
        {tab === "description" && (
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>
              Transform your living space with this contemporary sectional sofa featuring premium
              fabric upholstery and a solid hardwood frame. Perfect for modern Filipino homes.
            </p>
            <ul className="list-disc list-inside">
              <li>Premium fabric upholstery</li>
              <li>High-density foam cushions</li>
              <li>Left and right configurations available</li>
              <li>Solid hardwood frame</li>
              <li>Removable and washable covers</li>
              <li>Accommodates 4–5 people comfortably</li>
            </ul>
          </div>
        )}

        {tab === "specs" && (
          <div className="mt-4 text-sm text-gray-700 grid sm:grid-cols-2 gap-y-2">
            <div><strong>Dimensions:</strong> L:280cm × W:180cm × H:85cm</div>
            <div><strong>Weight:</strong> 75kg</div>
            <div><strong>Material:</strong> Hardwood frame, premium fabric</div>
            <div><strong>Warranty:</strong> 2 years manufacturer warranty</div>
            <div><strong>Assembly:</strong> Minimal assembly required</div>
          </div>
        )}

        {tab === "reviews" && (
          <div className="mt-4 grid md:grid-cols-3 gap-6">
            {/* Summary */}
            <ReviewSummary average={4.8} total={product.reviews} dist={{ 5: 78, 4: 32, 3: 12, 2: 4, 1: 1 }} />
            {/* List */}
            <div className="md:col-span-2 space-y-4">
              {[
                {
                  name: "Maria Santos",
                  verified: true,
                  rating: 5,
                  date: "2024-12-15",
                  variation: `Color: ${selectedColor}`,
                  text:
                    "Excellent quality sofa! Very comfortable and the delivery was prompt. Highly recommended for families.",
                  helpful: 23,
                },
                {
                  name: "Juan dela Cruz",
                  verified: true,
                  rating: 4,
                  date: "2024-12-10",
                  text:
                    "Good value for money. The fabric is soft and durable. Assembly was straightforward.",
                  helpful: 18,
                },
                {
                  name: "Anna Reyes",
                  verified: false,
                  rating: 5,
                  date: "2024-12-05",
                  text:
                    "Perfect fit for my living room! The color matches exactly as shown in the pictures.",
                  helpful: 15,
                },
              ].map((r, i) => (
                <ReviewCard key={i} r={{ ...r, onHelpful: () => console.log("helpful for", r.name) }} />
              ))}
              <button className="mt-2 w-full rounded-lg border border-[var(--line-amber)] bg-white px-4 py-2 text-sm hover:bg-[var(--cream-50)]">
                Load More Reviews
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
