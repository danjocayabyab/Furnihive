import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabaseClient";

export function ProfileScreen() {
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

  const handleLogin = async () => {
    if (!email || !password) return;
    await login(email.trim(), password);
  };

  const handleLogout = async () => {
    await logout();
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
        <Text style={styles.heading}>Profile</Text>

        {loading && (
          <View style={styles.row}>
            <ActivityIndicator color="#ea580c" />
            <Text style={styles.subtle}>Checking session...</Text>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayEmail = user.email || "Account";
  const displayName = profileName || displayEmail;
  const avatarInitial = displayName.slice(0, 1).toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profile</Text>

      {loading && (
        <View style={styles.row}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.subtle}>Checking session...</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Header card */}
      <View style={styles.headerCard}>
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

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "overview" && styles.tabButtonActive]}
          onPress={() => setTab("overview")}
        >
          <Text style={[styles.tabText, tab === "overview" && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === "settings" && styles.tabButtonActive]}
          onPress={() => setTab("settings")}
        >
          <Text style={[styles.tabText, tab === "settings" && styles.tabTextActive]}>Account Settings</Text>
        </TouchableOpacity>
      </View>

      {tab === "overview" && (
        <View style={styles.card}>
          <Text style={styles.label}>Account overview</Text>
          <Text style={styles.value}>{displayName}</Text>
          <Text style={styles.subtle}>{displayEmail}</Text>
          {profileLoading && <Text style={styles.subtle}>Refreshing profile...</Text>}
          {user.role ? <Text style={styles.subtle}>Role: {user.role}</Text> : null}
          <Text style={styles.subtle}>Default address and recent orders can be shown here.</Text>
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
                <View key={a.id} style={styles.addressItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>{a.label}</Text>
                    <Text style={styles.addressLine} numberOfLines={2}>
                      {a.line || "Address not set"}
                    </Text>
                  </View>
                  {a.isDefault && (
                    <View style={styles.addressBadge}>
                      <Text style={styles.addressBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
              ))}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
});
