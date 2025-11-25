import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/ProductCard.jsx";
import { supabase } from "../../lib/supabaseClient";

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [checkedCats, setCheckedCats] = useState([]);
  const [priceMax, setPriceMax] = useState(100000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [remoteProducts, setRemoteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const CATS = ["Living Room", "Bedroom", "Dining", "Office"];
  const IMAGES_PUBLIC = String(import.meta.env.VITE_PRODUCT_IMAGES_PUBLIC || "false").toLowerCase() === "true";

  // Preselect category from URL (e.g., /shop?category=Living%20Room)
  useEffect(() => {
    const qCat = searchParams.get("category");
    if (qCat && CATS.includes(qCat)) {
      setCheckedCats([qCat]);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load products from Supabase (schema: id, seller_id, name, base_price, status, category, category_id, ...)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, seller_id, name, slug, description, category, category_id, status, base_price, stock_qty, color, weight_kg, created_at, featured_rank, categories(name)"
        )
        .order("created_at", { ascending: false });
      let rows = data;
      let err = error;
      // Fallback: if relation name is different or missing, retry without categories()
      if (err) {
        console.warn("Shop products query with categories() failed, retrying without join:", err?.message);
        const retry = await supabase
          .from("products")
          .select(
            "id, seller_id, name, slug, description, category, category_id, status, base_price, stock_qty, color, weight_kg, created_at, featured_rank"
          )
          .order("created_at", { ascending: false });
        rows = retry.data;
        err = retry.error;
      }
      if (!cancelled) {
        if (!err && Array.isArray(rows)) {
          // Step 1: base mapping
          const base = rows.map((r, i) => ({
            id: r.id,
            seller_id: r.seller_id,
            title: r.name || "Untitled",
            price: Number(r.base_price ?? 0),
            oldPrice: null,
            image: "",
            rating: 0,
            reviews: 0,
            stock_qty: typeof r.stock_qty === "number" ? r.stock_qty : null,
            outOfStock:
              (typeof r.stock_qty === "number" ? r.stock_qty <= 0 : false) ||
              (r.status && r.status.toLowerCase() !== "active" && r.status.toLowerCase() !== "published"),
            status: (r.status || "").toLowerCase(),
            category: r.categories?.name || r.category || CATS[i % CATS.length],
            category_id: r.category_id || null,
            color: r.color || "",
            weight_kg: r.weight_kg ?? null,
            featured_rank: typeof r.featured_rank === "number" ? r.featured_rank : 0,
            created_at: r.created_at || null,
            seller: undefined,
          }));

          // Step 2: aggregate real reviews per product (average rating + count)
          const productIds = base.map((p) => p.id);
          let ratingByProduct = {};
          if (productIds.length) {
            try {
              // Load order_items for these products
              const { data: items } = await supabase
                .from("order_items")
                .select("product_id, order_id")
                .in("product_id", productIds);

              const productToOrderIds = new Map();
              const orderIds = new Set();
              (items || []).forEach((row) => {
                if (!row?.product_id || !row?.order_id) return;
                const pid = row.product_id;
                const oid = row.order_id;
                if (!productToOrderIds.has(pid)) productToOrderIds.set(pid, []);
                productToOrderIds.get(pid).push(oid);
                orderIds.add(oid);
              });

              if (orderIds.size) {
                const { data: revs } = await supabase
                  .from("reviews")
                  .select("order_id, rating")
                  .in("order_id", Array.from(orderIds));

                const ratingsByOrder = new Map();
                (revs || []).forEach((r) => {
                  if (!r?.order_id) return;
                  const rating = Number(r.rating || 0);
                  if (!Number.isFinite(rating)) return;
                  ratingsByOrder.set(r.order_id, rating);
                });

                productToOrderIds.forEach((orderList, pid) => {
                  const ratings = orderList
                    .map((oid) => ratingsByOrder.get(oid))
                    .filter((v) => typeof v === "number" && Number.isFinite(v));
                  if (!ratings.length) return;
                  const sum = ratings.reduce((s, v) => s + v, 0);
                  const avg = sum / ratings.length;
                  ratingByProduct[pid] = { rating: avg, count: ratings.length };
                });
              }
            } catch {
              // If review aggregation fails, we simply keep defaults
            }
          }

          // Step 3: load store names by owner (seller) in one query
          const sellerIds = Array.from(new Set(base.map((p) => p.seller_id).filter(Boolean)));
          let storeNameByOwner = {};
          if (sellerIds.length) {
            const { data: stores } = await supabase
              .from("stores")
              .select("owner_id, name")
              .in("owner_id", sellerIds);
            (stores || []).forEach((s) => {
              storeNameByOwner[s.owner_id] = s.name || null;
            });
          }

          // Step 3: resolve image URLs from product_images table (primary/cover image)
          let coverById = {};
          if (productIds.length) {
            const { data: imgs } = await supabase
              .from("product_images")
              .select("product_id, url, path, is_primary, position, created_at")
              .in("product_id", productIds)
              .order("is_primary", { ascending: false })
              .order("position", { ascending: true })
              .order("created_at", { ascending: true });
            (imgs || []).forEach((row) => {
              // first seen per product given ordering will be the primary/cover
              if (!coverById[row.product_id]) coverById[row.product_id] = { url: row.url, path: row.path };
            });
          }
          const withImages = base.map((p) => {
            const entry = coverById[p.id] || null;
            let imageUrl = "";
            if (entry?.url) {
              imageUrl = entry.url; // direct URL if provided
            } else if (entry?.path) {
              if (IMAGES_PUBLIC) {
                const { data: pub } = supabase.storage.from("product-images").getPublicUrl(entry.path);
                imageUrl = pub?.publicUrl || "";
              }
            }
            const reviewInfo = ratingByProduct[p.id] || null;
            return {
              ...p,
              image: imageUrl,
              seller: storeNameByOwner[p.seller_id] || undefined,
              rating: reviewInfo ? reviewInfo.rating : 0,
              reviews: reviewInfo ? reviewInfo.count : 0,
            };
          });

          // Step 4: If bucket is private or any missing, sign URLs per missing
          const needSigning = withImages.some((p) => !p.image);
          let finalList = withImages;
          if (!IMAGES_PUBLIC && needSigning) {
            finalList = await Promise.all(
              withImages.map(async (p) => {
                if (p.image) return p;
                const entry = coverById[p.id];
                if (!entry?.path && !entry?.url) return {
                  ...p,
                  image:
                    "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
                };
                if (entry?.url) {
                  // direct URL provided
                  return { ...p, image: entry.url };
                }
                try {
                  const { data: signed } = await supabase.storage
                    .from("product-images")
                    .createSignedUrl(entry.path, 3600);
                  return { ...p, image: signed?.signedUrl || "" };
                } catch {
                  return { ...p, image: "" };
                }
              })
            );
          }

          // Fallback placeholder for any empty image
          finalList = finalList.map((p) => ({
            ...p,
            image:
              p.image ||
              "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
          }));

          setRemoteProducts(finalList);
        } else {
          if (err) console.warn("Shop products query failed:", err?.message);
          setRemoteProducts([]);
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Only use remote products (no mock fallback)
  const products = useMemo(() => remoteProducts, [remoteProducts]);

  const filtered = useMemo(() => {
    const rawQ = searchParams.get("q") || searchParams.get("query") || "";
    const q = rawQ.trim().toLowerCase();
    let list = products.filter((p) => {
      const status = (p.status || "").toLowerCase();
      const isVisibleStatus =
        !status || status === "active" || status === "published";
      return (
        isVisibleStatus &&
        p.price <= priceMax &&
        (!inStockOnly || !p.outOfStock) &&
        (checkedCats.length === 0 || checkedCats.includes(p.category)) &&
        (!q ||
          (p.title || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q))
      );
    });

    if (sort === "featured") {
      // Only show products explicitly marked as featured (featured_rank > 0)
      list = list.filter((p) => (typeof p.featured_rank === "number" ? p.featured_rank : 0) > 0);

      list = [...list].sort((a, b) => {
        const fa = typeof a.featured_rank === "number" ? a.featured_rank : 0;
        const fb = typeof b.featured_rank === "number" ? b.featured_rank : 0;
        if (fb !== fa) return fb - fa; // higher featured_rank first

        // tie-breaker: newest first by created_at
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    }

    if (sort === "priceLow") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceHigh") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, priceMax, inStockOnly, checkedCats, sort, searchParams]);

  const toggleCat = (c) =>
    setCheckedCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const clearAll = () => {
    setCheckedCats([]);
    setPriceMax(100000);
    setInStockOnly(false);
    setSort("featured");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Page heading */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
            aria-label="Back to Home"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">
            Shop
          </h1>
        </div>

        {/* Right side: product count + sort */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-[var(--brown-700)] whitespace-nowrap">
            {loading ? "Loading..." : `${filtered.length} products found`}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-sm"
          >
            <option value="featured">Featured</option>
            <option value="priceLow">Price: Low to High</option>
            <option value="priceHigh">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* MAIN LAYOUT: flex with fixed left sidebar */}
      <div className="flex gap-6 items-start">
        {/* LEFT: Filters */}
        <aside className="w-[260px] shrink-0 sticky top-20 self-start">
          <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
            <h3 className="flex items-center gap-2 text-[var(--brown-700)] font-semibold">
              Filters
            </h3>

            {/* Categories */}
            <div className="mt-5">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Categories
              </p>
              <div className="space-y-2">
                {CATS.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 text-sm text-gray-800"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={checkedCats.includes(c)}
                      onChange={() => toggleCat(c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div className="my-5 h-px bg-[var(--line-amber)]/60" />

            {/* Price Range */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                Price Range
              </p>
              <input
                type="range"
                min={0}
                max={100000}
                step={500}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-[var(--orange-600)]"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>₱0</span>
                <span>₱{priceMax.toLocaleString()}</span>
              </div>
            </div>

            <div className="my-5 h-px bg-[var(--line-amber)]/60" />

            {/* Stock */}
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              In Stock Only
            </label>

            <button
              onClick={clearAll}
              className="mt-4 w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm text-[var(--orange-600)] hover:bg-[var(--cream-50)]"
            >
              Clear All Filters
            </button>
          </div>
        </aside>

        {/* RIGHT: Products */}
        <section className="min-w-0 flex-1">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-6 text-center text-gray-600">
              {loading ? "Loading products..." : "No products yet"}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
