// src/pages/user/Checkout.jsx
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../components/contexts/CartContext.jsx";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient";

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

/* ----------------------------- Main Wizard ----------------------------- */
export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const location = useLocation();
  const { profile, user } = useAuth();

  const isSuspended = !!profile?.suspended;

  const selectedIds = Array.isArray(location.state?.selectedItems)
    ? location.state.selectedItems
    : null;

  // Only use selected items from cart if provided; otherwise fall back to all items
  const checkoutItems = useMemo(() => {
    if (!selectedIds || !selectedIds.length) return items;
    const selectedSet = new Set(selectedIds);
    return items.filter((it) => selectedSet.has(it.id));
  }, [items, selectedIds]);

  // ---- STEPS
  const [step, setStep] = useState(1); // 1=shipping, 2=payment, 3=review

  // ---- SHIPPING FORM
  const [ship, setShip] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    zip: "",
    note: "",
  });

  // ---- PAYMENT FORM
  const [payMethod, setPayMethod] = useState("card"); // card | gcash | paymaya | cod
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvv: "" });
  const [agree, setAgree] = useState(false);

  // ---- SHIPPING VIA LALAMOVE (geocoding + quotation)
  const [geo, setGeo] = useState(null); // { lat, lng, formatted }
  const [lalamoveQuote, setLalamoveQuote] = useState(null);
  const [lalamoveLoading, setLalamoveLoading] = useState(false);
  const [lalamoveError, setLalamoveError] = useState("");

  // ---- PROMOTIONS (seller vouchers)
  const [vouchers, setVouchers] = useState([]); // active voucher-type promotions (all sellers)
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);

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

        const usable = (data || []).filter((p) => {
          // basic date window check if dates are present
          const start = p.start_date ? new Date(p.start_date) : null;
          const end = p.end_date ? new Date(p.end_date) : null;
          if (start && start > today) return false;
          if (end && end < today) return false;
          return true;
        });

        setVouchers(usable);
      } catch {
        // silently ignore promo load errors on checkout UI
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // expose all active vouchers loaded from Supabase; discount is still scoped per seller
  const applicableVouchers = useMemo(() => vouchers, [vouchers]);

  // Total cart weight in kilograms (from product.weight_kg)
  const totalWeightKg = useMemo(
    () => checkoutItems.reduce((s, it) => s + (Number(it.weight_kg) || 0) * (it.qty || 1), 0),
    [checkoutItems]
  );

  const lalamoveConfig = useMemo(() => {
    let serviceType = "MOTORCYCLE";
    let itemWeight = "LESS_THAN_3KG";

    if (totalWeightKg > 3 && totalWeightKg <= 20) {
      serviceType = "VAN";
      itemWeight = "BETWEEN_3_AND_20KG";
    } else if (totalWeightKg > 20) {
      serviceType = "3000KG_TRUCK";
      itemWeight = "MORE_THAN_20KG";
    }

    return { serviceType, itemWeight };
  }, [totalWeightKg]);

  // ---- ORDER SUM (with optional voucher discount + dynamic Lalamove shipping)
  const totals = useMemo(() => {
    const subtotal = checkoutItems.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
    const dynamicShipping = lalamoveQuote?.amount ?? null;
    const baseShipping = subtotal >= 25000 || checkoutItems.length === 0 ? 0 : 500;
    const shipping = dynamicShipping != null ? Number(dynamicShipping) : baseShipping;
    const vat = Math.round(subtotal * 0.12);

    let promoDiscount = 0;
    if (selectedVoucherId) {
      const v = applicableVouchers.find((p) => p.id === selectedVoucherId);
      if (v) {
        // Apply voucher to the entire checkout subtotal
        if (subtotal > 0) {
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
    }

    const total = Math.max(0, subtotal + shipping + vat - promoDiscount);
    return { subtotal, shipping, vat, promoDiscount, total };
  }, [checkoutItems, applicableVouchers, selectedVoucherId, lalamoveQuote]);

  const canContinueShipping =
    ship.firstName && ship.lastName && ship.email && ship.phone && ship.street && ship.city && ship.zip;

  const canContinuePayment = agree;

  // Compose a full address string for geocoding from the shipping form
  const buildFullAddress = () => {
    const parts = [];
    if (ship.street) parts.push(ship.street);
    const cityProv = [ship.city, ship.province].filter(Boolean).join(", ");
    if (cityProv) parts.push(cityProv);
    if (ship.zip) parts.push(ship.zip);
    return parts.join(", ");
  };

  // Call Supabase Edge Function that wraps OpenCage geocoding
  const geocodeAddress = async () => {
    try {
      setLalamoveError("");
      const address = buildFullAddress();
      if (!address) {
        setLalamoveError("Please enter a complete address before continuing.");
        return null;
      }
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: { address },
      });
      if (error) {
        setGeo(null);
        setLalamoveError(error.message || "Failed to locate address.");
        return null;
      }
      if (!data?.lat || !data?.lng) {
        setGeo(null);
        setLalamoveError("We couldn't find that address. Please double-check and try again.");
        return null;
      }
      setGeo(data);
      return data;
    } catch (e) {
      setGeo(null);
      setLalamoveError(e?.message || "Unable to locate address.");
      return null;
    }
  };

  // Fixed pickup location for the business (Lalamove origin)
  const LALAMOVE_PICKUP = useMemo(
    () => ({
      lat: 13.932713984764295,
      lng: 121.6134010614894,
      address: "Store pickup location",
    }),
    []
  );

  const fetchLalamoveQuote = async (dropoff) => {
    try {
      setLalamoveLoading(true);
      setLalamoveError("");
      const { data, error } = await supabase.functions.invoke("lalamove-quote", {
        body: {
          pickup: LALAMOVE_PICKUP,
          dropoff,
          serviceType: lalamoveConfig.serviceType,
          itemWeight: lalamoveConfig.itemWeight,
        },
      });
      if (error) {
        setLalamoveQuote(null);
        setLalamoveError(error.message || "Failed to get Lalamove fee.");
        return null;
      }
      setLalamoveQuote(data || null);
      return data;
    } catch (e) {
      setLalamoveQuote(null);
      setLalamoveError(e?.message || "Unable to get Lalamove fee.");
      return null;
    } finally {
      setLalamoveLoading(false);
    }
  };

  const handleShippingNext = async () => {
    if (!canContinueShipping || lalamoveLoading) return;

    const geoResult = await geocodeAddress();
    if (!geoResult) return;

    const dropoff = {
      lat: geoResult.lat,
      lng: geoResult.lng,
      address: geoResult.formatted || buildFullAddress(),
    };

    const quote = await fetchLalamoveQuote(dropoff);
    if (!quote) return;

    setStep(2);
  };

  const placeOrder = async () => {
    if (!checkoutItems.length) return;

    const first = checkoutItems[0];
    const itemCount = checkoutItems.reduce((n, it) => n + (it.qty || 1), 0);

    // Build buyer display name and shipping address snapshot for sellers
    const buyerName = `${ship.firstName || ""} ${ship.lastName || ""}`.trim() || null;
    const addrParts = [];
    if (ship.street) addrParts.push(ship.street);
    const cityProv = [ship.city, ship.province].filter(Boolean).join(", ");
    const withPostal = [cityProv, ship.zip].filter(Boolean).join(" ");
    if (withPostal) addrParts.push(withPostal);
    const buyerAddress = addrParts.join(" · ") || null;

    // Persist basic order summary to Supabase
    try {
      const { data: created, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id || null,
          total_amount: totals.total,
          item_count: itemCount,
          summary_title: first.title,
          summary_image: first.image || null,
          seller_display: first.seller || null,
          color: first.color || null,
          status: "Pending",
        })
        .select("id")
        .single();

      if (!orderErr && created?.id) {
        const orderId = created.id;
        const itemsPayload = checkoutItems
          .filter((it) => it.seller_id) // only items with a known seller
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
            payment_method: payMethod || null,
            status: "Pending",
          }));

        if (itemsPayload.length) {
          await supabase.from("order_items").insert(itemsPayload);
        }

        // For cash on delivery, do not redirect to PayMongo; keep local flow
        if (payMethod === "cod") {
          clearCart();
          navigate("/checkout/success", { state: { total: totals.total } });
          return;
        }

        // After order + items are saved, request a PayMongo Checkout session
        const { data: session, error: sessionErr } = await supabase.functions.invoke(
          "create-checkout-session",
          {
            body: { order_id: orderId },
          }
        );

        if (!sessionErr && session?.checkout_url) {
          // Clear cart locally and redirect buyer to PayMongo hosted checkout
          clearCart();
          window.location.href = session.checkout_url;
          return;
        }
      }
    } catch {
      // best-effort; even if this fails, still clear cart and show success UI
    }

    // Fallback: if anything above fails, keep the old behavior
    clearCart();
    navigate("/checkout/success", { state: { total: totals.total } });
  };

  if (isSuspended) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <div className="font-semibold text-red-900 mb-1">Account suspended</div>
          <p className="mb-2">
            Your account has been suspended by an administrator. You can still browse products, but
            placing new orders is currently disabled.
          </p>
          <p className="text-xs text-red-900/80 mb-3">
            If you believe this is a mistake or would like to appeal, please contact support.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/logout")}
              className="rounded-xl border border-[var(--line-amber)] px-4 py-2.5 text-sm font-medium text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
            >
              Log out
            </button>
            <button
              type="button"
              onClick={() => navigate("/support")}
              className="rounded-xl bg-[var(--orange-600)] px-4 py-2.5 text-white text-sm font-medium hover:brightness-95"
            >
              Contact support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header: back button + steps aligned */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/cart")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
          aria-label="Back to Cart"
        >
          ←
        </button>
        <div className="flex-1 flex items-center justify-between gap-2">
          <div className="hidden sm:block">
            <h1 className="text-base font-semibold text-[var(--brown-700)]">Checkout</h1>
            <p className="text-xs text-gray-600">Complete your shipping, payment, and review.</p>
          </div>
          <div className="flex-1 flex justify-center">
            <Progress step={step} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px] mt-2">
        {/* LEFT: step panel */}
        <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
          {step === 1 && (
            <ShippingForm
              ship={ship}
              setShip={setShip}
              onNext={handleShippingNext}
              disabledNext={!canContinueShipping || lalamoveLoading}
            />
          )}
          {step === 2 && (
            <PaymentForm
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              card={card}
              setCard={setCard}
              agree={agree}
              setAgree={setAgree}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              disabledNext={!canContinuePayment}
            />
          )}
          {step === 3 && (
            <ReviewForm
              ship={ship}
              payMethod={payMethod}
              card={card}
              onBack={() => setStep(2)}
              onPlace={placeOrder}
              total={totals.total}
            />
          )}
        </div>

        {/* RIGHT: order summary */}
        <aside className="rounded-2xl border border-[var(--line-amber)] bg-white p-5 h-fit">
          <h3 className="font-semibold text-[var(--brown-700)] mb-3">Order Summary</h3>

          <div className="space-y-4">
            {checkoutItems.map((it) => (
              <div key={it.id} className="flex gap-3">
                <div className="relative">
                  <img
                    src={it.image}
                    alt={it.title}
                    className="h-16 w-20 object-cover rounded-md border border-[var(--line-amber)]"
                  />
                  <span className="absolute -left-2 -top-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-[var(--orange-600)] px-1.5 text-[11px] font-semibold text-white">
                    {it.qty}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[var(--brown-700)] text-sm">{it.title}</div>
                  <div className="text-[11px] text-gray-600">Sold by: {it.seller || "Manila Furniture Co."}</div>
                  <div className="text-sm font-semibold">{peso((it.price || 0) * (it.qty || 1))}</div>
                </div>
              </div>
            ))}

            {/* Voucher selection (seller promotions; single-seller carts only) */}
            {applicableVouchers.length > 0 && (
              <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-3 text-sm">
                <div className="font-semibold text-[var(--brown-700)]">Voucher</div>
                <select
                  className="mt-2 w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-sm"
                  value={selectedVoucherId || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedVoucherId(val || null);
                  }}
                >
                  <option value="">No voucher — select an available voucher to apply a discount to this order.</option>
                  {applicableVouchers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </option>
                  ))}
                </select>
                {selectedVoucherId && totals.promoDiscount > 0 && (
                  <div className="mt-1 text-[11px] text-emerald-700">
                    Voucher applied: you save {peso(totals.promoDiscount)} on this order.
                  </div>
                )}
              </div>
            )}

            <hr className="border-[var(--line-amber)]/70" />

            <Row label={`Subtotal`} value={peso(totals.subtotal)} />
            <Row
              label={`Shipping (Lalamove)`}
              value={
                checkoutItems.length === 0 || !lalamoveQuote
                  ? ""
                  : peso(totals.shipping)
              }
            />
            {lalamoveLoading && (
              <div className="text-xs text-gray-600">Calculating Lalamove delivery fee...</div>
            )}
            {lalamoveError && !lalamoveLoading && (
              <div className="text-xs text-red-600">{lalamoveError}</div>
            )}
            {lalamoveQuote && !lalamoveLoading && !lalamoveError && (
              <div className="text-xs text-gray-600">
                Distance approx.:
                {lalamoveQuote.distance?.value
                  ? ` ${(Number(lalamoveQuote.distance.value) / 1000).toFixed(1)} km`
                  : ""}
              </div>
            )}
            <Row label={`Tax (VAT 12%)`} value={peso(totals.vat)} />
            {totals.promoDiscount > 0 && (
              <Row label={`Voucher Discount`} value={`- ${peso(totals.promoDiscount)}`} />
            )}
            <div className="mt-1 pt-2 border-t border-[var(--line-amber)]/70">
              <Row label={<b>Total</b>} value={<b>{peso(totals.total)}</b>} />
            </div>

            <div className="mt-2 rounded-xl bg-[var(--amber-50)] border border-[var(--line-amber)] p-3 text-sm text-[var(--brown-700)]">
              <div className="font-medium mb-1">Estimated Delivery</div>
              <div className="text-xs text-gray-700">7–10 business days</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------------------- Step Components --------------------------- */

function ShippingForm({ ship, setShip, onNext, disabledNext }) {
  const { user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [activeAddressId, setActiveAddressId] = useState("");
  const set = (k) => (e) => setShip((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("addresses")
          .select(
            "id, label, name, line1, line2, phone, province, city, postal_code"
          )
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });
        if (error || cancelled) return;
        setSavedAddresses(data || []);
      } catch {
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Prefill email from logged-in user if the form is still empty
  useEffect(() => {
    if (!user?.email) return;
    setShip((prev) => {
      if (prev.email) return prev;
      return { ...prev, email: user.email };
    });
  }, [user?.email, setShip]);
  const applyAddressToForm = (addr) => {
    if (!addr) return;
    const fullName = addr.name || "";
    const [firstName, ...rest] = fullName.split(" ");
    const lastName = rest.join(" ");
    setShip((s) => ({
      ...s,
      firstName: firstName || s.firstName,
      lastName: lastName || s.lastName,
      phone: addr.phone || s.phone,
      street: [addr.line1, addr.line2].filter(Boolean).join(", "),
      city: addr.city || s.city,
      province: addr.province || s.province,
      zip: addr.postal_code || s.zip,
    }));
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon="" title="Shipping Information" />
        {savedAddresses.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-xl border border-[var(--line-amber)] px-3 py-1 text-xs text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
            onClick={() => {
              setActiveAddressId("");
              setShowAddressModal(true);
            }}
          >
            <span>Saved addresses</span>
          </button>
        )}
      </div>
      <div className="grid gap-3 mt-3">
        <TwoCols>
          <Field label="First Name"><Input value={ship.firstName} onChange={set("firstName")} /></Field>
          <Field label="Last Name"><Input value={ship.lastName} onChange={set("lastName")} /></Field>
        </TwoCols>

        <TwoCols>
          <Field label="Email Address"><Input value={ship.email} onChange={set("email")} /></Field>
          <Field label="Phone Number"><Input value={ship.phone} onChange={set("phone")} /></Field>
        </TwoCols>

        <Field label="Street Address"><Input value={ship.street} onChange={set("street")} /></Field>

        <TwoCols>
          <Field label="City"><Input value={ship.city} onChange={set("city")} /></Field>
          <Field label="Province">
            <Input value={ship.province} onChange={set("province")} placeholder="Province" />
          </Field>
        </TwoCols>

        <TwoCols>
          <Field label="ZIP Code"><Input value={ship.zip} onChange={set("zip")} /></Field>
          <div />
        </TwoCols>

        <Field label="Delivery Instructions (Optional)">
          <Input value={ship.note} onChange={set("note")} placeholder="Gate code, landmarks, etc." />
        </Field>

        <div className="pt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <button
              type="button"
              className="rounded-xl border border-[var(--line-amber)] px-3 py-1 text-xs text-[var(--brown-700)] hover:bg-[var(--cream-50)] disabled:opacity-50"
              disabled={savingAddress || !user?.id}
              onClick={async () => {
                if (!user?.id) return;
                const fullName = `${ship.firstName || ""} ${ship.lastName || ""}`.trim();
                if (!fullName || !ship.street) {
                  alert("Please fill in at least name and street before saving the address.");
                  return;
                }
                try {
                  setSavingAddress(true);
                  const payload = {
                    user_id: user.id,
                    label: null,
                    name: fullName,
                    line1: ship.street || null,
                    line2: null,
                    phone: ship.phone || null,
                    province: ship.province || null,
                    city: ship.city || null,
                    postal_code: ship.zip || null,
                  };
                  const { data, error } = await supabase
                    .from("addresses")
                    .insert(payload)
                    .select("id, label, name, line1, line2, phone, province, city, postal_code, created_at, is_default")
                    .single();
                  if (!error && data) {
                    setSavedAddresses((prev) => [data, ...prev]);
                  }
                } catch {
                  // ignore
                } finally {
                  setSavingAddress(false);
                }
              }}
            >
              {savingAddress ? "Saving..." : "Save as address"}
            </button>
          </div>

          <div className="md:ml-auto">
            <Button primary disabled={disabledNext} onClick={onNext}>Continue to Payment</Button>
          </div>
        </div>
      </div>

      {showAddressModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg border border-[var(--line-amber)]">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-[var(--brown-700)] text-sm">Saved Addresses</div>
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-[var(--brown-700)]"
                onClick={() => setShowAddressModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="mb-2">
              <select
                className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2 text-sm bg-white"
                value={activeAddressId}
                onChange={(e) => {
                  const id = e.target.value;
                  setActiveAddressId(id);
                  const addr = savedAddresses.find((a) => a.id === id);
                  applyAddressToForm(addr);
                }}
              >
                <option value="">Select saved address</option>
                {savedAddresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label || a.name || [a.line1, a.city].filter(Boolean).join(", ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 text-xs text-gray-700">
              {savedAddresses.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-[var(--line-amber)] p-2 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold truncate">
                      {a.label || a.name || [a.line1, a.city].filter(Boolean).join(", ")}
                    </div>
                    <button
                      type="button"
                      className="text-[var(--orange-600)] text-[11px] hover:underline"
                      onClick={() => {
                        setActiveAddressId(a.id);
                        applyAddressToForm(a);
                        setShowAddressModal(false);
                      }}
                    >
                      Use
                    </button>
                  </div>
                  <div className="text-[11px] text-gray-600 leading-snug">
                    {a.name && <div>{a.name}</div>}
                    <div>
                      {[a.line1, a.line2].filter(Boolean).join(", ")}
                    </div>
                    <div>
                      {[a.city, a.province].filter(Boolean).join(", ")} {a.postal_code}
                    </div>
                    {a.phone && <div>Phone: {a.phone}</div>}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      className="text-[var(--orange-600)] text-[11px] hover:underline"
                      onClick={async () => {
                        const current = a.label || "";
                        const next = window.prompt("Address label", current);
                        if (next == null) return;
                        const trimmed = next.trim();
                        try {
                          await supabase
                            .from("addresses")
                            .update({ label: trimmed || null })
                            .eq("id", a.id)
                            .eq("user_id", user?.id || "");
                          setSavedAddresses((prev) =>
                            prev.map((x) => (x.id === a.id ? { ...x, label: trimmed || null } : x))
                          );
                        } catch {
                          // ignore errors for now
                        }
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="text-red-600 text-[11px] hover:underline"
                      onClick={async () => {
                        if (!window.confirm("Remove this address?")) return;
                        try {
                          await supabase
                            .from("addresses")
                            .update({ deleted_at: new Date().toISOString() })
                            .eq("id", a.id)
                            .eq("user_id", user?.id || "");
                          setSavedAddresses((prev) => prev.filter((x) => x.id !== a.id));
                          if (activeAddressId === a.id) setActiveAddressId("");
                        } catch {
                          // ignore errors for now
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {savedAddresses.length === 0 && (
                <div className="text-center text-[11px] text-gray-500 py-4">No saved addresses yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentForm({
  payMethod, setPayMethod, card, setCard, agree, setAgree, onBack, onNext, disabledNext,
}) {
  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }));
  return (
    <div className="p-5">
      <SectionTitle icon="💳" title="Payment Information" />

      {/* Methods */}
      <div className="mt-3 space-y-2">
        <MethodItem active={payMethod === "card"} onClick={() => setPayMethod("card")}>Credit/Debit Card</MethodItem>
        <MethodItem active={payMethod === "gcash"} onClick={() => setPayMethod("gcash")}>GCash</MethodItem>
        <MethodItem active={payMethod === "paymaya"} onClick={() => setPayMethod("paymaya")}>PayMaya</MethodItem>
        <MethodItem active={payMethod === "cod"} onClick={() => setPayMethod("cod")}>Cash on Delivery</MethodItem>
      </div>

      <div className="mt-3 text-xs text-gray-700 bg-[var(--cream-50)] border border-[var(--line-amber)] rounded-xl p-3">
        For Card, GCash, and PayMaya, you will be redirected to PayMongo's secure checkout page to
        complete your payment. We do not store your payment details.
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          I accept the <a className="text-[var(--orange-600)]">Terms and Conditions</a> and{" "}
          <a className="text-[var(--orange-600)]">Privacy Policy</a>
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <Button secondary onClick={onBack}>Back to Shipping</Button>
        <Button primary disabled={disabledNext} onClick={onNext}>Review Order</Button>
      </div>
    </div>
  );
}

function ReviewForm({ ship, payMethod, card, onBack, onPlace, total }) {
  const cardLast = card.number?.slice(-4);
  return (
    <div className="p-5">
      <SectionTitle icon="📝" title="Review Your Order" />

      <div className="grid gap-4 mt-3">
        <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4">
          <div className="font-semibold text-[var(--brown-700)] mb-1">Shipping Address</div>
          <div className="text-sm text-[var(--brown-700)]">
            {ship.firstName} {ship.lastName}<br />
            {ship.street}<br />
            {ship.city}{ship.province ? `, ${ship.province}` : ""} {ship.zip}<br />
            {ship.email}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4">
          <div className="font-semibold text-[var(--brown-700)] mb-1">Payment Method</div>
          <div className="text-sm text-[var(--brown-700)]">
            {payMethod === "card" && <>Credit/Debit Card — Ending in {cardLast || "••••"}</>}
            {payMethod === "gcash" && "GCash"}
            {payMethod === "paymaya" && "PayMaya"}
            {payMethod === "cod" && "Cash on Delivery"}
          </div>
          {payMethod !== "cod" && (
            <div className="mt-2 text-xs text-gray-700">
              You will be redirected to PayMongo's secure checkout page to complete this payment.
            </div>
          )}
          {payMethod === "cod" && (
            <div className="mt-2 text-xs text-gray-700">
              You will pay in cash to the courier upon delivery. No online payment is required.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button secondary onClick={onBack}>Back to Payment</Button>
          <Button primary onClick={onPlace}>Place Order – {peso(total)}</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Success Page ---------------------------- */
export function CheckoutSuccess() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-green-100 text-green-600 text-4xl">✔</div>
      <h1 className="text-2xl font-bold text-[var(--brown-700)]">Order Placed Successfully!</h1>
      <p className="mt-2 text-sm text-gray-700">
        Thank you for your purchase. We'll send you a confirmation email shortly.
      </p>
      <div className="mt-6 space-y-3">
        <button
          className="w-full rounded-xl bg-[var(--orange-600)] px-4 py-3 text-white font-medium hover:brightness-95"
          onClick={() => navigate("/shop")}
        >
          Continue Shopping
        </button>
        <button
          className="w-full rounded-xl border border-[var(--line-amber)] px-4 py-3 text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
          onClick={() => navigate("/profile?tab=orders")}
        >
          View Order History
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Tiny UI bits ---------------------------- */
function Progress({ step }) {
  const Item = ({ i, label, icon }) => {
    const active = step >= i;
    return (
      <div className="flex items-center gap-2">
        <div
          className={`grid h-9 w-9 place-items-center rounded-full border ${
            active
              ? "border-emerald-500 text-emerald-600 bg-white"
              : "border-[var(--line-amber)] text-[var(--orange-600)] bg-white"
          }`}
        >
          <span className="text-sm font-semibold">{i}</span>
        </div>
        <div className={`${active ? "text-[var(--brown-700)]" : "text-gray-500"} text-sm hidden sm:block`}>
          {label}
        </div>
        {i < 3 && <div className={`mx-3 h-[2px] w-16 ${active ? "bg-emerald-500" : "bg-[var(--line-amber)]"}`} />}
      </div>
    );
  };
  return (
    <div className="flex items-center justify-center gap-1">
      <Item i={1} label="Shipping Info" />
      <Item i={2} label="Payment" />
      <Item i={3} label="Review Order" />
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="font-semibold text-[var(--brown-700)]">{title}</h2>
    </div>
  );
}

function TwoCols({ children }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2 text-sm outline-none"
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2 text-sm outline-none bg-white"
    />
  );
}

function MethodItem({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl px-4 py-2 border ${
        active
          ? "border-[var(--orange-600)] bg-[var(--amber-50)]"
          : "border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-[var(--brown-700)]">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Button({ primary, secondary, children, ...rest }) {
  const cls = primary
    ? "rounded-xl bg-[var(--orange-600)] px-4 py-2.5 text-white font-medium hover:brightness-95 disabled:opacity-50"
    : secondary
    ? "rounded-xl border border-[var(--line-amber)] px-4 py-2.5 text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
    : "rounded-xl px-4 py-2.5";
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
