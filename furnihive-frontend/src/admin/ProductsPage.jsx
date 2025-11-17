import { useEffect, useMemo, useRef, useState } from "react";
import { listProductsForAdmin, updateFeaturedRank, updateHeroRank } from "./api/adminApi";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [savingHeroId, setSavingHeroId] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("info"); // info | success | error
  const lastSaveAtRef = useRef({});
  const lastHeroSaveAtRef = useRef({});
  // Saved visual state removed per request; toast is sufficient

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const list = await listProductsForAdmin({ limit: 200 });
        if (alive) setProducts(list);
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load products");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast("") , 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.title.toLowerCase().includes(q) || String(p.category || "").toLowerCase().includes(q)
    );
  }, [products, query]);

  const handleSaveRank = async (id, next) => {
    const now = Date.now();
    const last = lastSaveAtRef.current[id] || 0;
    if (now - last < 500) return; // debounce 500ms
    lastSaveAtRef.current[id] = now;
    try {
      setSavingId(id);
      // optimistic
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured_rank: next } : p)));
      const res = await updateFeaturedRank(id, next);
      // ensure exact
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured_rank: res.featured_rank } : p)));
      setToastType("success");
      setToast(`Saved rank ${res.featured_rank}`);
    } catch (e) {
      setToastType("error");
      setToast(e?.message || "Failed to save rank");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveHeroRank = async (id, next) => {
    const now = Date.now();
    const last = lastHeroSaveAtRef.current[id] || 0;
    if (now - last < 500) return; // debounce 500ms
    lastHeroSaveAtRef.current[id] = now;
    try {
      setSavingHeroId(id);
      // optimistic
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, hero_rank: next } : p)));
      const res = await updateHeroRank(id, next);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, hero_rank: res.hero_rank } : p)));
      setToastType("success");
      setToast(`Saved hero rank ${res.hero_rank}`);
    } catch (e) {
      setToastType("error");
      setToast(e?.message || "Failed to save hero rank");
    } finally {
      setSavingHeroId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--brown-700)]">Products</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="h-9 w-[260px] rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm placeholder:text-[var(--brown-700)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading && (
          <div className="col-span-full text-sm text-[var(--brown-700)]/70">Loading products...</div>
        )}
        {!loading && filtered.map((p) => (
          <div key={p.id} className="rounded-xl border border-[var(--line-amber)] bg-white overflow-hidden">
            <div className="aspect-[4/3] bg-[var(--cream-50)] border-b border-[var(--line-amber)]">
              <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-3 space-y-2">
              <div className="text-sm font-semibold text-[var(--brown-700)] truncate" title={p.title}>{p.title}</div>
              <div className="text-xs text-gray-600 truncate">{p.category || "Uncategorized"}</div>
              <div className="text-xs text-gray-600">₱{Number(p.price).toLocaleString()}</div>

              <div className="mt-2 grid grid-cols-[auto,1fr,auto] items-center gap-2">
                <label className="text-xs text-[var(--brown-700)]">Featured rank</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="h-8 rounded-lg border border-[var(--line-amber)] bg-white px-2 text-sm w-full"
                  value={p.featured_rank}
                  disabled={savingId === p.id}
                  onChange={(e) => {
                    const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured_rank: v } : x)));
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveRank(p.id, p.featured_rank)}
                  disabled={savingId === p.id}
                  className={[
                    "h-8 min-w-[84px] px-3 rounded-lg text-white text-xs flex items-center justify-center gap-2",
                    "bg-[var(--orange-600)] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-orange-300/50",
                    (savingId === p.id) && "disabled:opacity-60",
                  ].join(" ")}
                >
                  {(savingId === p.id) && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  )}
                  <span>{savingId === p.id ? "Saving" : "Save"}</span>
                </button>
              </div>

              <div className="mt-2 grid grid-cols-[auto,1fr,auto] items-center gap-2">
                <label className="text-xs text-[var(--brown-700)]">Hero rank</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="h-8 rounded-lg border border-[var(--line-amber)] bg-white px-2 text-sm w-full"
                  value={p.hero_rank}
                  disabled={savingHeroId === p.id}
                  onChange={(e) => {
                    const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, hero_rank: v } : x)));
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveHeroRank(p.id, p.hero_rank)}
                  disabled={savingHeroId === p.id}
                  className={[
                    "h-8 min-w-[84px] px-3 rounded-lg text-white text-xs flex items-center justify-center gap-2",
                    "bg-[var(--orange-600)] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-orange-300/50",
                    (savingHeroId === p.id) && "disabled:opacity-60",
                  ].join(" ")}
                >
                  {(savingHeroId === p.id) && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  )}
                  <span>{savingHeroId === p.id ? "Saving" : "Save"}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div
          className={[
            "fixed z-50 top-4 right-4 rounded-lg px-3 py-2 text-sm shadow-card",
            toastType === "success" && "border border-green-200 bg-green-50 text-green-700",
            toastType === "error" && "border border-red-200 bg-red-50 text-red-700",
            toastType === "info" && "border border-[var(--line-amber)] bg-white text-[var(--brown-700)]",
          ].filter(Boolean).join(" ")}
          role="status" aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
