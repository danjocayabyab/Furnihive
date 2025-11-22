import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";

type Conversation = {
  id: string | number;
  name: string;
  last: string;
  time: string | null;
  unread: number;
  online: boolean;
  avatarUrl?: string | null;
  initials?: string;
};

export function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  function relativeTime(ts: string | null): string {
    if (!ts) return "";
    const ms = Date.parse(ts);
    if (!Number.isFinite(ms)) return "";
    const diff = Date.now() - ms;
    if (!Number.isFinite(diff) || diff < 0) return "just now";
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hours ago`;
    const d = Math.round(h / 24);
    return `${d} days ago`;
  }

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function loadConversations() {
      setLoading(true);
      setError("");
      try {
        let { data: convos, error } = await supabase
          .from("conversations")
          .select("id, seller_id, last_message, last_message_at, buyer_unread_count")
          .eq("buyer_id", user.id)
          .order("last_message_at", { ascending: false });

        if (error || !convos) {
          if (!cancelled) {
            setThreads([]);
            setError(error?.message || "Failed to load conversations");
          }
          return;
        }

        const sellerIds = Array.from(new Set(convos.map((c: any) => c.seller_id).filter(Boolean)));
        let sellerById: Record<string, any> = {};
        if (sellerIds.length) {
          const [{ data: sellers }, { data: stores }] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, store_name, first_name, last_name, last_active, avatar_url")
              .in("id", sellerIds),
            supabase
              .from("stores")
              .select("owner_id, name")
              .in("owner_id", sellerIds),
          ]);

          const storeByOwnerId: Record<string, any> = {};
          (stores || []).forEach((st: any) => {
            storeByOwnerId[st.owner_id] = st;
          });
          (sellers || []).forEach((s: any) => {
            const st = storeByOwnerId[s.id] || {};
            const name =
              st.name ||
              s.store_name ||
              [s.first_name, s.last_name].filter(Boolean).join(" ") ||
              "Seller";
            const initialsSource = name || "S";
            const initials = initialsSource.slice(0, 1).toUpperCase();
            sellerById[s.id] = { ...s, displayName: name, initials };
          });
        }

        const mapped: Conversation[] = (convos || []).map((c: any) => {
          const s = sellerById[c.seller_id] || {};
          const lastActive = s.last_active ? Date.parse(s.last_active) : null;
          const online =
            lastActive && Number.isFinite(lastActive)
              ? Date.now() - lastActive < 5 * 60 * 1000
              : false;
          return {
            id: c.id,
            name: s.displayName || "Seller",
            last: c.last_message || "",
            time: c.last_message_at,
            unread: c.buyer_unread_count || 0,
            online,
            avatarUrl: s.avatar_url || null,
            initials: s.initials || (s.displayName ? String(s.displayName).slice(0, 1).toUpperCase() : "S"),
          };
        });

        if (!cancelled) setThreads(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load conversations");
          setThreads([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConversations();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const totalUnread = threads.reduce((n, t) => n + (t.unread || 0), 0);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.name.toLowerCase().includes(q));
  }, [threads, query]);

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
        <Text style={styles.heading}>Chats</Text>
        {totalUnread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.subtle}>Loading conversations...</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && filteredThreads.length === 0 && (
        <View style={styles.centerBox}>
          <Text style={styles.subtle}>No conversations yet.</Text>
        </View>
      )}

      {!loading && filteredThreads.length > 0 && (
        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.threadRow}
              onPress={() =>
                router.push({ pathname: "/messages/[id]", params: { id: String(item.id) } })
              }
            >
              <View style={styles.threadLeft}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{item.initials}</Text>
                  </View>
                )}
                <View style={styles.threadMain}>
                  <Text style={styles.threadName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.last ? (
                    <Text style={styles.threadLast} numberOfLines={1}>
                      {item.last}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.threadMeta}>
                <View style={styles.onlineRow}>
                  <View
                    style={[
                      styles.onlineDot,
                      item.online ? styles.onlineDotOn : styles.onlineDotOff,
                    ]}
                  />
                  <Text style={styles.onlineText}>{item.online ? "Online" : "Offline"}</Text>
                </View>
                {item.time && (
                  <Text style={styles.threadTime}>{relativeTime(item.time)}</Text>
                )}
                {item.unread > 0 && (
                  <View style={styles.threadUnreadBadge}>
                    <Text style={styles.threadUnreadText}>
                      {item.unread > 9 ? "9+" : item.unread}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/" })}
        >
          <Feather name="home" size={20} color="#ea580c" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/explore" })}
        >
          <Feather name="shopping-bag" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/cart", params: {} })}
        >
          <Feather name="shopping-cart" size={20} color="#9ca3af" />
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
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 56,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
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
  },
  unreadBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  centerBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  subtle: {
    marginTop: 8,
    fontSize: 13,
    color: "#4b5563",
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    color: "#b91c1c",
  },
  listContent: {
    paddingVertical: 4,
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
  searchRow: {
    marginBottom: 8,
  },
  searchInput: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#facc6b",
    marginBottom: 8,
  },
  threadLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fefce8",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fefce8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ea580c",
  },
  threadMain: {
    flex: 1,
  },
  threadName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
  },
  threadLast: {
    marginTop: 2,
    fontSize: 12,
    color: "#4b5563",
  },
  threadMeta: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
    backgroundColor: "#d1d5db",
  },
  onlineDotOn: {
    backgroundColor: "#22c55e",
  },
  onlineDotOff: {
    backgroundColor: "#d1d5db",
  },
  onlineText: {
    fontSize: 11,
    color: "#6b7280",
  },
  threadTime: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  threadUnreadBadge: {
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  threadUnreadText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
});
