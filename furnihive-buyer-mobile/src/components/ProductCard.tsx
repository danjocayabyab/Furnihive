import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

export type MobileProduct = {
  id: number | string;
  title: string;
  price: number;
  oldPrice?: number | null;
  image: string;
  seller?: string;
  rating?: number;
  reviews?: number;
  badge?: string;
  outOfStock?: boolean;
};

type Props = {
  product: MobileProduct;
  onPress?: () => void;
  onAddToCart?: () => void;
};

export function ProductCard({ product, onPress, onAddToCart }: Props) {
  const handlePress = () => {
    if (onPress) onPress();
  };

  const handleAddToCart = () => {
    if (product.outOfStock) return;
    if (onAddToCart) onAddToCart();
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={handlePress}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: product.image }} style={styles.image} />
        {product.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        ) : null}
        {product.outOfStock ? (
          <View style={styles.outOverlay}>
            <Text style={styles.outText}>Out of Stock</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        {product.seller ? <Text style={styles.seller}>{product.seller}</Text> : null}
        <Text numberOfLines={1} style={styles.title}>
          {product.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>⭐ {(product.rating ?? 4.8).toFixed(1)}</Text>
          <Text style={styles.metaText}>({product.reviews ?? 0} reviews)</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₱{Number(product.price).toLocaleString()}</Text>
          {product.oldPrice ? (
            <Text style={styles.oldPrice}>₱{Number(product.oldPrice).toLocaleString()}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.button, product.outOfStock && styles.buttonDisabled]}
          disabled={product.outOfStock}
          onPress={handleAddToCart}
        >
          <Text style={[styles.buttonText, product.outOfStock && styles.buttonTextDisabled]}>
            {product.outOfStock ? "Out of Stock" : "Add to Cart"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b", // line-amber
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  imageWrapper: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 176,
  },
  badge: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "#facc6b",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ea580c", // orange-600
  },
  outOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  outText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  info: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  seller: {
    fontSize: 11,
    color: "#6b7280",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006", // brown-700
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 11,
    color: "#4b5563",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  price: {
    fontWeight: "700",
    color: "#422006",
  },
  oldPrice: {
    fontSize: 12,
    color: "#6b7280",
    textDecorationLine: "line-through",
  },
  button: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 8,
    backgroundColor: "#fffbeb", // cream-50
    borderWidth: 1,
    borderColor: "#facc6b",
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#e5e7eb",
    borderColor: "#d1d5db",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ea580c",
  },
  buttonTextDisabled: {
    color: "#6b7280",
  },
});
