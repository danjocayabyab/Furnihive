import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabaseClient";

interface NotificationRow {
  id: string | number;
  title: string;
  body: string;
  status: string | null;
  createdAt: string | null;
}

export default function NotificationsRoute() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error: err } = await supabase
          .from("orders")
          .select("id, status, created_at, updated_at, summary_title")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(30);

        if (cancelled) return;

        if (err || !data) {
          setItems([]);
          setError(err?.message || "Failed to load notifications.");
          return;
        }

        const mapped: NotificationRow[] = data.map((o: any) => {
          const shortId = String(o.id).replace(/-/g, "").slice(0, 6).toUpperCase();
          const title = `Order ORD-${shortId}`;
          const body = o.summary_title || "Order update";
          return {
            id: o.id,
            title,
            body,
            status: o.status || null,
            createdAt: o.updated_at || o.created_at || null,
          };
        });

        setItems(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load notifications.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Notifications</Text>
        <Text style={styles.text}>Please log in to view notifications.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Notifications</Text>
      {loading && (
        <View style={styles.row}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.text}>Loading...</Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && items.length === 0 && (
        <Text style={styles.text}>No notifications yet.</Text>
      )}
      {!loading && !error && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.status && (
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "Delivered" && styles.statusDelivered,
                      item.status === "Shipped" && styles.statusShipped,
                      item.status === "Processing" && styles.statusProcessing,
                      item.status === "Pending" && styles.statusPending,
                    ]}
                  >
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardBody} numberOfLines={2}>
                {item.body}
              </Text>
              {item.createdAt && (
                <Text style={styles.cardTime}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              )}
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
    marginBottom: 16,
  },
  text: {
    fontSize: 13,
    color: "#4b5563",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  error: {
    marginBottom: 8,
    fontSize: 12,
    color: "#b91c1c",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
    marginRight: 8,
  },
  cardBody: {
    fontSize: 13,
    color: "#4b5563",
  },
  cardTime: {
    marginTop: 4,
    fontSize: 11,
    color: "#6b7280",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
  statusDelivered: {
    backgroundColor: "#dcfce7",
    borderColor: "#22c55e",
  },
  statusShipped: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  statusProcessing: {
    backgroundColor: "#fef3c7",
    borderColor: "#f97316",
  },
  statusPending: {
    backgroundColor: "#e5e7eb",
    borderColor: "#9ca3af",
  },
});
