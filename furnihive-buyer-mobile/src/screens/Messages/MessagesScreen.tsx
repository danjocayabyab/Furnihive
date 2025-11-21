import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";

type Conversation = {
  id: string | number;
  name: string;
  last: string;
  time: string | null;
  unread: number;
};

export function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
              .select("id, store_name, first_name, last_name")
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
            sellerById[s.id] = { ...s, displayName: name };
          });
        }

        const mapped: Conversation[] = (convos || []).map((c: any) => {
          const s = sellerById[c.seller_id] || {};
          return {
            id: c.id,
            name: s.displayName || "Seller",
            last: c.last_message || "",
            time: c.last_message_at,
            unread: c.buyer_unread_count || 0,
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Messages</Text>
        {totalUnread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.subtle}>Loading conversations...</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && threads.length === 0 && (
        <View style={styles.centerBox}>
          <Text style={styles.subtle}>No conversations yet.</Text>
        </View>
      )}

      {!loading && threads.length > 0 && (
        <FlatList
          data={threads}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.threadRow}
              onPress={() =>
                router.push({ pathname: "/messages/[id]", params: { id: String(item.id) } })
              }
            >
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
              <View style={styles.threadMeta}>
                {item.unread > 0 && (
                  <View style={styles.threadUnreadBadge}>
                    <Text style={styles.threadUnreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
  threadMain: {
    flex: 1,
    marginRight: 8,
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
