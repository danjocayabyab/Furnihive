import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/ProductCard.jsx";
import { featured as ALL_PRODUCTS } from "../../data/mockProducts.js";

export default function Shop() {
  const [searchParams] = useSearchParams();

  const [checkedCats, setCheckedCats] = useState([]);
  const [priceMax, setPriceMax] = useState(100000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const CATS = ["Living Room", "Bedroom", "Dining", "Office"];

  // Preselect category from URL (e.g., /shop?category=Living%20Room)
  useEffect(() => {
    const qCat = searchParams.get("category");
    if (qCat && CATS.includes(qCat)) {
      setCheckedCats([qCat]);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // demo: add missing props for filtering
  const products = useMemo(
    () =>
      ALL_PRODUCTS.map((p, i) => ({
        ...p,
        category: p.category || CATS[i % CATS.length],
        outOfStock: p.outOfStock || false,
      })),
    []
  );

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
    setCheckedCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const clearAll = () => {
    setCheckedCats([]);
    setPriceMax(100000);
    setInStockOnly(false);
    setSort("featured");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Page heading */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/home" className="text-sm text-[var(--orange-600)] hover:underline">
          ← Back to Home
        </Link>
        <h1 className="text-xl font-semibold text-[var(--brown-700)]">Shop</h1>
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
              <p className="text-xs font-medium text-gray-600 mb-2">Categories</p>
              <div className="space-y-2">
                {CATS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-gray-800">
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
              <p className="text-xs font-medium text-gray-600 mb-2">Price Range</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="text-sm text-[var(--brown-700)]">
              {filtered.length} products found
            </div>
            <div>
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
