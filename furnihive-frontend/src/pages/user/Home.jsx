import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CategoryCard from "../../components/CategoryCard.jsx";
import ProductCard from "../../components/ProductCard.jsx";
import Button from "../../components/ui/Button.jsx";
import { supabase } from "../../lib/supabaseClient";

export default function Home() {
  const navigate = useNavigate();
  const [catCards, setCatCards] = useState([]);
  const [featProducts, setFeatProducts] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingFeat, setLoadingFeat] = useState(false);
  const [errorCats, setErrorCats] = useState("");
  const [errorFeat, setErrorFeat] = useState("");
  const [heroItems, setHeroItems] = useState([]);
  const [loadingHero, setLoadingHero] = useState(false);
  const [errorHero, setErrorHero] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const IMAGES_PUBLIC = String(import.meta.env.VITE_PRODUCT_IMAGES_PUBLIC || "false").toLowerCase() === "true";

  // Load categories: pick one representative product image per category and count products
  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      setLoadingCats(true);
      setErrorCats("");
      try {
        // Get recent products with category info
        const { data, error } = await supabase
          .from("products")
          .select("id, category, category_id, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];

        // Build map: category -> { count, representativeProductId }
        const byCat = new Map();
        for (const r of rows) {
          const key = r.category || "Uncategorized";
          const entry = byCat.get(key) || { count: 0, productId: null };
          entry.count += 1;
          if (!entry.productId) entry.productId = r.id;
          byCat.set(key, entry);
        }

        const catEntries = Array.from(byCat.entries());
        const prodIds = catEntries.map(([, v]) => v.productId).filter(Boolean);

        // Fetch cover images for representative products
        let coverById = {};
        if (prodIds.length) {
          const { data: imgs } = await supabase
            .from("product_images")
            .select("product_id, url, path, is_primary, position, created_at")
            .in("product_id", prodIds)
            .order("is_primary", { ascending: false })
            .order("position", { ascending: true })
            .order("created_at", { ascending: true });
          (imgs || []).forEach((row) => {
            if (!coverById[row.product_id]) coverById[row.product_id] = { url: row.url, path: row.path };
          });
        }

        // Build CategoryCard items
        let items = await Promise.all(
          catEntries.map(async ([label, v]) => {
            const entry = coverById[v.productId] || null;
            let imageUrl = "";
            if (entry?.url) imageUrl = entry.url;
            else if (entry?.path) {
              if (IMAGES_PUBLIC) {
                const { data: pub } = supabase.storage.from("product-images").getPublicUrl(entry.path);
                imageUrl = pub?.publicUrl || "";
              } else {
                try {
                  const { data: signed } = await supabase.storage
                    .from("product-images")
                    .createSignedUrl(entry.path, 3600);
                  imageUrl = signed?.signedUrl || "";
                } catch {
                  imageUrl = "";
                }
              }
            }
            if (!imageUrl) {
              imageUrl = "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop";
            }
            return {
              label,
              image: imageUrl,
              meta: `${v.count} product${v.count === 1 ? "" : "s"}`,
            };
          })
        );

        // Sort to fixed order, then others alphabetically
        const ORDER = ["Living Room", "Bedroom", "Dining", "Office"];
        items.sort((a, b) => {
          const ia = ORDER.indexOf(a.label);
          const ib = ORDER.indexOf(b.label);
          const ra = ia === -1 ? 999 : ia;
          const rb = ib === -1 ? 999 : ib;
          if (ra !== rb) return ra - rb;
          // both not in ORDER or same position -> alphabetical
          return a.label.localeCompare(b.label);
        });

        // Show up to 8 categories
        items = items.slice(0, 8);
        if (!cancelled) setCatCards(items);
      } catch (e) {
        if (!cancelled) setErrorCats(e?.message || "Failed to load categories");
        if (!cancelled) setCatCards([]);
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load hero slideshow items via hero_rank
  useEffect(() => {
    let cancelled = false;
    async function loadHero() {
      setLoadingHero(true);
      setErrorHero("");
      try {
        let rows = [];
        // Prefer products with hero_rank > 0 ordered by rank
        {
          const { data, error } = await supabase
            .from("products")
            .select(
              "id, name, slug, category, status, base_price, created_at, hero_rank"
            )
            .gt("hero_rank", 0)
            .order("hero_rank", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(10);
          if (error) throw error;
          rows = Array.isArray(data) ? data : [];
        }

        // If none configured, fallback to latest one product
        if (!rows.length) {
          const { data } = await supabase
            .from("products")
            .select("id, name, slug, category, status, base_price, created_at")
            .order("created_at", { ascending: false })
            .limit(1);
          rows = Array.isArray(data) ? data : [];
        }

        const ids = rows.map((r) => r.id);
        let coverById = {};
        if (ids.length) {
          const { data: imgs } = await supabase
            .from("product_images")
            .select("product_id, url, path, is_primary, position, created_at")
            .in("product_id", ids)
            .order("is_primary", { ascending: false })
            .order("position", { ascending: true })
            .order("created_at", { ascending: true });
          (imgs || []).forEach((row) => {
            if (!coverById[row.product_id]) coverById[row.product_id] = { url: row.url, path: row.path };
          });
        }

        let items = await Promise.all(
          rows.map(async (r) => {
            const entry = coverById[r.id] || null;
            let image = "";
            if (entry?.url) image = entry.url;
            else if (entry?.path) {
              if (IMAGES_PUBLIC) {
                const { data: pub } = supabase.storage.from("product-images").getPublicUrl(entry.path);
                image = pub?.publicUrl || "";
              } else {
                try {
                  const { data: signed } = await supabase.storage
                    .from("product-images")
                    .createSignedUrl(entry.path, 3600);
                  image = signed?.signedUrl || "";
                } catch {
                  image = "";
                }
              }
            }
            return {
              id: r.id,
              title: r.name || "Untitled",
              price: Number(r.base_price ?? 0),
              image:
                image ||
                "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=1600&auto=format&fit=crop",
            };
          })
        );

        if (!cancelled) {
          setHeroItems(items);
          setHeroIndex(0);
        }
      } catch (e) {
        if (!cancelled) {
          setErrorHero(e?.message || "Failed to load hero content");
          setHeroItems([]);
        }
      } finally {
        if (!cancelled) setLoadingHero(false);
      }
    }
    loadHero();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    if (!heroItems.length) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroItems.length), 5000);
    return () => clearInterval(t);
  }, [heroItems.length]);

  // Load featured products: recent products as "featured"
  useEffect(() => {
    let cancelled = false;
    async function loadFeatured() {
      setLoadingFeat(true);
      setErrorFeat("");
      try {
        // 1) Try featured by rank
        let rows = [];
        let err = null;
        {
          const { data, error } = await supabase
            .from("products")
            .select(
              "id, seller_id, name, slug, description, category, category_id, status, base_price, stock_qty, color, created_at, featured_rank"
            )
            .gt("featured_rank", 0)
            .order("featured_rank", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(8);
          rows = Array.isArray(data) ? data : [];
          err = error;
        }

        // 2) Fallback to recent if no featured
        if (!rows.length || err) {
          const { data: recent, error: err2 } = await supabase
            .from("products")
            .select(
              "id, seller_id, name, slug, description, category, category_id, status, base_price, stock_qty, color, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(8);
          rows = Array.isArray(recent) ? recent : [];
          err = err2;
        }

        const base = rows.map((r) => ({
          id: r.id,
          seller_id: r.seller_id,
          title: r.name || "Untitled",
          price: Number(r.base_price ?? 0),
          oldPrice: null,
          image: "",
          rating: 4.8,
          reviews: 0,
          outOfStock:
            (typeof r.stock_qty === "number" ? r.stock_qty <= 0 : false) ||
            (r.status && r.status.toLowerCase() !== "active" && r.status.toLowerCase() !== "published"),
          category: r.category || "",
          category_id: r.category_id || null,
          color: r.color || "",
          seller: undefined,
        }));

        const productIds = base.map((p) => p.id);
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
            if (!coverById[row.product_id]) coverById[row.product_id] = { url: row.url, path: row.path };
          });
        }

        let withImages = await Promise.all(
          base.map(async (p) => {
            const entry = coverById[p.id] || null;
            let imageUrl = "";
            if (entry?.url) imageUrl = entry.url;
            else if (entry?.path) {
              if (IMAGES_PUBLIC) {
                const { data: pub } = supabase.storage.from("product-images").getPublicUrl(entry.path);
                imageUrl = pub?.publicUrl || "";
              } else {
                try {
                  const { data: signed } = await supabase.storage
                    .from("product-images")
                    .createSignedUrl(entry.path, 3600);
                  imageUrl = signed?.signedUrl || "";
                } catch {
                  imageUrl = "";
                }
              }
            }
            return { ...p, image: imageUrl };
          })
        );

        // Fallback placeholder for any empty image
        withImages = withImages.map((p) => ({
          ...p,
          image:
            p.image ||
            "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
        }));

        if (!cancelled) setFeatProducts(withImages);
      } catch (e) {
        if (!cancelled) setErrorFeat(e?.message || "Failed to load featured products");
        if (!cancelled) setFeatProducts([]);
      } finally {
        if (!cancelled) setLoadingFeat(false);
      }
    }
    loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 grid md:grid-cols-2 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--brown-700)] leading-tight">
              Transform Your<br />Home with Quality<br />Furniture
            </h1>
            <p className="mt-3 text-sm text-gray-700 max-w-md">
              Discover thousands of furniture pieces from trusted Filipino retailers.
              From modern designs to classic styles, find everything you need.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={() => navigate("/shop")}>Shop Now</Button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-[var(--line-amber)] relative bg-[var(--cream-50)]">
            <div className="relative aspect-[16/9] w-full">
              {loadingHero && (
                <div className="absolute inset-0 grid place-items-center text-sm text-[var(--brown-700)]/70">Loading...</div>
              )}
              {errorHero && (
                <div className="absolute inset-0 grid place-items-center text-sm text-red-600">{errorHero}</div>
              )}
              {!loadingHero && !errorHero && heroItems.length > 0 && (
                <>
                  <img
                    key={heroItems[heroIndex]?.id || heroIndex}
                    src={heroItems[heroIndex]?.image}
                    alt={heroItems[heroIndex]?.title || "Hero"}
                    className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300"
                  />
                  {heroItems.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
                      {heroItems.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setHeroIndex(i)}
                          className={[
                            "h-2 w-2 rounded-full border",
                            i === heroIndex ? "bg-white border-white" : "bg-white/60 border-white/60",
                          ].join(" ")}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--line-amber)]" />
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--brown-700)]">Shop by Category</h2>
          <p className="text-sm text-gray-600">
            Explore our wide selection of furniture organized by room and function
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {loadingCats && (
            <div className="col-span-full text-center text-sm text-gray-600">Loading categories...</div>
          )}
          {errorCats && (
            <div className="col-span-full text-center text-sm text-red-600">{errorCats}</div>
          )}
          {!loadingCats && !errorCats && catCards.map((c, i) => <CategoryCard key={i} item={c} />)}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--brown-700)]">Featured Products</h2>
          <Button
            variant="secondary"
            className="text-xs px-3 py-1.5"
            onClick={() => navigate("/shop")}
          >
            View All
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loadingFeat && (
            <div className="col-span-full text-center text-sm text-gray-600">Loading products...</div>
          )}
          {errorFeat && (
            <div className="col-span-full text-center text-sm text-red-600">{errorFeat}</div>
          )}
          {!loadingFeat && !errorFeat && featProducts.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Promo banner */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-xl border border-[var(--line-amber)] bg-white p-5 md:p-6 grid md:grid-cols-[1fr,260px] gap-4 items-center">
          <div>
            <div className="text-[11px] text-gray-600 mb-1">Limited Time Offer</div>
            <h3 className="text-[var(--brown-700)] font-bold">
              Free Delivery on Orders Over ₱25,000
            </h3>
            <p className="text-sm text-gray-700 mt-1">
              Get your furniture delivered straight to your doorstep anywhere in Metro Manila.
              Valid until March 31, 2025.
            </p>
            <Button className="mt-3" onClick={() => navigate("/shop")}>
              Shop Now & Save
            </Button>
          </div>
          <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] px-6 py-5 text-center">
            <div className="text-5xl">📦</div>
            <div className="font-bold mt-1">FREE</div>
            <div className="text-xs text-gray-700">Nationwide Delivery</div>
          </div>
        </div>
      </section>
    </div>
  );
}
