import React from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/src/context/CartContext";

export function CartScreen() {
  const { items, total, updateQty, remove, clear } = useCart();
  const router = useRouter();

  return (
    <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#422006" />
          </TouchableOpacity>
          <Text style={styles.heading}>Cart</Text>
        </View>
        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.itemRow}>
                  <Image source={{ uri: item.image }} style={styles.image} />
                  <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.price}>₱{item.price.toLocaleString()}</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => updateQty(item.id, item.qty - 1)}
                      >
                        <Text style={styles.qtyButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => updateQty(item.id, item.qty + 1)}
                      >
                        <Text style={styles.qtyButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.lineTotalBox}>
                    <Text style={styles.lineTotal}>₱{(item.price * item.qty).toLocaleString()}</Text>
                    <TouchableOpacity onPress={() => remove(item.id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            <View style={styles.footer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₱{total.toLocaleString()}</Text>
              </View>
              <TouchableOpacity style={styles.clearButton} onPress={clear}>
                <Text style={styles.clearButtonText}>Clear Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkoutButton, items.length > 0 ? styles.checkoutButtonEnabled : styles.checkoutButtonDisabled]}
                disabled={items.length === 0}
                onPress={() => router.push({ pathname: "/checkout" })}
              >
                <Text style={styles.checkoutText}>Go to Checkout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#422006",
    marginBottom: 0,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#4b5563",
  },
  listContent: {
    paddingBottom: 24,
  },
  itemRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  info: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  price: {
    fontSize: 13,
    color: "#422006",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  qtyButtonText: {
    fontSize: 16,
    color: "#111827",
  },
  qtyText: {
    fontSize: 14,
    minWidth: 24,
    textAlign: "center",
  },
  lineTotalBox: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
  },
  removeText: {
    marginTop: 4,
    fontSize: 12,
    color: "#b91c1c",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
    paddingBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#4b5563",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#422006",
  },
  clearButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#fffbeb",
    marginBottom: 8,
  },
  clearButtonText: {
    fontSize: 13,
    color: "#ea580c",
    fontWeight: "600",
  },
  checkoutButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  checkoutText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  checkoutButtonEnabled: {
    backgroundColor: "#ea580c",
  },
  checkoutButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
});
