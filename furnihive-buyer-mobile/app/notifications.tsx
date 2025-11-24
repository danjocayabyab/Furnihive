import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  const router = useRouter();
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
      <View style={styles.root}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={18} color="#422006" />
            </TouchableOpacity>
            <Text style={styles.heading}>Notifications</Text>
          </View>
          <Text style={styles.text}>Please log in to view notifications.</Text>
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
            <Feather name="shopping-cart" size={20} color="#ea580c" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => router.push({ pathname: "/profile" })}
          >
            <Feather name="user" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#422006" />
          </TouchableOpacity>
          <Text style={styles.heading}>Notifications</Text>
        </View>
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
          <Feather name="shopping-cart" size={20} color="#ea580c" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/profile" })}
        >
          <Feather name="user" size={20} color="#9ca3af" />
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
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 72,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
