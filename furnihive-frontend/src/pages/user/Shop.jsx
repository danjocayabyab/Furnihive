import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/ProductCard.jsx";
import { featured as ALL_PRODUCTS } from "../../data/mockProducts.js";
import { supabase } from "../../lib/supabaseClient";

export default function Shop() {
  const [searchParams] = useSearchParams();

  const [checkedCats, setCheckedCats] = useState([]);
  const [priceMax, setPriceMax] = useState(100000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [remoteProducts, setRemoteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const CATS = ["Living Room", "Bedroom", "Dining", "Office"];

  // Preselect category from URL (e.g., /shop?category=Living%20Room)
  useEffect(() => {
    const qCat = searchParams.get("category");
    if (qCat && CATS.includes(qCat)) {
      setCheckedCats([qCat]);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load products from Supabase (schema: id, seller_id, name, base_price, status, category, ...)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, seller_id, name, slug, description, category, status, base_price, created_at"
        )
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error && Array.isArray(data)) {
          // Step 1: base mapping
          const base = data.map((r, i) => ({
            id: r.id,
            seller_id: r.seller_id,
            title: r.name || "Untitled",
            price: Number(r.base_price ?? 0),
            oldPrice: null,
            image: "",
            rating: 4.8,
            reviews: 0,
            outOfStock:
              r.status && r.status.toLowerCase() !== "active" && r.status.toLowerCase() !== "published",
            category: r.category || CATS[i % CATS.length],
            seller: undefined,
          }));

          // Step 2: load seller profiles in one query
          const sellerIds = Array.from(new Set(base.map((p) => p.seller_id).filter(Boolean)));
          let sellersById = {};
          if (sellerIds.length) {
            const { data: sellers } = await supabase
              .from("profiles")
              .select("id, store_name, first_name, last_name")
              .in("id", sellerIds);
            (sellers || []).forEach((s) => {
              const fullName = [s.first_name, s.last_name].filter(Boolean).join(" ").trim();
              sellersById[s.id] = s.store_name || fullName || null;
            });
          }

          // Step 3: resolve image URLs from storage bucket 'product-images'
          const withImages = await Promise.all(
            base.map(async (p) => {
              let img = "";
              try {
                // Convention: product-images/<product_id>/cover.jpg
                const path = `${p.id}/cover.jpg`;
                const { data: signed } = await supabase.storage
                  .from("product-images")
                  .createSignedUrl(path, 3600);
                img = signed?.signedUrl || "";
              } catch {}
              return {
                ...p,
                image:
                  img ||
                  "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
                seller: sellersById[p.seller_id] || undefined,
              };
            })
          );

          setRemoteProducts(withImages);
        } else {
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

  // Prefer remote products; fallback to mock if none
  const products = useMemo(() => {
    const base = remoteProducts.length
      ? remoteProducts
      : ALL_PRODUCTS.map((p, i) => ({
          ...p,
          category: p.category || CATS[i % CATS.length],
          outOfStock: p.outOfStock || false,
        }));
    return base;
  }, [remoteProducts]);

  const filtered = useMemo(() => {
    let list = products.filter(
      (p) =>
        p.price <= priceMax &&
        (!inStockOnly || !p.outOfStock) &&
        (checkedCats.length === 0 || checkedCats.includes(p.category))
    );
    if (sort === "priceLow") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceHigh") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, priceMax, inStockOnly, checkedCats, sort]);

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
          <Link
            to="/home"
            className="text-sm text-[var(--orange-600)] hover:underline"
          >
            ← Back to Home
          </Link>
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
