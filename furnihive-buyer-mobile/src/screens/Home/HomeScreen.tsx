import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { categories, featured as mockFeatured } from "@/src/data/mockProducts";
import { CategoryCard } from "@/src/components/CategoryCard";
import { ProductCard } from "@/src/components/ProductCard";
import { TopBar } from "@/src/components/TopBar";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";
import { useCart } from "@/src/context/CartContext";

export function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { add: addToCart } = useCart();
  const [featProducts, setFeatProducts] = useState(mockFeatured);
  const [loadingFeat, setLoadingFeat] = useState(false);
  const [errorFeat, setErrorFeat] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadFeatured() {
      setLoadingFeat(true);
      setErrorFeat("");
      try {
        let rows: any[] = [];
        let err: any = null;
        {
          const { data, error } = await supabase
            .from("products")
            .select(
              "id, seller_id, name, slug, description, category, category_id, status, base_price, stock_qty, color, weight_kg, created_at, featured_rank"
            )
            .gt("featured_rank", 0)
            .order("featured_rank", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(8);
          rows = Array.isArray(data) ? data : [];
          err = error;
        }

        if (!rows.length || err) {
          const { data: recent, error: err2 } = await supabase
            .from("products")
            .select(
              "id, seller_id, name, slug, description, category, category_id, status, base_price, stock_qty, color, weight_kg, created_at"
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
          rating: 0,
          reviews: 0,
          outOfStock:
            (typeof r.stock_qty === "number" ? r.stock_qty <= 0 : false) ||
            (r.status && r.status.toLowerCase() !== "active" && r.status.toLowerCase() !== "published"),
          category: r.category || "",
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

        withImages = withImages.map((p) => ({
          ...p,
          image:
            p.image ||
            "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
        }));

        // Load real review aggregates per product via order_items -> reviews
        try {
          if (productIds.length) {
            const { data: orderItems, error: oiErr } = await supabase
              .from("order_items")
              .select("order_id, product_id")
              .in("product_id", productIds);

            if (!oiErr && orderItems && orderItems.length) {
              const orderToProducts = new Map<string | number, Set<string | number>>();
              (orderItems || []).forEach((row: any) => {
                if (!row.order_id || !row.product_id) return;
                const key = row.order_id;
                if (!orderToProducts.has(key)) {
                  orderToProducts.set(key, new Set());
                }
                orderToProducts.get(key)!.add(row.product_id);
              });

              const orderIds = Array.from(orderToProducts.keys());
              if (orderIds.length) {
                const { data: revs, error: revErr } = await supabase
                  .from("reviews")
                  .select("order_id, rating")
                  .in("order_id", orderIds);

                if (!revErr && revs && revs.length) {
                  const agg: Record<string | number, { total: number; count: number }> = {};
                  (revs || []).forEach((r: any) => {
                    const set = orderToProducts.get(r.order_id);
                    if (!set) return;
                    const rating = Number(r.rating || 0) || 0;
                    set.forEach((pid) => {
                      if (!agg[pid]) agg[pid] = { total: 0, count: 0 };
                      agg[pid].total += rating;
                      agg[pid].count += 1;
                    });
                  });

                  withImages = withImages.map((p) => {
                    const a = agg[p.id];
                    if (!a || !a.count) return p;
                    return {
                      ...p,
                      rating: a.total / a.count,
                      reviews: a.count,
                    };
                  });
                }
              }
            }
          }
        } catch {
          // best-effort; fall back to default rating if this fails
        }

        if (!cancelled) setFeatProducts(withImages as any);
      } catch (e: any) {
        if (!cancelled) {
          setErrorFeat(e?.message || "Failed to load featured products");
          setFeatProducts(mockFeatured);
        }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TopBar />
      {/* Hero copy (simplified mobile version of web hero) */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>
          Transform Your{"\n"}Home with Quality{"\n"}Furniture
        </Text>
        <Text style={styles.heroSubtitle}>
          Discover thousands of furniture pieces from trusted Filipino retailers.
        </Text>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <Text style={styles.sectionSubtitle}>
          Explore our wide selection of furniture organized by room and function
        </Text>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.label}
          numColumns={4}
          scrollEnabled={false}
          columnWrapperStyle={styles.categoryRow}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <View style={styles.categoryCol}>
              <CategoryCard
                item={item}
                onPress={() =>
                  router.push({ pathname: "/explore", params: { category: item.label } })
                }
              />
            </View>
          )}
        />
      </View>

      {/* Featured products */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <Link href="/explore">
            <Text style={styles.viewAll}>View All</Text>
          </Link>
        </View>
        {loadingFeat && !errorFeat ? (
          <Text style={styles.stateText}>Loading products...</Text>
        ) : null}
        {errorFeat ? <Text style={styles.errorText}>{errorFeat}</Text> : null}
        {!loadingFeat && !errorFeat ? (
          <FlatList
            data={featProducts}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.productList}
            renderItem={({ item }) => (
              <View style={styles.productCol}>
                <ProductCard
                  product={{
                    id: item.id,
                    title: item.title,
                    price: item.price,
                    oldPrice: item.oldPrice,
                    image: item.image,
                    rating: item.rating,
                    reviews: item.reviews,
                    badge: item.badge,
                    outOfStock: item.outOfStock,
                    seller: (item as any).seller,
                  }}
                  onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(item.id) } })}
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
        ) : null}
      </View>

      {/* Promo banner */}
      <View style={styles.promoSection}>
        <View style={styles.promoLeft}>
          <Text style={styles.promoTag}>Limited Time Offer</Text>
          <Text style={styles.promoTitle}>Free Delivery on Orders Over ₱25,000</Text>
          <Text style={styles.promoBody}>
            Get your furniture delivered straight to your doorstep anywhere in Metro Manila.
            Valid until March 31, 2025.
          </Text>
        </View>
        <View style={styles.promoRight}>
          <Text style={styles.promoIcon}>📦</Text>
          <Text style={styles.promoFree}>FREE</Text>
          <Text style={styles.promoNote}>Nationwide Delivery</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefce8", // cream-50
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#422006", // brown-700
    lineHeight: 32,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#422006",
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#6b7280",
  },
  categoryList: {
    marginTop: 8,
  },
  categoryRow: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryCol: {
    width: "22%",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  viewAll: {
    fontSize: 12,
    color: "#ea580c",
    fontWeight: "600",
  },
  productList: {
    marginTop: 8,
  },
  productRow: {
    gap: 12,
    marginBottom: 12,
  },
  productCol: {
    flex: 1,
  },
  stateText: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#b91c1c",
    marginBottom: 4,
  },
  promoSection: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  promoLeft: {
    flex: 1,
  },
  promoTag: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#422006",
    marginBottom: 4,
  },
  promoBody: {
    fontSize: 13,
    color: "#374151",
  },
  promoRight: {
    width: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fefce8",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  promoIcon: {
    fontSize: 32,
  },
  promoFree: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#422006",
  },
  promoNote: {
    marginTop: 2,
    fontSize: 11,
    color: "#4b5563",
  },
});
