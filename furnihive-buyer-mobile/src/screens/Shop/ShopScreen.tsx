import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { ProductCard, MobileProduct } from "@/src/components/ProductCard";
import { TopBar } from "@/src/components/TopBar";
import { useAuth } from "@/src/context/AuthContext";
import { useCart } from "@/src/context/CartContext";

const CATS = ["Living Room", "Bedroom", "Dining", "Office"];

export function ShopScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { add: addToCart } = useCart();
  const [checkedCats, setCheckedCats] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(100000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<"featured" | "priceLow" | "priceHigh">("featured");
  const [remoteProducts, setRemoteProducts] = useState<MobileProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      const { data, error: err } = await supabase
        .from("products")
        .select(
          "id, seller_id, name, slug, description, category, category_id, status, base_price, stock_qty, color, weight_kg, created_at"
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (err) {
        console.warn("Shop products query failed:", err?.message);
        setError(err.message || "Failed to load products");
        setRemoteProducts([]);
        setLoading(false);
        return;
      }

      const rows = Array.isArray(data) ? data : [];

      const base = rows.map((r, i) => ({
        id: r.id,
        seller_id: r.seller_id,
        title: r.name || "Untitled",
        price: Number(r.base_price ?? 0),
        oldPrice: null,
        image: "",
        rating: 0,
        reviews: 0,
        outOfStock:
          (typeof r.stock_qty === "number" ? r.stock_qty <= 0 : false) ||
          (r.status && r.status.toLowerCase() !== "active" && r.status.toLowerCase() !== "published"),
        category: r.category || CATS[i % CATS.length],
        category_id: r.category_id || null,
        color: r.color || "",
        weight_kg: r.weight_kg ?? null,
        seller: undefined,
      }));

      const productIds = base.map((p) => p.id);
      let coverById: Record<string, { url: string | null; path: string | null }> = {};
      if (productIds.length) {
        const { data: imgs } = await supabase
          .from("product_images")
          .select("product_id, url, path, is_primary, position, created_at")
          .in("product_id", productIds)
          .order("is_primary", { ascending: false })
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });
        (imgs || []).forEach((row: any) => {
          if (!coverById[row.product_id]) coverById[row.product_id] = { url: row.url, path: row.path };
        });
      }

      const IMAGES_PUBLIC = String(
        process.env.EXPO_PUBLIC_PRODUCT_IMAGES_PUBLIC ?? "false"
      ).toLowerCase() === "true";

      const withImages = await Promise.all(
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
          return {
            ...p,
            image:
              imageUrl ||
              "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
          } as MobileProduct;
        })
      );

      if (!cancelled) {
        setRemoteProducts(withImages);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = remoteProducts.filter(
      (p) =>
        p.price <= priceMax &&
        (!inStockOnly || !p.outOfStock) &&
        (checkedCats.length === 0 || checkedCats.includes((p as any).category))
    );
    if (sort === "priceLow") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceHigh") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [remoteProducts, priceMax, inStockOnly, checkedCats, sort]);

  const toggleCat = (c: string) => {
    setCheckedCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const clearAll = () => {
    setCheckedCats([]);
    setPriceMax(100000);
    setInStockOnly(false);
    setSort("featured");
  };

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Shop</Text>
        <Text style={styles.countText}>
          {loading ? "Loading..." : `${filtered.length} products found`}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>Filters</Text>
        <Text style={styles.filtersLabel}>Categories</Text>
        <View style={styles.chipRow}>
          {CATS.map((c) => {
            const active = checkedCats.includes(c);
            return (
              <TouchableOpacity
                key={c}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleCat(c)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <TouchableOpacity onPress={() => setInStockOnly((v) => !v)}>
            <Text style={styles.switchLabel}>
              {inStockOnly ? "☑" : "☐"} In Stock Only
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortRow}>
          <Text style={styles.filtersLabel}>Sort</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortChip, sort === "featured" && styles.sortChipActive]}
              onPress={() => setSort("featured")}
            >
              <Text
                style={[styles.sortChipText, sort === "featured" && styles.sortChipTextActive]}
              >
                Featured
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortChip, sort === "priceLow" && styles.sortChipActive]}
              onPress={() => setSort("priceLow")}
            >
              <Text
                style={[styles.sortChipText, sort === "priceLow" && styles.sortChipTextActive]}
              >
                Price: Low
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortChip, sort === "priceHigh" && styles.sortChipActive]}
              onPress={() => setSort("priceHigh")}
            >
              <Text
                style={[styles.sortChipText, sort === "priceHigh" && styles.sortChipTextActive]}
              >
                Price: High
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
          <Text style={styles.clearButtonText}>Clear All Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Products */}
      <View style={styles.productsSection}>
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#ea580c" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        )}
        {!loading && filtered.length === 0 && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>{error || "No products yet"}</Text>
          </View>
        )}

        {!loading && filtered.length > 0 && (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.productList}
            renderItem={({ item }) => (
              <View style={styles.productCol}>
                <ProductCard
                  product={item}
                  onPress={() =>
                    router.push({ pathname: "/product/[id]", params: { id: String(item.id) } })
                  }
                  onAddToCart={() => {
                    if (!user) {
                      router.push("/(tabs)/profile");
                      return;
                    }
                    addToCart(
                      {
                        id: item.id,
                        title: item.title,
                        price: item.price,
                        image: item.image,
                      },
                      1
                    );
                  }}
                />
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#422006",
  },
  countText: {
    fontSize: 12,
    color: "#422006",
  },
  filtersCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
    marginBottom: 8,
  },
  filtersLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4b5563",
    marginTop: 4,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  chipActive: {
    borderColor: "#f97316",
    backgroundColor: "#fffbeb",
  },
  chipText: {
    fontSize: 12,
    color: "#4b5563",
  },
  chipTextActive: {
    color: "#ea580c",
    fontWeight: "600",
  },
  switchRow: {
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 12,
    color: "#374151",
  },
  sortRow: {
    marginTop: 12,
  },
  sortButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  sortChipActive: {
    borderColor: "#f97316",
    backgroundColor: "#fffbeb",
  },
  sortChipText: {
    fontSize: 12,
    color: "#4b5563",
  },
  sortChipTextActive: {
    color: "#ea580c",
    fontWeight: "600",
  },
  clearButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#fffbeb",
  },
  clearButtonText: {
    fontSize: 12,
    color: "#ea580c",
    fontWeight: "600",
  },
  productsSection: {
    flex: 1,
    marginBottom: 16,
  },
  loadingBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#4b5563",
  },
  productList: {
    paddingBottom: 80,
  },
  productRow: {
    gap: 12,
    marginBottom: 12,
  },
  productCol: {
    flex: 1,
  },
});
