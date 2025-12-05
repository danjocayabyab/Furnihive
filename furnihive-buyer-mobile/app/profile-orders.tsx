import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";

interface OrderRow {
  id: string | number;
  date: string;
  total: number;
  status: string | null;
  title: string;
  trackingId?: string | null;
  trackingUrl?: string | null;
}

export default function MyOrdersRoute() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error: err } = await supabase
          .from("orders")
          .select("id, created_at, total_amount, summary_title, status, lalamove_order_id, lalamove_share_link")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (err || !data) {
          if (!cancelled) {
            setError(err?.message || "Failed to load orders.");
            setOrders([]);
          }
          return;
        }
        const mapped: OrderRow[] = data.map((o: any) => {
          const raw = (o.status as string | null) || null;
          let normalized: string | null = null;
          if (raw) {
            const s = raw.toLowerCase();
            if (s.includes("deliver")) normalized = "Delivered";
            else if (s.includes("ship")) normalized = "Shipped";
            else if (s.includes("process")) normalized = "Processing";
            else if (s.includes("pend")) normalized = "Pending";
            else normalized = raw;
          }
          const trackingId = o.lalamove_order_id || null;
          const trackingUrl = o.lalamove_share_link || null;
          return {
            id: o.id,
            date: (o.created_at || "").slice(0, 10),
            total: Number(o.total_amount || 0),
            status: normalized,
            title: (o.summary_title as string | null) || "Order",
            trackingId,
            trackingUrl,
          };
        });
        if (!cancelled) setOrders(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load orders.");
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>My Orders</Text>
        <Text style={styles.text}>Please log in to view your orders.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Orders</Text>
      {loading && (
        <View style={styles.row}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.text}>Loading orders...</Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && orders.length === 0 && (
        <Text style={styles.text}>You have no orders yet.</Text>
      )}
      {!loading && orders.length > 0 && (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.orderItem}
              onPress={() =>
                router.push({ pathname: "/profile-orders/[id]", params: { id: String(item.id) } })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.orderTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.orderMeta}>
                  {item.date} • ₱{item.total.toLocaleString()}
                </Text>
                {item.trackingId && (
                  <View style={styles.trackingRow}>
                    <Text style={styles.trackingText}>Tracking: {item.trackingId}</Text>
                    {item.trackingUrl ? (
                      <TouchableOpacity
                        style={styles.trackingButton}
                        onPress={async () => {
                          try {
                            await Linking.openURL(item.trackingUrl!);
                          } catch {
                            // best-effort; ignore failures
                          }
                        }}
                      >
                        <Text style={styles.trackingButtonText}>Track on Lalamove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
              {item.status && (
                <View
                  style={[
                    styles.orderBadge,
                    item.status === "Delivered" && styles.orderBadgeDelivered,
                    item.status === "Shipped" && styles.orderBadgeShipped,
                    item.status === "Processing" && styles.orderBadgeProcessing,
                    item.status === "Pending" && styles.orderBadgePending,
                  ]}
                >
                  <Text style={styles.orderBadgeText}>{item.status}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#422006",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    color: "#4b5563",
  },
  error: {
    fontSize: 12,
    color: "#b91c1c",
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 24,
    gap: 8,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  orderTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#422006",
  },
  orderMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#4b5563",
  },
  orderBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#facc6b",
  },
  orderBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  trackingRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  trackingText: {
    fontSize: 11,
    color: "#4b5563",
  },
  trackingButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#fffbeb",
  },
  trackingButtonText: {
    fontSize: 11,
    color: "#ea580c",
    fontWeight: "600",
  },
  orderBadgeDelivered: {
    backgroundColor: "#dcfce7",
    borderColor: "#16a34a",
  },
  orderBadgeShipped: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  orderBadgeProcessing: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
  },
  orderBadgePending: {
    backgroundColor: "#f3f4f6",
    borderColor: "#9ca3af",
  },
});
