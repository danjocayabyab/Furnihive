// src/admin/PayoutsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const peso = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n || 0);

function StatusPill({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-900 border-amber-200",
    paid: "bg-green-100 text-green-700 border-green-200",
  };
  const cls = map[status] || map.pending;
  return <span className={`text-[11px] px-2 py-[2px] rounded-full border capitalize ${cls}`}>{status}</span>;
}

export default function PayoutsPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmPayout, setConfirmPayout] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("seller_payouts")
        .select("id, seller_id, order_id, order_item_id, gross_amount, platform_fee, net_amount, status, paid_at, created_at")
        .order("created_at", { ascending: false });
      if (err) throw err;

      const payouts = data || [];

      // Enrich with seller name/store_name and a friendly order code
      const sellerIds = Array.from(new Set(payouts.map((p) => p.seller_id).filter(Boolean)));
      const orderIds = Array.from(new Set(payouts.map((p) => p.order_id).filter(Boolean)));
      const orderItemIds = Array.from(new Set(payouts.map((p) => p.order_item_id).filter(Boolean)));

      const [profilesRes, ordersRes, itemsRes] = await Promise.all([
        sellerIds.length
          ? supabase
              .from("profiles")
              .select("id, role, first_name, last_name, store_name")
              .in("id", sellerIds)
          : Promise.resolve({ data: [], error: null }),
        orderIds.length
          ? supabase
              .from("orders")
              .select("id, created_at")
              .in("id", orderIds)
          : Promise.resolve({ data: [], error: null }),
        orderItemIds.length
          ? supabase
              .from("order_items")
              .select("id, title, qty, unit_price, image, buyer_name, buyer_address, payment_method")
              .in("id", orderItemIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const profErr = profilesRes.error;
      const ordErr = ordersRes.error;
      const itemsErr = itemsRes.error;
      if (profErr) console.warn("Failed to load payout seller profiles", profErr);
      if (ordErr) console.warn("Failed to load payout orders", ordErr);
      if (itemsErr) console.warn("Failed to load payout items", itemsErr);

      const profiles = profilesRes.data || [];
      const orders = ordersRes.data || [];
      const items = itemsRes.data || [];

      const sellerNameById = new Map();
      profiles.forEach((p) => {
        const role = String(p.role || "").toLowerCase();
        const store = p.store_name && role === "seller" ? p.store_name : "";
        const full = [p.first_name, p.last_name].filter(Boolean).join(" ");
        sellerNameById.set(p.id, store || full || "Seller");
      });

      const orderInfoById = new Map();
      orders.forEach((o) => {
        const rawId = String(o.id || "");
        const code = rawId ? `ORD-${rawId.slice(0, 8).toUpperCase()}` : "Order";
        const created = o.created_at
          ? new Date(o.created_at).toLocaleString("en-PH")
          : "";
        orderInfoById.set(o.id, { code, created });
      });

      const itemInfoById = new Map();
      items.forEach((it) => {
        const qty = Number(it.qty || 0);
        const unit = Number(it.unit_price || 0);
        itemInfoById.set(it.id, {
          title: it.title || "Item",
          qty,
          unitPrice: unit,
          image: it.image || "",
          buyerName: it.buyer_name || "",
          buyerAddress: it.buyer_address || "",
          paymentMethod: it.payment_method || "",
        });
      });

      const enriched = payouts.map((p) => {
        const sellerName = sellerNameById.get(p.seller_id) || p.seller_id;
        const info = orderInfoById.get(p.order_id) || null;
        const item = itemInfoById.get(p.order_item_id) || null;

        const rawOrderId = String(p.order_id || "");
        const fallbackOrderCode = rawOrderId
          ? `ORD-${rawOrderId.slice(0, 8).toUpperCase()}`
          : "Order";

        const rawPayoutId = String(p.id || "");
        const payoutCode = rawPayoutId
          ? `PYT-${rawPayoutId.slice(0, 8).toUpperCase()}`
          : "Payout";

        return {
          ...p,
          sellerName,
          orderCode: info?.code || fallbackOrderCode,
          orderCreated: info?.created || null,
          productTitle: item?.title || null,
          productQty: item?.qty || null,
          productUnitPrice: item?.unitPrice || null,
          productImage: item?.image || null,
          buyerName: item?.buyerName || null,
          buyerAddress: item?.buyerAddress || null,
          paymentMethod: item?.paymentMethod || null,
          payoutCode,
        };
      });

      setRows(enriched);
    } catch (e) {
      setError(e?.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (status === "all") return rows;
    return rows.filter((r) => r.status === status);
  }, [rows, status]);

  const markAsPaid = async (id) => {
    if (!id) return;
    setUpdatingId(id);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("seller_payouts")
        .update({ status: "paid", paid_at: now })
        .eq("id", id);
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "paid", paid_at: now } : r)));
    } catch (e) {
      alert(e?.message || "Failed to update payout status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--line-amber)] bg-white shadow-card p-4 flex flex-col items-center">
          <div className="text-xs text-[var(--brown-700)]/70 mb-1">Total Payouts</div>
          <div className="text-xl font-semibold text-[var(--brown-700)]">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--line-amber)] bg-white shadow-card p-4 flex flex-col items-center">
          <div className="text-xs text-[var(--brown-700)]/70 mb-1">Pending</div>
          <div className="text-xl font-semibold text-[var(--brown-700)]">{rows.filter((r) => r.status === "pending").length}</div>
        </div>
        <div className="rounded-xl border border-[var(--line-amber)] bg-white shadow-card p-4 flex flex-col items-center">
          <div className="text-xs text-[var(--brown-700)]/70 mb-1">Paid</div>
          <div className="text-xl font-semibold text-[var(--brown-700)]">{rows.filter((r) => r.status === "paid").length}</div>
        </div>
      </div>

      <section className="rounded-xl border border-[var(--line-amber)] bg-white shadow-card">
        <div className="px-5 py-3 border-b border-[var(--line-amber)]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-[var(--brown-700)]">Seller Payouts</div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
            <button
              onClick={load}
              className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-white text-sm hover:bg-[var(--cream-50)]"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading && <div className="text-sm text-[var(--brown-700)]/70">Loading payouts...</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && !filtered.length && (
            <div className="py-10 text-center text-[var(--brown-700)]/60">No payouts found.</div>
          )}

          {filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[var(--line-amber)] bg-gradient-to-br from-[#fffdf5] to-[#fffaf0] px-5 py-4 flex items-start justify-between gap-4"
            >
              {/* Left: mimic seller order row (image + meta) */}
              <div className="flex items-start gap-4 min-w-0">
                {p.productImage && (
                  <img
                    src={p.productImage}
                    alt={p.productTitle || "Order item"}
                    className="h-16 w-20 object-cover rounded-lg border border-[var(--line-amber)]"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-[var(--brown-700)]">
                      {p.orderCode}
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                  {p.orderCreated && (
                    <div className="text-xs text-gray-600">{p.orderCreated}</div>
                  )}
                  {p.productTitle && (
                    <div className="mt-1 text-sm text-[var(--brown-700)] truncate">
                      {p.productTitle}
                    </div>
                  )}
                  {p.productQty && (
                    <div className="text-xs text-gray-600">Qty: {p.productQty}</div>
                  )}
                  {p.buyerName && (
                    <div className="mt-1 text-xs text-gray-600 truncate">
                      {p.buyerName}
                      {p.buyerAddress ? ` — ${p.buyerAddress}` : ""}
                    </div>
                  )}
                  <div className="mt-2 text-[10px] text-[var(--brown-700)]/50">
                    Seller: {p.sellerName}
                  </div>
                  <div className="text-[10px] text-[var(--brown-700)]/50">
                    Payout: {p.payoutCode}
                  </div>
                </div>
              </div>

              {/* Right: total + payment + payout info */}
              <div className="text-right shrink-0 min-w-[180px]">
                <div className="text-sm font-semibold text-[var(--brown-700)]">
                  {peso(p.gross_amount)}
                </div>
                {p.paymentMethod && (
                  <div className="text-xs text-gray-600">{p.paymentMethod}</div>
                )}
                <div className="mt-1 text-[11px] text-[var(--brown-700)]/60">
                  Payout: {p.status === "paid" ? "Paid" : "Pending"} — Net {peso(p.net_amount)}
                </div>
                <div className="text-[11px] text-[var(--brown-700)]/60">
                  Platform fee: {peso(p.platform_fee)}
                </div>
                {p.paid_at && (
                  <div className="mt-1 text-[11px] text-[var(--brown-700)]/60">
                    Paid at: {new Date(p.paid_at).toLocaleString("en-PH")}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-end gap-2">
                  {p.status === "pending" && (
                    <button
                      onClick={() => setConfirmPayout(p)}
                      disabled={updatingId === p.id}
                      className="h-8 px-3 rounded-lg bg-[var(--orange-600)] text-white text-xs hover:brightness-95 disabled:opacity-60"
                    >
                      {updatingId === p.id ? "Updating..." : "Mark as paid"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {confirmPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[var(--line-amber)] shadow-card p-5">
            <div className="mb-3">
              <div className="text-sm font-semibold text-[var(--brown-700)] mb-1">Confirm Payout</div>
              <div className="text-xs text-[var(--brown-700)]/70">
                You are about to mark this payout as <span className="font-semibold">paid</span>. Make sure you have
                already sent the funds to the seller.
              </div>
            </div>

            <div className="mb-3 rounded-xl bg-[var(--cream-50)] border border-[var(--line-amber)] p-3 text-xs text-[var(--brown-700)]/80 space-y-1">
              <div><span className="font-semibold">Seller:</span> {confirmPayout.sellerName}</div>
              <div><span className="font-semibold">Order:</span> {confirmPayout.orderCode}</div>
              <div><span className="font-semibold">Payout:</span> {confirmPayout.payoutCode}</div>
              <div>
                <span className="font-semibold">Net to seller:</span> {peso(confirmPayout.net_amount)}
              </div>
              <div>
                <span className="font-semibold">Platform fee:</span> {peso(confirmPayout.platform_fee)}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-white text-xs text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
                onClick={() => setConfirmPayout(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-9 px-3 rounded-lg bg-[var(--orange-600)] text-white text-xs hover:brightness-95 disabled:opacity-60"
                disabled={!!updatingId}
                onClick={async () => {
                  await markAsPaid(confirmPayout.id);
                  setConfirmPayout(null);
                }}
              >
                Confirm paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
