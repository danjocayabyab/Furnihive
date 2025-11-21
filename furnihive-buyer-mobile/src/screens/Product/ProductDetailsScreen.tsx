import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image, ScrollView, TouchableOpacity } from "react-native";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";
import { useCart } from "@/src/context/CartContext";
import { useRouter } from "expo-router";

type Props = {
  id: string;
  onBack?: () => void;
};

type LoadedProduct = {
  id: string | number;
  seller_id: string | number | null;
  title: string;
  description: string;
  category: string;
  price: number;
  image: string;
  images: string[];
  seller?: string;
  outOfStock: boolean;
  stock_qty: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  material: string;
  weight_kg: number | null;
  color: string;
};

export function ProductDetailsScreen({ id, onBack }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { add: addToCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<LoadedProduct | null>(null);
  const [mainIndex, setMainIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"description" | "specs" | "reviews">("description");
  const [reviews, setReviews] = useState<
    {
      id: string | number;
      rating: number;
      text: string;
      date: string;
      buyerName: string;
      images: string[];
      sellerReply: string;
      sellerReplyDate: string | null;
    }[]
  >([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: p, error: err } = await supabase
          .from("products")
          .select(
            "id, seller_id, name, description, category, status, base_price, stock_qty, length_cm, width_cm, height_cm, material, weight_kg, color"
          )
          .eq("id", id)
          .maybeSingle();

        if (err) throw err;
        if (!p) throw new Error("Product not found");

        // Store name
        let storeName: string | undefined = undefined;
        if (p.seller_id) {
          const { data: stores } = await supabase
            .from("stores")
            .select("owner_id, name")
            .eq("owner_id", p.seller_id)
            .limit(1);
          storeName = stores?.[0]?.name || undefined;
        }

        // Images
        const { data: imgs } = await supabase
          .from("product_images")
          .select("url, path, is_primary, position, created_at")
          .eq("product_id", p.id)
          .order("is_primary", { ascending: false })
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });

        const ordered = (imgs || []).slice();
        const IMAGES_PUBLIC = String(
          process.env.EXPO_PUBLIC_PRODUCT_IMAGES_PUBLIC ?? "false"
        ).toLowerCase() === "true";

        const resolvedImages: string[] = [];
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
            } catch {
              // ignore
            }
          }
        }

        const cover = resolvedImages[0] || "";
        const mapped: LoadedProduct = {
          id: p.id,
          seller_id: p.seller_id,
          title: p.name || "Untitled",
          description: p.description || "",
          category: p.category || "",
          price: Number(p.base_price ?? 0),
          image:
            cover ||
            "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
          images: resolvedImages,
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

        if (!cancelled) {
          setProduct(mapped);
          setMainIndex(0);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load product");
          setProduct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setReviews([]);
        return;
      }
      setReviewsLoading(true);
      try {
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("order_id")
          .eq("product_id", id);
        if (itemsErr) throw itemsErr;
        const orderIds = Array.from(
          new Set((items || []).map((r: any) => r.order_id).filter(Boolean))
        );
        if (!orderIds.length) {
          if (!cancelled) setReviews([]);
          return;
        }

        const { data: revs, error: revErr } = await supabase
          .from("reviews")
          .select(
            "id, order_id, user_id, rating, text, image_url, seller_reply, seller_reply_created_at, created_at"
          )
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });
        if (revErr) throw revErr;

        const userIds = Array.from(
          new Set((revs || []).map((r: any) => r.user_id).filter(Boolean))
        );
        const profilesById = new Map<string, any>();
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name");
          (profs || []).forEach((p: any) => {
            if (!p?.id) return;
            profilesById.set(p.id, p);
          });
        }

        const mapped = (revs || []).map((r: any) => {
          const prof = r.user_id ? profilesById.get(r.user_id) || null : null;
          const buyerNameParts = [prof?.first_name, prof?.last_name].filter(Boolean);
          const buyerName =
            (buyerNameParts.join(" ").trim() || prof?.full_name || "").trim() || "Buyer";

          let images: string[] = [];
          if (r.image_url) {
            try {
              const parsed = JSON.parse(r.image_url);
              if (Array.isArray(parsed)) images = parsed;
            } catch {
              if (typeof r.image_url === "string") images = [r.image_url];
            }
          }
          return {
            id: r.id,
            rating: Number(r.rating || 0),
            text: r.text || "",
            date: (r.created_at || "").slice(0, 10),
            buyerName,
            images,
            sellerReply: r.seller_reply || "",
            sellerReplyDate: r.seller_reply_created_at || null,
          };
        });

        if (!cancelled) setReviews(mapped);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ea580c" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Product not found"}</Text>
      </View>
    );
  }

  const images = product.images && product.images.length ? product.images : [product.image];
  const mainImage = images[mainIndex] || images[0];

  const handleAddToCart = () => {
    if (product.outOfStock) return;
    if (!user) {
      router.push("/(tabs)/profile");
      return;
    }
    addToCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
      },
      qty
    );
  };

  const handleBuyNow = () => {
    if (product.outOfStock) return;
    if (!user) {
      router.push("/(tabs)/profile");
      return;
    }
    addToCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
      },
      qty
    );
    router.push({ pathname: "/cart" });
  };

  const handleChat = async () => {
    if (!user) {
      router.push("/(tabs)/profile");
      return;
    }
    if (!product.seller_id) {
      router.push({ pathname: "/messages" });
      return;
    }

    try {
      const { data: existing, error } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", product.seller_id)
        .maybeSingle();

      let convoId = existing?.id as string | number | undefined;

      const prefill = `Hi! I'm interested in "${product.title}".${
        product.color ? ` Is it available in ${product.color}?` : ""
      }`;

      if (!convoId || error) {
        const { data: inserted } = await supabase
          .from("conversations")
          .insert({
            buyer_id: user.id,
            seller_id: product.seller_id,
            last_message: prefill,
            last_message_at: new Date().toISOString(),
            buyer_unread_count: 0,
            seller_unread_count: 1,
          })
          .select("id")
          .single();
        convoId = inserted?.id;
      }

      if (convoId) {
        router.push({
          pathname: "/messages/[id]",
          params: { id: String(convoId), prefill },
        });
      } else {
        router.push({ pathname: "/messages" });
      }
    } catch {
      router.push({ pathname: "/messages" });
    }
  };

  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewCount
    : 0;
  const dist = reviews.reduce(
    (acc, r) => {
      const k = Number(r.rating || 0);
      if (k >= 1 && k <= 5) acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.breadcrumbRow}>
        <TouchableOpacity
          style={styles.breadcrumbBack}
          onPress={() => router.back()}
        >
          <Text style={styles.breadcrumbBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.breadcrumbText} numberOfLines={1}>
          <Text style={styles.breadcrumbLink}>Shop</Text>
          <Text> / </Text>
          <Text>{product.category || ""}</Text>
          <Text> / </Text>
          <Text style={styles.breadcrumbTitle}>{product.title}</Text>
        </Text>
      </View>

      <View style={styles.imageWrapper}>
        <Image source={{ uri: mainImage }} style={styles.image} />
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>{"←"}</Text>
          </TouchableOpacity>
        )}
      </View>
      {images.length > 1 && (
        <View style={styles.thumbRow}>
          {images.map((img, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.thumb, i === mainIndex && styles.thumbActive]}
              onPress={() => setMainIndex(i)}
            >
              <Image source={{ uri: img }} style={styles.thumbImage} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{product.title}</Text>
        {product.category ? <Text style={styles.category}>{product.category}</Text> : null}
        {product.seller ? (
          <Text style={styles.seller}>by {product.seller}</Text>
        ) : null}

        <Text style={styles.price}>₱{product.price.toLocaleString()}</Text>

        <Text style={styles.ratingRow}>
          ⭐ {averageRating.toFixed(1)} ({reviewCount} reviews)
        </Text>

        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Quantity:</Text>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Text style={styles.qtyButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{qty}</Text>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => setQty((q) => q + 1)}
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          {product.stock_qty != null && (
            <Text style={styles.stockText}>{product.stock_qty} items available</Text>
          )}
        </View>

        {product.outOfStock ? (
          <Text style={styles.outOfStock}>Out of Stock</Text>
        ) : (
          <Text style={styles.inStock}>In Stock</Text>
        )}

        <TouchableOpacity
          style={[styles.addButton, product.outOfStock && styles.addButtonDisabled]}
          disabled={product.outOfStock}
          onPress={handleAddToCart}
        >
          <Text style={[styles.addButtonText, product.outOfStock && styles.addButtonTextDisabled]}>
            {product.outOfStock ? "Out of Stock" : "Add to Cart"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buyButton, product.outOfStock && styles.addButtonDisabled]}
          disabled={product.outOfStock}
          onPress={handleBuyNow}
        >
          <Text style={[styles.buyButtonText, product.outOfStock && styles.addButtonTextDisabled]}>
            {product.outOfStock
              ? "Buy Now"
              : `Buy Now – ₱${(product.price * qty).toLocaleString()}`}
          </Text>
        </TouchableOpacity>

        {product.seller && (
          <View style={styles.sellerCard}>
            <View>
              <Text style={styles.sellerName}>{product.seller}</Text>
              <Text style={styles.sellerMeta}>⭐ 4.8 • 0 sales</Text>
            </View>
            <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
              <Text style={styles.chatText}>Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, tab === "description" && styles.tabButtonActive]}
            onPress={() => setTab("description")}
          >
            <Text
              style={[styles.tabText, tab === "description" && styles.tabTextActive]}
            >
              Description
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === "specs" && styles.tabButtonActive]}
            onPress={() => setTab("specs")}
          >
            <Text style={[styles.tabText, tab === "specs" && styles.tabTextActive]}>
              Specifications
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === "reviews" && styles.tabButtonActive]}
            onPress={() => setTab("reviews")}
          >
            <Text style={[styles.tabText, tab === "reviews" && styles.tabTextActive]}>
              Reviews ({reviewCount})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "description" && (
          <View style={styles.panelBox}>
            <Text style={styles.panelText}>
              {product.description || "No description provided."}
            </Text>
          </View>
        )}

        {tab === "specs" && (
          <View style={styles.panelBox}>
            <Text style={styles.specLine}>
              <Text style={styles.specLabel}>Dimensions: </Text>
              {product.length_cm || product.width_cm || product.height_cm
                ? `L:${product.length_cm ?? "-"}cm × W:${product.width_cm ?? "-"}cm × H:${
                    product.height_cm ?? "-"
                  }cm`
                : "Not specified"}
            </Text>
            <Text style={styles.specLine}>
              <Text style={styles.specLabel}>Material: </Text>
              {product.material || "Not specified"}
            </Text>
            <Text style={styles.specLine}>
              <Text style={styles.specLabel}>Weight: </Text>
              {product.weight_kg != null ? `${product.weight_kg} kg` : "Not specified"}
            </Text>
            <Text style={styles.specLine}>
              <Text style={styles.specLabel}>Color: </Text>
              {product.color || "Not specified"}
            </Text>
          </View>
        )}

        {tab === "reviews" && (
          <View style={styles.panelBox}>
            <Text style={styles.ratingSummary}>
              ⭐ {averageRating.toFixed(1)} ({reviewCount} reviews)
            </Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>5★</Text>
              <Text style={styles.breakdownValue}>{dist[5] || 0}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>4★</Text>
              <Text style={styles.breakdownValue}>{dist[4] || 0}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>3★</Text>
              <Text style={styles.breakdownValue}>{dist[3] || 0}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>2★</Text>
              <Text style={styles.breakdownValue}>{dist[2] || 0}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>1★</Text>
              <Text style={styles.breakdownValue}>{dist[1] || 0}</Text>
            </View>
            {reviewsLoading && (
              <Text style={styles.noReviewsText}>Loading reviews...</Text>
            )}
            {!reviewsLoading && reviewCount === 0 && (
              <Text style={styles.noReviewsText}>No reviews yet for this product.</Text>
            )}
            {!reviewsLoading && reviewCount > 0 && (
              <View style={{ marginTop: 10, gap: 8 }}>
                {reviews.map((r) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {r.buyerName.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewName}>{r.buyerName || "Buyer"}</Text>
                        <Text style={styles.reviewDate}>{r.date}</Text>
                      </View>
                      <Text style={styles.reviewRating}>
                        {"★".repeat(Math.round(r.rating || 0))}
                        {"☆".repeat(Math.max(0, 5 - Math.round(r.rating || 0)))}
                      </Text>
                    </View>
                    {r.text ? (
                      <Text style={styles.reviewText}>{r.text}</Text>
                    ) : null}
                    {Array.isArray(r.images) && r.images.length > 0 && (
                      <View style={styles.reviewImagesRow}>
                        {r.images.map((url, idx) => (
                          <View key={idx} style={styles.reviewImageBox}>
                            <Image
                              source={{ uri: url }}
                              style={styles.reviewImage}
                              resizeMode="cover"
                            />
                          </View>
                        ))}
                      </View>
                    )}
                    {r.sellerReply ? (
                      <View style={styles.sellerReplyBox}>
                        <Text style={styles.sellerReplyLabel}>Seller reply</Text>
                        <Text style={styles.sellerReplyText}>{r.sellerReply}</Text>
                        {r.sellerReplyDate && (
                          <Text style={styles.sellerReplyDate}>{
                            new Date(r.sellerReplyDate).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                            })
                          }</Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
  },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  breadcrumbBack: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  breadcrumbBackText: {
    fontSize: 16,
    color: "#422006",
  },
  breadcrumbText: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
  },
  breadcrumbLink: {
    color: "#ea580c",
    fontWeight: "600",
  },
  breadcrumbTitle: {
    color: "#422006",
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fefce8",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#4b5563",
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
  },
  imageWrapper: {
    position: "relative",
    backgroundColor: "#e5e7eb",
  },
  image: {
    width: "100%",
    height: 260,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 18,
    color: "#422006",
  },
  thumbRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#facc6b",
  },
  thumbActive: {
    borderColor: "#ea580c",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#422006",
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  seller: {
    fontSize: 13,
    color: "#ea580c",
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#422006",
    marginBottom: 8,
  },
  ratingRow: {
    fontSize: 12,
    color: "#ca8a04",
    marginBottom: 8,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  qtyLabel: {
    fontSize: 13,
    color: "#374151",
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#facc6b",
  },
  qtyButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyButtonText: {
    fontSize: 16,
    color: "#422006",
  },
  qtyValue: {
    paddingHorizontal: 8,
    fontSize: 14,
  },
  stockText: {
    fontSize: 11,
    color: "#6b7280",
  },
  inStock: {
    fontSize: 12,
    color: "#16a34a",
    marginBottom: 12,
  },
  outOfStock: {
    fontSize: 12,
    color: "#b91c1c",
    marginBottom: 12,
  },
  addButton: {
    borderRadius: 14,
    backgroundColor: "#ea580c",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buyButton: {
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fefce8",
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ea580c",
  },
  addButtonTextDisabled: {
    color: "#6b7280",
  },
  sellerCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sellerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
  },
  sellerMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },
  chatButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#fffbeb",
  },
  chatText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ea580c",
  },
  tabsRow: {
    flexDirection: "row",
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#facc6b",
    padding: 3,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabButtonActive: {
    backgroundColor: "#fffbeb",
  },
  tabText: {
    fontSize: 13,
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#ea580c",
    fontWeight: "600",
  },
  panelBox: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fffbeb",
    padding: 12,
  },
  panelText: {
    fontSize: 13,
    color: "#374151",
  },
  specLine: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 4,
  },
  specLabel: {
    fontWeight: "600",
    color: "#422006",
  },
  ratingSummary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#374151",
  },
  breakdownValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  noReviewsText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
  },
  reviewCard: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    padding: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#facc6b",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ea580c",
  },
  reviewName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#422006",
  },
  reviewDate: {
    fontSize: 11,
    color: "#6b7280",
  },
  reviewRating: {
    fontSize: 12,
    color: "#fbbf24",
    fontWeight: "600",
  },
  reviewText: {
    fontSize: 13,
    color: "#374151",
  },
  reviewImagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  reviewImageBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
  },
  reviewImage: {
    width: "100%",
    height: "100%",
  },
  sellerReplyBox: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sellerReplyLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#422006",
    marginBottom: 2,
  },
  sellerReplyText: {
    fontSize: 13,
    color: "#374151",
  },
  sellerReplyDate: {
    marginTop: 2,
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right",
  },
});
