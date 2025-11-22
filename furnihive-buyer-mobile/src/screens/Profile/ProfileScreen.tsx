import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabaseClient";

export function ProfileScreen() {
  const router = useRouter();
  const { user, loading, error, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"overview" | "settings">("overview");
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [addresses, setAddresses] = useState<
    { id: string | number; label: string; line: string; isDefault: boolean }[]
  >([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [orders, setOrders] = useState<
    { id: string | number; date: string; total: number; status: string | null; title: string }[]
  >([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    await login(email.trim(), password);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleSetDefaultAddress = async (id: string | number) => {
    if (!user?.id) return;
    try {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .is("deleted_at", null);
      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);
      // Reload addresses
      if (user?.id) {
        const { data, error } = await supabase
          .from("addresses")
          .select(
            "id,label,name,line1,postal_code,province,city,is_default,deleted_at"
          )
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true });
        if (!error && data) {
          const normalized = (data || []).map((r: any) => ({
            id: r.id,
            label: r.label || "Home Address",
            line: [r.line1, r.city, r.province].filter(Boolean).join(", "),
            isDefault: !!r.is_default,
          }));
          setAddresses(normalized);
        }
      }
    } catch {
      // best-effort; ignore errors here
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setProfileName(null);
      setProfilePhone(null);
      return;
    }
    let cancelled = false;
    async function loadProfile() {
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, full_name, phone")
          .eq("id", user.id)
          .maybeSingle();
        if (error || !data) {
          if (!cancelled) {
            setProfileName(null);
            setProfilePhone(null);
          }
          return;
        }
        const fullName =
          (data.full_name as string | null) ||
          [data.first_name, data.last_name].filter(Boolean).join(" ");
        if (!cancelled) {
          setProfileName(fullName || null);
          setProfilePhone((data.phone as string | null) || null);
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    async function loadOrders() {
      setOrdersLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, created_at, total_amount, item_count, summary_title, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (error || !data) {
          if (!cancelled) setOrders([]);
          return;
        }
        const mapped = (data || []).map((o: any) => {
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
          return {
            id: o.id,
            date: (o.created_at || "").slice(0, 10),
            total: Number(o.total_amount || 0),
            status: normalized,
            title: (o.summary_title as string | null) || "Order",
          };
        });
        if (!cancelled) setOrders(mapped);
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    }
    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setAddresses([]);
      return;
    }
    let cancelled = false;
    async function loadAddresses() {
      setAddressesLoading(true);
      try {
        const { data, error } = await supabase
          .from("addresses")
          .select(
            "id,label,name,line1,postal_code,province,city,is_default,deleted_at"
          )
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true });
        if (error || !data) {
          if (!cancelled) setAddresses([]);
          return;
        }
        const normalized = (data || []).map((r: any) => ({
          id: r.id,
          label: r.label || "Home Address",
          line: [r.line1, r.city, r.province].filter(Boolean).join(", "),
          isDefault: !!r.is_default,
        }));
        if (!cancelled) setAddresses(normalized);
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    }
    loadAddresses();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
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
          <Text style={styles.heading}>Profile</Text>
        </View>

        {loading && (
          <View style={styles.row}>
            <ActivityIndicator color="#ea580c" />
            <Text style={styles.subtle}>Checking session...</Text>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.loginHeader}>
            <View style={styles.loginLogoCircle}>
              <Text style={styles.loginLogoText}>F</Text>
            </View>
            <Text style={styles.loginTitle}>FurniHive</Text>
          </View>

          <View style={styles.loginFieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.loginFieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
          </TouchableOpacity>

          <View style={styles.loginSignupRow}>
            <Text style={styles.loginSignupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push({ pathname: "/profile-signup" })}>
              <Text style={styles.loginSignupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const displayEmail = user.email || "Account";
  const displayName = profileName || displayEmail;
  const avatarInitial = displayName.slice(0, 1).toUpperCase();

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
        <Text style={styles.heading}>Profile</Text>
      </View>

      {loading && (
        <View style={styles.row}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.subtle}>Checking session...</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Header + account overview card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{displayName}</Text>
              <Text style={styles.headerMeta}>
                🪪 Member{profilePhone ? ` • ${profilePhone}` : ""}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {tab === "overview" && (
          <View style={{ marginTop: 12, gap: 4 }}>
            <Text style={styles.label}>Account overview</Text>
            <Text style={styles.value}>{displayName}</Text>
            <Text style={styles.subtle}>{displayEmail}</Text>
            {profileLoading && <Text style={styles.subtle}>Refreshing profile...</Text>}
            {user.role ? <Text style={styles.subtle}>Role: {user.role}</Text> : null}
            <Text style={styles.subtle}>Default address and recent orders are shown below.</Text>
            <TouchableOpacity
              style={styles.viewOrdersButton}
              onPress={() => router.push({ pathname: "/profile-orders" })}
            >
              <Text style={styles.viewOrdersText}>View all orders</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "overview" && styles.tabButtonActive]}
          onPress={() => setTab("overview")}
        >
          <Text style={[styles.tabText, tab === "overview" && styles.tabTextActive]}>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === "settings" && styles.tabButtonActive]}
          onPress={() => setTab("settings")}
        >
          <Text style={[styles.tabText, tab === "settings" && styles.tabTextActive]}>Account Settings</Text>
        </TouchableOpacity>
      </View>

      {tab === "overview" && (
        <View style={[styles.card, { marginTop: 12 }] }>
          <Text style={styles.label}>My Orders</Text>
          {ordersLoading && (
            <Text style={styles.subtle}>Loading orders...</Text>
          )}
          {!ordersLoading && orders.length === 0 && (
            <Text style={styles.subtle}>You have no orders yet.</Text>
          )}
          {!ordersLoading && orders.length > 0 && (
            <View style={styles.orderList}>
              {orders.map((o) => (
                <View key={o.id} style={styles.orderItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderTitle} numberOfLines={1}>
                      {o.title}
                    </Text>
                    <Text style={styles.orderMeta}>
                      {o.date} • ₱{o.total.toLocaleString()}
                    </Text>
                  </View>
                  {o.status && (
                    <View
                      style={[
                        styles.orderBadge,
                        o.status === "Delivered" && styles.orderBadgeDelivered,
                        o.status === "Shipped" && styles.orderBadgeShipped,
                        o.status === "Processing" && styles.orderBadgeProcessing,
                        o.status === "Pending" && styles.orderBadgePending,
                      ]}
                    >
                      <Text style={styles.orderBadgeText}>{o.status}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {tab === "settings" && (
        <View style={styles.card}>
          <Text style={styles.label}>Account settings</Text>
          <Text style={styles.sectionLabel}>Personal info</Text>
          <Text style={styles.subtle}>Name: {displayName}</Text>
          <Text style={styles.subtle}>Email: {displayEmail}</Text>
          <Text style={styles.subtle}>Phone: {profilePhone || "Not set"}</Text>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionLabel}>Addresses</Text>
          {addressesLoading && (
            <Text style={styles.subtle}>Loading addresses...</Text>
          )}
          {!addressesLoading && addresses.length === 0 && (
            <Text style={styles.subtle}>No saved addresses yet.</Text>
          )}
          {!addressesLoading && addresses.length > 0 && (
            <View style={styles.addressList}>
              {addresses.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.addressItem}
                  onPress={() =>
                    router.push({ pathname: "/profile-address-edit/[id]", params: { id: String(a.id) } })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>{a.label}</Text>
                    <Text style={styles.addressLine} numberOfLines={2}>
                      {a.line || "Address not set"}
                    </Text>
                  </View>
                  {a.isDefault ? (
                    <View style={styles.addressBadge}>
                      <Text style={styles.addressBadgeText}>Default</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.setDefaultButton}
                      onPress={() => handleSetDefaultAddress(a.id)}
                    >
                      <Text style={styles.setDefaultText}>Set default</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.changeAddressButton}
                onPress={() => router.push({ pathname: "/profile-address-add" })}
              >
                <Text style={styles.changeAddressText}>Add address</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  loginHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  loginLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  loginLogoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#422006",
  },
  loginSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#ea580c",
  },
  loginFieldGroup: {
    width: "100%",
    marginTop: 8,
    gap: 4,
  },
  loginSignupRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginSignupText: {
    fontSize: 12,
    color: "#6b7280",
  },
  loginSignupLink: {
    fontSize: 12,
    color: "#ea580c",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  subtle: {
    fontSize: 12,
    color: "#6b7280",
  },
  error: {
    fontSize: 12,
    color: "#b91c1c",
    marginBottom: 8,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    padding: 16,
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#facc6b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ea580c",
  },
  headerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
  },
  headerMeta: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  logoutButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#fffbeb",
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ea580c",
  },
  tabsRow: {
    flexDirection: "row",
    borderRadius: 999,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#facc6b",
    padding: 3,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabButtonActive: {
    backgroundColor: "#fffbeb",
  },
  tabText: {
    fontSize: 13,
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#ea580c",
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
  },
  value: {
    fontSize: 14,
    color: "#111827",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#ea580c",
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fefce8",
  },
  sectionLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#422006",
  },
  sectionDivider: {
    marginVertical: 8,
    height: 1,
    backgroundColor: "#facc6b",
  },
  addressList: {
    marginTop: 6,
    gap: 6,
  },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#422006",
  },
  addressLine: {
    marginTop: 2,
    fontSize: 12,
    color: "#4b5563",
  },
  addressBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#facc6b",
  },
  addressBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ea580c",
  },
  changeAddressButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fffbeb",
  },
  changeAddressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ea580c",
  },
  setDefaultButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fffbeb",
  },
  setDefaultText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ea580c",
  },
  viewOrdersButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fffbeb",
  },
  viewOrdersText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ea580c",
  },
  orderList: {
    marginTop: 6,
    gap: 6,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#facc6b",
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
