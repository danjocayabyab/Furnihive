import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function CheckoutSuccessRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const totalParam = typeof params.total === "string" ? params.total : undefined;

  const totalText = totalParam
    ? `₱${Number(totalParam || 0).toLocaleString()}`
    : undefined;

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push({ pathname: "/" })}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#422006" />
          </TouchableOpacity>
          <Text style={styles.heading}>Order Successful</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✔</Text>
          </View>
          <Text style={styles.title}>Order Placed Successfully!</Text>
          <Text style={styles.subtitle}>
            Thank you for your purchase. We'll send you an email and in-app update once your
            order is confirmed by the seller.
          </Text>

          {totalText ? (
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Paid</Text>
              <Text style={styles.totalValue}>{totalText}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push({ pathname: "/explore" })}
          >
            <Text style={styles.primaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push({ pathname: "/profile" })}
          >
            <Text style={styles.secondaryButtonText}>View Order History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/" })}
        >
          <Feather name="home" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/explore" })}
        >
          <Feather name="shopping-bag" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/cart" })}
        >
          <Feather name="shopping-cart" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/profile" })}
        >
          <Feather name="user" size={20} color="#ea580c" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fefce8",
  },
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 72,
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
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
    color: "#16a34a",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#422006",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 16,
  },
  totalBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#422006",
  },
  primaryButton: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#ea580c",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  secondaryButton: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#facc6b",
    paddingVertical: 4,
    height: 56,
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
  },
});
