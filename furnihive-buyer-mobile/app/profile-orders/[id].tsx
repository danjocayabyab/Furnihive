import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";

interface OrderItemRow {
  id: string | number;
  title: string;
  qty: number;
  unitPrice: number;
  status: string | null;
}

export default function OrderDetailRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const orderId =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [summaryTitle, setSummaryTitle] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!orderId || !user?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .select("id, user_id, total_amount, summary_title, status")
          .eq("id", orderId)
          .maybeSingle();

        if (orderErr || !order) {
          if (!cancelled) setError(orderErr?.message || "Order not found.");
          return;
        }

        if (!cancelled) {
          const raw = (order.status as string | null) || null;
          let normalized: string | null = null;
          if (raw) {
            const s = raw.toLowerCase();
            if (s.includes("deliver")) normalized = "Delivered";
            else if (s.includes("ship")) normalized = "Shipped";
            else if (s.includes("process")) normalized = "Processing";
            else if (s.includes("pend")) normalized = "Pending";
            else normalized = raw;
          }
          setSummaryTitle((order.summary_title as string | null) || "Order");
          setTotal(Number(order.total_amount || 0));
          setStatus(normalized);
        }

        const { data: rows, error: itemsErr } = await supabase
          .from("order_items")
          .select("id, title, qty, unit_price, status")
          .eq("order_id", orderId);

        if (itemsErr || !rows) {
          if (!cancelled) setItems([]);
          return;
        }

        const mapped: OrderItemRow[] = rows.map((r: any) => ({
          id: r.id,
          title: (r.title as string | null) || "Item",
          qty: Number(r.qty || 1),
          unitPrice: Number(r.unit_price || 0),
          status: (r.status as string | null) || null,
        }));

        if (!cancelled) setItems(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load order details.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId, user?.id, refreshKey]);

  useEffect(() => {
    if (!orderId || !user?.id) return;
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId, user?.id]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Order Details</Text>
        <Text style={styles.text}>Please log in to view this order.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Order Details</Text>
      {summaryTitle && <Text style={styles.summaryTitle}>{summaryTitle}</Text>}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total</Text>
        <Text style={styles.summaryValue}>₱{total.toLocaleString()}</Text>
      </View>
      {status && (
        <View
          style={[
            styles.statusBadge,
            status === "Delivered" && styles.statusDelivered,
            status === "Shipped" && styles.statusShipped,
            status === "Processing" && styles.statusProcessing,
            status === "Pending" && styles.statusPending,
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}

      {loading && (
        <View style={styles.row}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.text}>Loading items...</Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && items.length === 0 && (
        <Text style={styles.text}>No items found for this order.</Text>
      )}
      {!loading && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.itemMeta}>
                  x{item.qty} • ₱{item.unitPrice.toLocaleString()} each
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.itemTotal}>
                  ₱{(item.unitPrice * item.qty).toLocaleString()}
                </Text>
                {item.status && (
                  <Text style={styles.itemStatus}>{item.status}</Text>
                )}
              </View>
            </View>
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
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#4b5563",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#422006",
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#facc6b",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  statusDelivered: {
    backgroundColor: "#dcfce7",
    borderColor: "#16a34a",
  },
  statusShipped: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  statusProcessing: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
  },
  statusPending: {
    backgroundColor: "#f3f4f6",
    borderColor: "#9ca3af",
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
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
  },
  itemRow: {
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
  itemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#422006",
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#4b5563",
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#422006",
  },
  itemStatus: {
    marginTop: 2,
    fontSize: 11,
    color: "#6b7280",
  },
});
