import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";

export default function CheckoutRoute() {
  const { items, total, clear } = useCart();
  const router = useRouter();
  const { user } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [buyerName, setBuyerName] = useState<string | null>(null);
  const [buyerAddress, setBuyerAddress] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<
    { id: string | number; label: string; line: string; isDefault: boolean }[]
  >([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | number | null>(null);
  const [payMethod, setPayMethod] = useState<"cod" | "online">("cod");
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | number | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setBuyerName(null);
        setBuyerAddress(null);
        return;
      }
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled) {
          if (profile) {
            const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
            setBuyerName(name || profile.full_name || null);
          } else {
            setBuyerName(null);
          }
        }

        const { data: addrRows } = await supabase
          .from("addresses")
          .select(
            "id,label,name,line1,postal_code,province,city,is_default,deleted_at,created_at"
          )
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true });

        if (!cancelled) {
          const normalized = (addrRows || []).map((r: any) => ({
            id: r.id,
            label: r.label || "Home Address",
            line: [r.line1, r.city, r.province].filter(Boolean).join(", "),
            isDefault: !!r.is_default,
          }));
          setAddresses(normalized);
          const selected = normalized.find((a) => a.isDefault) || normalized[0];
          if (selected) {
            setSelectedAddressId(selected.id);
            setBuyerAddress(selected.line || null);
          } else {
            setSelectedAddressId(null);
            setBuyerAddress(null);
          }
        }
      } catch {
        if (!cancelled) {
          setBuyerName(null);
          setBuyerAddress(null);
          setAddresses([]);
          setSelectedAddressId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Load active voucher-type promotions (same table used on web checkout)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date();
        const { data, error } = await supabase
          .from("promotions")
          .select(
            "id, seller_id, name, code, type, discount_type, discount_value, min_purchase, max_discount, status, start_date, end_date"
          )
          .eq("type", "voucher")
          .eq("status", "active");

        if (error || cancelled) return;

        const usable = (data || []).filter((p: any) => {
          const start = p.start_date ? new Date(p.start_date) : null;
          const end = p.end_date ? new Date(p.end_date) : null;
          if (start && start > today) return false;
          if (end && end < today) return false;
          return true;
        });

        setVouchers(usable);
      } catch {
        if (!cancelled) setVouchers([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Derive seller_id for this checkout (single-seller assumption like web)
  const checkoutSellerId = items.length ? (items[0] as any).seller_id || null : null;

  const applicableVouchers = vouchers.filter((v) => {
    if (!checkoutSellerId) return true;
    return v.seller_id === checkoutSellerId;
  });

  const subtotal = items.reduce((n, it) => n + (it.price || 0) * (it.qty || 1), 0);

  // VAT only; shipping is not charged in this mobile flow
  const vat = Math.round(subtotal * 0.12);

  let promoDiscount = 0;
  if (selectedVoucherId) {
    const v = applicableVouchers.find((p) => p.id === selectedVoucherId);
    if (v && subtotal > 0) {
      const isPercentage = v.discount_type === "percentage";
      const rawValue = Number(v.discount_value) || 0;
      let rawDiscount = 0;
      if (isPercentage) {
        rawDiscount = Math.round(subtotal * (rawValue / 100));
      } else {
        rawDiscount = rawValue;
      }
      promoDiscount = Math.max(0, rawDiscount);
    }
  }

  const finalTotal = Math.max(0, subtotal + vat - promoDiscount);

  const handlePlaceOrder = async () => {
    if (!items.length || placing) return;
    setPlacing(true);
    setError("");

    const first = items[0];
    const itemCount = items.reduce((n, it) => n + (it.qty || 1), 0);

    try {
      const { data: created, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id || null,
          total_amount: finalTotal,
          item_count: itemCount,
          summary_title: first.title,
          summary_image: first.image || null,
          seller_display: null,
          color: first.color || null,
          dropoff_lat: null,
          dropoff_lng: null,
          dropoff_address: null,
          status: "Pending",
        })
        .select("id")
        .single();

      if (orderErr || !created?.id) {
        setError(orderErr?.message || "Failed to create order.");
        setPlacing(false);
        return;
      }

      const orderId = created.id;
      const itemsPayload = items
        .filter((it) => it.seller_id)
        .map((it) => ({
          order_id: orderId,
          seller_id: it.seller_id,
          product_id: it.id,
          title: it.title,
          image: it.image || null,
          qty: it.qty || 1,
          unit_price: Number(it.price || 0),
          shipping_fee: 0,
          buyer_name: buyerName,
          buyer_address: buyerAddress,
          payment_method: payMethod,
          status: "Pending",
        }));

      if (itemsPayload.length) {
        await supabase.from("order_items").insert(itemsPayload);
      }

      if (payMethod === "cod") {
        clear();
        router.replace({ pathname: "/checkout-success" as any, params: { total: String(finalTotal) } });
      } else {
        const { data: session, error: sessionErr } = await supabase.functions.invoke(
          "create-checkout-session",
          {
            body: { order_id: orderId },
          }
        );

        if (sessionErr || !session?.checkout_url) {
          setError(sessionErr?.message || "Failed to start online payment. You can try COD instead.");
          setPlacing(false);
          return;
        }

        clear();
        try {
          await Linking.openURL(session.checkout_url);
        } catch {
          // best-effort; nothing else to do here
        }
        setPlacing(false);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong placing your order.");
      setPlacing(false);
    }
  };

  if (items.length === 0) {
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
            <Text style={styles.heading}>Checkout</Text>
          </View>
          <Text style={styles.text}>Your cart is empty.</Text>
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
          <Text style={styles.heading}>Checkout</Text>
        </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {addresses.length === 0 ? (
          <Text style={styles.text}>No saved addresses yet. Add one in Profile.</Text>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.addressItem,
                  selectedAddressId === a.id && styles.addressSelected,
                ]}
                onPress={() => {
                  setSelectedAddressId(a.id);
                  setBuyerAddress(a.line || null);
                }}
              >
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
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              payMethod === "cod" && styles.paymentOptionActive,
            ]}
            onPress={() => setPayMethod("cod")}
          >
            <Text
              style={[
                styles.paymentText,
                payMethod === "cod" && styles.paymentTextActive,
              ]}
            >
              Cash on Delivery
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              payMethod === "online" && styles.paymentOptionActive,
            ]}
            onPress={() => setPayMethod("online")}
          >
            <Text
              style={[
                styles.paymentText,
                payMethod === "online" && styles.paymentTextActive,
              ]}
            >
              Online payment
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.paymentHint}>
          Online payment uses the same PayMongo checkout flow as the web app.
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.itemQty}>x{item.qty}</Text>
              <Text style={styles.itemPrice}>
                ₱{(item.price * item.qty).toLocaleString()}
              </Text>
            </View>
          )}
        />
      </View>
      {applicableVouchers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voucher</Text>
          <View style={{ gap: 6 }}>
            {/* Dropdown trigger */}
            <TouchableOpacity
              style={[styles.voucherRow, styles.voucherRowSelected]}
              onPress={() => setVoucherOpen((open) => !open)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.voucherName}>
                  {selectedVoucherId
                    ? (applicableVouchers.find((v) => v.id === selectedVoucherId)?.name || "Voucher")
                    : "No voucher"}
                </Text>
                <Text style={styles.voucherMeta}>
                  {selectedVoucherId
                    ? applicableVouchers.find((v) => v.id === selectedVoucherId)?.code || ""
                    : "Tap to choose a voucher for this order."}
                </Text>
              </View>
              <Feather
                name={voucherOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color="#92400e"
              />
            </TouchableOpacity>

            {/* Dropdown options */}
            {voucherOpen && (
              <View style={{ gap: 4 }}>
                <TouchableOpacity
                  style={styles.voucherRow}
                  onPress={() => {
                    setSelectedVoucherId(null);
                    setVoucherOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voucherName}>No voucher</Text>
                    <Text style={styles.voucherMeta}>
                      Do not apply any voucher discount.
                    </Text>
                  </View>
                </TouchableOpacity>

                {applicableVouchers.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.voucherRow}
                    onPress={() => {
                      setSelectedVoucherId(v.id);
                      setVoucherOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.voucherName}>{v.name || "Voucher"}</Text>
                      <Text style={styles.voucherMeta}>{v.code}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedVoucherId && promoDiscount > 0 && (
              <Text style={styles.voucherApplied}>
                Voucher applied: you save ₱{promoDiscount.toLocaleString()} on this order.
              </Text>
            )}
          </View>
        </View>
      )}
      <View style={styles.section}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₱{subtotal.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>VAT (12%)</Text>
          <Text style={styles.summaryValue}>₱{vat.toLocaleString()}</Text>
        </View>
        {promoDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Voucher Discount</Text>
            <Text style={styles.summaryDiscount}>- ₱{promoDiscount.toLocaleString()}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, { marginTop: 4 }] }>
          <Text style={[styles.summaryLabel, { fontWeight: "700" }] }>
            Total
          </Text>
          <Text style={[styles.summaryValue, { fontWeight: "700" }] }>
            ₱{finalTotal.toLocaleString()}
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.placeOrderButton} onPress={handlePlaceOrder}>
          {placing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
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
    paddingTop: 8,
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
  section: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    color: "#4b5563",
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
  addressSelected: {
    backgroundColor: "#fffbeb",
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    marginRight: 6,
  },
  itemQty: {
    fontSize: 13,
    color: "#4b5563",
    marginRight: 6,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#422006",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#4b5563",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#422006",
  },
  summaryDiscount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  error: {
    marginBottom: 6,
    fontSize: 12,
    color: "#b91c1c",
  },
  placeOrderButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#ea580c",
  },
  placeOrderText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
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
  paymentRow: {
    flexDirection: "row",
    gap: 8,
  },
  paymentOption: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#facc6b",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fffbeb",
    alignItems: "center",
  },
  paymentOptionActive: {
    backgroundColor: "#ea580c",
    borderColor: "#ea580c",
  },
  paymentText: {
    fontSize: 13,
    color: "#92400e",
  },
  paymentTextActive: {
    color: "#fefce8",
    fontWeight: "600",
  },
  paymentHint: {
    marginTop: 6,
    fontSize: 11,
    color: "#6b7280",
  },
  voucherRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  voucherRowSelected: {
    backgroundColor: "#fffbeb",
  },
  voucherName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#422006",
  },
  voucherMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },
  voucherApplied: {
    marginTop: 4,
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
  },
});
