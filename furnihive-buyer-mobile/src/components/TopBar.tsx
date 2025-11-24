import React, { useEffect, useState } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/src/context/CartContext";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabaseClient";

type Props = {
  placeholder?: string;
};

export function TopBar({ placeholder = "Search products" }: Props) {
  const router = useRouter();
  const { items } = useCart();
  const { user } = useAuth();
  const cartCount = items.reduce((sum, it) => sum + (it.qty || 0), 0);
  const [msgUnread, setMsgUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setMsgUnread(0);
      return;
    }

    let cancelled = false;

    async function loadUnread() {
      const { data, error } = await supabase
        .from("conversations")
        .select("buyer_unread_count")
        .eq("buyer_id", user.id);

      if (cancelled || error || !data) return;

      const total = data.reduce(
        (n: number, c: any) =>
          n + (Number.isFinite(c.buyer_unread_count) ? c.buyer_unread_count : 0),
        0
      );
      setMsgUnread(total);
    }

    loadUnread();
    const id = setInterval(loadUnread, 30000);

    const channel = supabase
      .channel(`buyer-unread-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          if (!cancelled) loadUnread();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  return (
    <View style={styles.container}>
      <View style={styles.brandWrapper}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>F</Text>
        </View>
        <View style={styles.brandTextColumn}>
          <Text style={styles.brandTitle}>FurniHive</Text>
          <Text style={styles.brandTagline}>Furniture Marketplace</Text>
        </View>
      </View>
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
        />
      </View>
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push({ pathname: "/messages" })}
        >
          <Feather
            name="message-circle"
            size={18}
            color={msgUnread > 0 ? "#ea580c" : "#9ca3af"}
          />
          {msgUnread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {msgUnread > 9 ? "9+" : msgUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push({ pathname: "/notifications" })}
        >
          <Feather name="bell" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 40,
    marginBottom: 16,
  },
  brandWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  brandIconText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  brandTextColumn: {
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#422006",
  },
  brandTagline: {
    marginTop: -2,
    fontSize: 10,
    color: "#ea580c",
  },
  searchWrapper: {
    flex: 1,
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
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 18,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "700",
  },
});
