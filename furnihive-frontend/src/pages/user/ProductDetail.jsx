// src/pages/user/ProductDetail.jsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import Button from "../../components/ui/Button.jsx";
import ReviewSummary from "../../components/reviews/ReviewSummary.jsx";
import ReviewCard from "../../components/reviews/ReviewCard.jsx";
import { supabase } from "../../lib/supabaseClient";

import { useCart } from "../../components/contexts/CartContext.jsx";
import { useUI } from "../../components/contexts/UiContext.jsx";

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const IMAGES_PUBLIC = String(import.meta.env.VITE_PRODUCT_IMAGES_PUBLIC || "false").toLowerCase() === "true";

  const [selectedColor, setSelectedColor] = useState("Charcoal Gray");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("description");
  const [mainIndex, setMainIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data: p, error } = await supabase
          .from("products")
          .select(
            "id, seller_id, name, description, category, category_id, status, base_price, stock_qty, length_cm, width_cm, height_cm, material, weight_kg, color"
          )
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!p) {
          if (!cancelled) setProduct(null);
          return;
        }

        // load store name
        let storeName = undefined;
        if (p.seller_id) {
          const { data: stores } = await supabase
            .from("stores")
            .select("owner_id, name")
            .eq("owner_id", p.seller_id)
            .limit(1);
          storeName = stores?.[0]?.name || undefined;
        }

        // load images
        const { data: imgs } = await supabase
          .from("product_images")
          .select("url, path, is_primary, position, created_at")
          .eq("product_id", p.id)
          .order("is_primary", { ascending: false })
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });
        const ordered = (imgs || []).slice();

        // resolve primary image
        let cover = "";
        let resolvedImages = [];
        if (ordered.length) {
          // build images list with url or resolved public url
          for (const row of ordered) {
            if (row.url) {
              resolvedImages.push(row.url);
            } else if (row.path && IMAGES_PUBLIC) {
              const { data: pub } = supabase.storage.from("product-images").getPublicUrl(row.path);
              if (pub?.publicUrl) resolvedImages.push(pub.publicUrl);
            } else if (row.path && !IMAGES_PUBLIC) {
              try {
                const { data: signed } = await supabase.storage
                  .from("product-images")
                  .createSignedUrl(row.path, 3600);
                if (signed?.signedUrl) resolvedImages.push(signed.signedUrl);
              } catch {}
            }
          }
          cover = resolvedImages[0] || "";
        }

        const mapped = {
          id: p.id,
          seller_id: p.seller_id,
          title: p.name || "Untitled",
          description: p.description || "",
          category: p.category || "Living Room",
          price: Number(p.base_price ?? 0),
          oldPrice: null,
          image: cover || "",
          images: resolvedImages,
          rating: 4.8,
          reviews: 0,
          seller: storeName,
          outOfStock:
            (typeof p.stock_qty === "number" ? p.stock_qty <= 0 : false) ||
            (p.status && p.status.toLowerCase() !== "active" && p.status.toLowerCase() !== "published"),
          stock_qty: typeof p.stock_qty === "number" ? p.stock_qty : null,
          length_cm: p.length_cm ?? null,
          width_cm: p.width_cm ?? null,
          height_cm: p.height_cm ?? null,
          material: p.material || "",
          weight_kg: p.weight_kg ?? null,
          color: p.color || "",
        };
        if (!cancelled) setProduct(mapped);
      } catch (e) {
        if (!cancelled) setProduct(null);
        // eslint-disable-next-line no-console
        console.warn("ProductDetail: failed to load product", e?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const cart = useCart();
  const addToCartCtx = typeof cart.add === "function" ? cart.add : cart.addItem;
  const { showAddToCart } = useUI();

  const images = product?.images && product.images.length ? product.images : (product?.image ? [product.image] : []);
  const mainImage = images[mainIndex] || images[0] || product?.image || "";

  const baseItem = product
    ? {
        id: product.id,
        seller_id: product.seller_id,
        title: product.title,
        price: Number(product.price),
        oldPrice: Number(product.oldPrice || product.price),
        image: product.image,
        seller: product.seller,
        color: selectedColor,
        rating: product.rating,
      }
    : null;

  const handleAddToCart = () => {
    if (!product || product.outOfStock) return;
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
        <Link to="/shop" className="text-[var(--orange-600)] hover:underline">
          Back to Shop
        </Link>
        <span>/</span>
        <span>{product?.category || "Living Room"}</span>
        <span>/</span>
        <span className="text-[var(--brown-700)] font-semibold">{product?.title || (loading ? "Loading..." : "")}</span>
      </div>

      {/* Product Card */}
      <div className="bg-white rounded-2xl border border-[var(--line-amber)] p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Images */}
          <div>
            <div className="rounded-2xl border border-[var(--line-amber)] overflow-hidden bg-[var(--cream-50)] flex items-center justify-center">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product?.title}
                  className="w-full object-cover h-80"
                />
              ) : (
                <div className="w-full h-80 bg-[var(--cream-50)] animate-pulse" />
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainIndex(i)}
                    className={`h-20 w-24 rounded-lg border flex-shrink-0 overflow-hidden ${
                      i === mainIndex
                        ? "border-[var(--orange-600)]"
                        : "border-[var(--line-amber)] opacity-80"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`thumb-${i}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--brown-700)]">{product?.title || (loading ? "Loading..." : "")}</h1>
            <p className="text-sm text-gray-600">
              by{" "}
              <span className="text-[var(--orange-600)]">
                {product?.seller || ""}
              </span>
            </p>

            {/* Rating */}
            <div className="text-sm text-yellow-600">⭐ {Number(product?.rating || 0).toFixed(1)} ({product?.reviews || 0} reviews)</div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-[var(--brown-700)]">{peso(product?.price || 0)}</div>
              {product?.oldPrice && (
                <>
                  <div className="text-gray-500 line-through">{peso(product.oldPrice)}</div>
                  <span className="text-green-600 font-medium">
                    Save {peso(Number(product.oldPrice) - Number(product.price))}
                  </span>
                </>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center border rounded-lg border-[var(--line-amber)]">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1 hover:bg-[var(--cream-50)]">
                  −
                </button>
                <span className="px-4">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="px-3 py-1 hover:bg-[var(--cream-50)]">
                  +
                </button>
              </div>
              <span className="text-xs text-gray-500">{typeof product?.stock_qty === "number" && product?.stock_qty >= 0 ? `${product.stock_qty} items available` : ""}</span>
            </div>

            {/* Actions */}
            <Button className="w-full" onClick={handleAddToCart} disabled={product?.outOfStock}>
              {product?.outOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
            <Button className="w-full" onClick={handleBuyNow} disabled={product?.outOfStock}>
              {product?.outOfStock
                ? "Buy Now"
                : `Buy Now – ${peso(Number(product?.price || 0) * qty)}`}
            </Button>

            {/* Seller info */}
            <div className="border border-[var(--line-amber)] rounded-2xl p-3 flex items-center justify-between mt-4">
              <div>
                <div className="font-semibold">{product?.seller || ""}</div>
                <div className="text-xs text-gray-600">⭐ 4.9 • 2847 sales</div>
              </div>
              <Button variant="secondary" className="text-xs px-3 py-1" onClick={openChat}>
                Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[var(--cream-50)] rounded-2xl border border-[var(--line-amber)] p-4">
          <div className="flex border-b border-[var(--line-amber)]">
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
                {t === "reviews" && `Reviews (${product?.reviews || 0})`}
              </button>
            ))}
          </div>

          {/* Panels */}
          {tab === "description" && (
            <div className="mt-4 text-sm text-gray-700">
              <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4">
                <div className="text-sm text-[var(--brown-700)] whitespace-pre-line">
                  {product?.description || "No description provided."}
                </div>
              </div>
            </div>
          )}

          {tab === "specs" && (
            <div className="mt-4 text-sm text-gray-700">
              <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4">
                <div className="grid sm:grid-cols-2 gap-y-2">
                  <div>
                    <strong>Dimensions:</strong>{" "}
                    {product && (product.length_cm || product.width_cm || product.height_cm)
                      ? `L:${product.length_cm ?? "-"}cm × W:${product.width_cm ?? "-"}cm × H:${product.height_cm ?? "-"}cm`
                      : "Not specified"}
                  </div>
                  <div>
                    <strong>Material:</strong>{" "}
                    {product && product.material ? product.material : "Not specified"}
                  </div>
                  <div>
                    <strong>Weight:</strong>{" "}
                    {product && product.weight_kg != null ? `${product.weight_kg} kg` : "Not specified"}
                  </div>
                  <div>
                    <strong>Color:</strong>{" "}
                    {product && product.color ? product.color : "Not specified"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "reviews" && (
            <div className="mt-4 space-y-4">
              <ReviewSummary
                average={4.8}
                total={product.reviews}
                dist={{ 5: 78, 4: 32, 3: 12, 2: 4, 1: 1 }}
              />
              <div className="space-y-4 mt-4">
                {[
                  {
                    name: "Maria Santos",
                    verified: true,
                    rating: 5,
                    date: "2024-12-15",
                    text:
                      "Excellent quality sofa! Very comfortable and the delivery was prompt. Highly recommended for families.",
                  },
                  {
                    name: "Juan dela Cruz",
                    verified: true,
                    rating: 4,
                    date: "2024-12-10",
                    text:
                      "Good value for money. The fabric is soft and durable. Assembly was straightforward.",
                  },
                  {
                    name: "Anna Reyes",
                    verified: false,
                    rating: 5,
                    date: "2024-12-05",
                    text:
                      "Perfect fit for my living room! The color matches exactly as shown in the pictures.",
                  },
                ].map((r, i) => (
                  // Remove helpful and reply by not passing those props
                  <ReviewCard key={i} r={{ ...r }} showActions={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
