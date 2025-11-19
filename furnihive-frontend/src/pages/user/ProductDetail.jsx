// src/pages/user/ProductDetail.jsx
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import Button from "../../components/ui/Button.jsx";
import ReviewSummary from "../../components/reviews/ReviewSummary.jsx";
import ReviewCard from "../../components/reviews/ReviewCard.jsx";
import { supabase } from "../../lib/supabaseClient";

import { useCart } from "../../components/contexts/CartContext.jsx";
import { useUI } from "../../components/contexts/UiContext.jsx";
import { useAuth } from "../../components/contexts/AuthContext.jsx";

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const IMAGES_PUBLIC = String(import.meta.env.VITE_PRODUCT_IMAGES_PUBLIC || "false").toLowerCase() === "true";

  const [selectedColor, setSelectedColor] = useState("Charcoal Gray");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState(sp.get("tab") || "description");
  const [mainIndex, setMainIndex] = useState(0);
  const [productReviews, setProductReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [storeStats, setStoreStats] = useState({ rating: 0, sales: 0 });

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

  // Load reviews for this product based on order_items -> reviews
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setProductReviews([]);
        return;
      }
      setReviewsLoading(true);
      try {
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("order_id")
          .eq("product_id", id);
        if (itemsErr) throw itemsErr;
        const orderIds = Array.from(new Set((items || []).map((r) => r.order_id).filter(Boolean)));
        if (!orderIds.length) {
          if (!cancelled) setProductReviews([]);
          return;
        }

        const { data: revs, error: revErr } = await supabase
          .from("reviews")
          .select(
            "id, order_id, user_id, rating, text, image_url, created_at, seller_reply, seller_reply_created_at"
          )
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });
        if (revErr) throw revErr;

        // Load basic profile info for reviewers so we can show avatar + name
        const userIds = Array.from(new Set((revs || []).map((r) => r.user_id).filter(Boolean)));
        const profilesById = new Map();
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name, avatar_url");
          (profs || []).forEach((p) => {
            if (!p?.id) return;
            profilesById.set(p.id, p);
          });
        }

        const mapped = (revs || []).map((r) => {
          let images = [];
          if (r.image_url) {
            try {
              const parsed = JSON.parse(r.image_url);
              if (Array.isArray(parsed)) {
                images = parsed;
              }
            } catch {
              // if it's already a plain URL string, fall through below
            }
            if (!images.length && typeof r.image_url === "string") {
              images = [r.image_url];
            }
          }

          const prof = r.user_id ? profilesById.get(r.user_id) || null : null;
          const buyerNameParts = [prof?.first_name, prof?.last_name].filter(Boolean);
          const buyerName = (buyerNameParts.join(" ").trim() || prof?.full_name || "").trim();
          const avatarUrl = prof?.avatar_url || null;

          return {
            id: r.id,
            rating: r.rating,
            text: r.text,
            date: (r.created_at || "").slice(0, 10),
            images,
            buyerName,
            avatarUrl,
            sellerReply: r.seller_reply || "",
            sellerReplyDate: r.seller_reply_created_at || null,
          };
        });

        if (!cancelled) {
          setProductReviews(mapped);
          const count = mapped.length;
          const avg = count
            ? mapped.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count
            : 0;
          setStoreStats({ rating: avg, sales: orderIds.length });
        }
      } catch {
        if (!cancelled) setProductReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const cart = useCart();
  const addToCartCtx = typeof cart.add === "function" ? cart.add : cart.addItem;
  const { showAddToCart, openAuth } = useUI();
  const { user } = useAuth();

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
        color: product.color,
        rating: product.rating,
        weight_kg: product.weight_kg || 0,
      }
    : null;

  const handleAddToCart = () => {
    if (!product || product.outOfStock) return;
    if (!user) {
      openAuth("login");
      return;
    }
    addToCartCtx(baseItem, qty);
    showAddToCart({
      title: product.title,
      qty,
      onViewCart: () => navigate("/cart"),
    });
  };

  const handleBuyNow = () => {
    if (!product || product.outOfStock) return;
    if (!user) {
      openAuth("login");
      return;
    }
    addToCartCtx(baseItem, qty);
    navigate("/checkout", {
      state: {
        // Limit checkout to just this product when coming from Buy Now
        selectedItems: [baseItem.id],
      },
    });
  };

  const openChat = () => {
    if (!baseItem) return;
    const params = new URLSearchParams();
    if (baseItem.seller) params.set("seller", baseItem.seller);
    if (baseItem.seller_id) params.set("sellerId", baseItem.seller_id);

    navigate(`/messages?${params.toString()}`, {
      state: {
        seller: {
          id: baseItem.seller_id,
          name: baseItem.seller,
          product: { id: baseItem.id, title: baseItem.title, image: baseItem.image },
        },
        prefill: `Hi! I'm interested in "${baseItem.title}". Is it available in ${selectedColor}?`,
      },
    });
  };

  const reviewCount = productReviews.length;
  const averageRating = reviewCount
    ? productReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewCount
    : 0;
  const dist = productReviews.reduce(
    (acc, r) => {
      const k = Number(r.rating || 0);
      if (k >= 1 && k <= 5) acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-8">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => navigate("/shop")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
          aria-label="Back to Shop"
        >
          ←
        </button>
        <div className="text-sm text-gray-600 flex flex-wrap gap-1">
          <span className="text-[var(--orange-600)]">Shop</span>
          <span>/</span>
          <span>{product?.category || "Living Room"}</span>
          <span>/</span>
          <span className="text-[var(--brown-700)] font-semibold">
            {product?.title || (loading ? "Loading..." : "")}
          </span>
        </div>
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
            <h1 className="text-2xl font-semibold text-[var(--brown-700)]">
              {product?.title || (loading ? "Loading..." : "")}
            </h1>
            <p className="text-sm text-gray-600">
              by{" "}
              <span className="text-[var(--orange-600)]">{product?.seller || ""}</span>
            </p>

            {/* Rating */}
            <div className="text-sm text-yellow-600">
              ⭐ {Number(averageRating || 0).toFixed(1)} ({reviewCount} reviews)
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-[var(--brown-700)]">
                {peso(product?.price || 0)}
              </div>
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
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 hover:bg-[var(--cream-50)]"
                >
                  −
                </button>
                <span className="px-4">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3 py-1 hover:bg-[var(--cream-50)]"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {typeof product?.stock_qty === "number" && product?.stock_qty >= 0
                  ? `${product.stock_qty} items available`
                  : ""}
              </span>
            </div>

            {/* Actions */}
            <Button
              className="w-full"
              onClick={handleAddToCart}
              disabled={product?.outOfStock}
            >
              {product?.outOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
            <Button
              className="w-full"
              onClick={handleBuyNow}
              disabled={product?.outOfStock}
            >
              {product?.outOfStock
                ? "Buy Now"
                : `Buy Now – ${peso(Number(product?.price || 0) * qty)}`}
            </Button>

            {/* Seller info */}
            <div className="border border-[var(--line-amber)] rounded-2xl p-3 flex items-center justify-between mt-4">
              <div>
                <div className="font-semibold">{product?.seller || ""}</div>
                <div className="text-xs text-gray-600">
                  ⭐ {storeStats.rating.toFixed(1)} • {storeStats.sales} sales
                </div>
              </div>
              <Button
                variant="secondary"
                className="text-xs px-3 py-1"
                onClick={openChat}
              >
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
                {t === "reviews" && `Reviews (${reviewCount})`}
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
                average={Number(averageRating.toFixed(1))}
                total={reviewCount}
                dist={dist}
              />
              <div className="space-y-4 mt-4">
                {reviewsLoading && (
                  <div className="text-sm text-gray-500">Loading reviews...</div>
                )}
                {!reviewsLoading && !productReviews.length && (
                  <div className="text-sm text-gray-500">No reviews yet for this product.</div>
                )}
                {!reviewsLoading &&
                  productReviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-[var(--line-amber)] bg-white p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {r.avatarUrl ? (
                            <img
                              src={r.avatarUrl}
                              alt={r.buyerName || "Buyer"}
                              className="h-8 w-8 rounded-full object-cover border border-[var(--line-amber)]"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-[var(--cream-50)] border border-[var(--line-amber)] flex items-center justify-center text-[10px] text-[var(--brown-700)]">
                              {(r.buyerName || "Buyer").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="text-xs font-semibold text-[var(--brown-700)]">
                            {r.buyerName || "Buyer"}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">{r.date}</div>
                      </div>
                      <div className="text-xs text-yellow-500 mb-1">
                        {"★".repeat(Number(r.rating || 0))}
                        {"☆".repeat(Math.max(0, 5 - Number(r.rating || 0)))}
                        <span className="ml-1 text-[11px] text-gray-600">({r.rating}/5)</span>
                      </div>
                      <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-start">
                        <div className="md:flex-1">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.text}</p>

                          {Array.isArray(r.images) && r.images.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {r.images.map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setPreviewImage(url)}
                                  className="h-20 w-20 rounded-lg border border-[var(--line-amber)] overflow-hidden bg-white"
                                >
                                  <img
                                    src={url}
                                    alt="Review image"
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {r.sellerReply && (
                          <div className="md:w-1/3 rounded-lg border border-[var(--line-amber)] bg-[var(--cream-50)] p-3 text-sm ml-auto">
                            <div className="text-xs font-semibold text-[var(--brown-700)] mb-1 text-right md:text-left">
                              Seller reply
                            </div>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap text-right md:text-left">
                              {r.sellerReply}
                            </div>
                            {r.sellerReplyDate && (
                              <div className="mt-1 text-[11px] text-gray-500 text-right md:text-left">
                                {new Date(r.sellerReplyDate).toLocaleDateString("en-PH", {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {previewImage && (
        <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4" onClick={() => setPreviewImage(null)}>
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full border border-[var(--line-amber)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--line-amber)]">
              <div className="text-sm font-semibold text-[var(--brown-700)]">Review photo</div>
              <button
                type="button"
                className="text-sm text-gray-600"
                onClick={() => setPreviewImage(null)}
              >
                ✕
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[80vh]">
              <img
                src={previewImage}
                alt="Review image preview"
                className="max-h-[80vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
