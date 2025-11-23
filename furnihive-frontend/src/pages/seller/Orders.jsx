// src/pages/seller/Orders.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

function formatOrderId(id) {
  if (!id) return "Order";
  return `ORD-${String(id).slice(0, 8).toUpperCase()}`;
}

function formatOrderDate(dateISO) {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return String(dateISO);
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SellerOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sellerId = user?.id;

  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all | pending | processing | shipped | delivered
  const [view, setView] = useState(null); // order object for the modal

  // Debug: see which seller id this page is using
  console.log("SELLER ORDERS sellerId", sellerId);

  // Load real orders for this seller from order_items joined to orders
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;

    async function loadOrders() {
      // Step 1: load all order_items for this seller
      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select(
          "id, order_id, title, image, qty, unit_price, shipping_fee, created_at, buyer_name, buyer_address, payment_method, status"
        )
        .eq("seller_id", sellerId);

      console.log("SELLER ORDERS result", {
        error: itemsErr,
        rows: items?.length,
        sample: items?.[0],
      });

      if (cancelled || itemsErr || !items || !items.length) {
        if (!cancelled) setOrders([]);
        return;
      }

      const byOrder = new Map();
      items.forEach((row) => {
        const oid = row.order_id;
        if (!oid) return;
        if (!byOrder.has(oid)) {
          byOrder.set(oid, {
            id: oid,
            status: (row.status || "Pending").toLowerCase(),
            dateISO: row.created_at || null,
            payment: row.payment_method || "",
            paymentStatus: "pending",
            paymentProvider: null,
            payoutStatus: null,
            payoutNet: 0,
            customer: {
              name: row.buyer_name || "Customer",
              address: row.buyer_address || "",
            },
            items: [],
            shipping: 0,
          });
        }
        const o = byOrder.get(oid);
        if (row.status) o.status = row.status.toLowerCase();
        if (!o.payment && row.payment_method) o.payment = row.payment_method;
        if (!o.customer.name && row.buyer_name) o.customer.name = row.buyer_name;
        if (!o.customer.address && row.buyer_address) o.customer.address = row.buyer_address;
        o.items.push({
          title: row.title,
          qty: row.qty || 1,
          price: Number(row.unit_price || 0),
          image: row.image || "",
        });
        o.shipping += Number(row.shipping_fee || 0);
      });

      const orderIds = Array.from(byOrder.keys());
      if (orderIds.length) {
        const { data: orderRows, error: ordersErr } = await supabase
          .from("orders")
          .select("id, payment_status, payment_provider, lalamove_order_id, lalamove_share_link")
          .in("id", orderIds);

        console.log("SELLER ORDERS orderRows", { ordersErr, orderRows });

        if (!cancelled && !ordersErr && orderRows) {
          orderRows.forEach((row) => {
            const o = byOrder.get(row.id);
            if (!o) return;
            if (row.payment_status) {
              o.paymentStatus = String(row.payment_status).toLowerCase();
            }
            if (row.payment_provider) {
              o.paymentProvider = row.payment_provider;
            }
            // Always map tracking id and share link from DB onto the in-memory order object
            if (typeof row.lalamove_order_id !== "undefined") {
              o.lalamoveOrderId = row.lalamove_order_id || null;
            }
            if (typeof row.lalamove_share_link !== "undefined") {
              o.lalamoveShareLink = row.lalamove_share_link || null;
            }
          });
        }

        // Load payout info for this seller across these orders
        const { data: payoutRows, error: payoutsErr } = await supabase
          .from("seller_payouts")
          .select("order_id, seller_id, status, net_amount")
          .eq("seller_id", sellerId)
          .in("order_id", orderIds);

        if (!cancelled && !payoutsErr && payoutRows) {
          // Aggregate per order: total net and combined status
          const payoutByOrder = new Map();
          payoutRows.forEach((p) => {
            const oid = p.order_id;
            if (!oid) return;
            const current = payoutByOrder.get(oid) || { net: 0, hasPending: false, hasPaid: false };
            current.net += Number(p.net_amount || 0);
            const st = String(p.status || "").toLowerCase();
            if (st === "pending") current.hasPending = true;
            if (st === "paid") current.hasPaid = true;
            payoutByOrder.set(oid, current);
          });

          payoutByOrder.forEach((val, oid) => {
            const o = byOrder.get(oid);
            if (!o) return;
            if (val.hasPending) o.payoutStatus = "pending";
            else if (val.hasPaid) o.payoutStatus = "paid";
            o.payoutNet = val.net;
          });
        }
      }

      // Sort by newest order date
      const list = Array.from(byOrder.values()).sort((a, b) => {
        const tb = b.dateISO ? new Date(b.dateISO).getTime() : 0;
        const ta = a.dateISO ? new Date(a.dateISO).getTime() : 0;
        return tb - ta;
      });

      console.log("SELLER ORDERS list", list);

      setOrders(list);
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  /* ---------- derived values ---------- */
  const counts = useMemo(() => {
    const c = { all: orders.length, pending: 0, processing: 0, shipped: 0, delivered: 0 };
    orders.forEach((o) => (c[o.status] += 1));
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (tab !== "all" && o.status !== tab) return false;
      if (!s) return true;
      return (
        o.id.toLowerCase().includes(s) ||
        o.customer.name.toLowerCase().includes(s)
      );
    });
  }, [orders, tab, q]);

  /* ---------- actions ---------- */
  const acceptOrder = async (id) => {
    // pending -> processing
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "processing" } : o))
    );
    try {
      const { error: ordersErr } = await supabase
        .from("orders")
        .update({ status: "Processing" })
        .eq("id", id);
      console.log("ACCEPT_ORDER orders update error", ordersErr);

      const { error: itemsErr } = await supabase
        .from("order_items")
        .update({ status: "Processing" })
        .eq("order_id", id);
      console.log("ACCEPT_ORDER order_items update error", itemsErr);
    } catch (e) {
      console.log("ACCEPT_ORDER exception", e);
    }
  };

  const markShipped = async (id) => {
    // processing -> shipped
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "shipped" } : o))
    );
    try {
      // 1) Update order + items status in DB
      const { error: ordersErr } = await supabase
        .from("orders")
        .update({ status: "Shipped" })
        .eq("id", id);
      console.log("MARK_SHIPPED orders update error", ordersErr);

      const { error: itemsErr } = await supabase
        .from("order_items")
        .update({ status: "Shipped" })
        .eq("order_id", id);
      console.log("MARK_SHIPPED order_items update error", itemsErr);

      // 2) Load Lalamove quotation metadata for this order
      const { data: meta, error: metaErr } = await supabase
        .from("orders")
        .select(
          "lalamove_quotation_id, lalamove_sender_stop_id, lalamove_recipient_stop_id"
        )
        .eq("id", id)
        .maybeSingle();

      console.log("MARK_SHIPPED meta", { meta, metaErr });

      if (!meta || !meta.lalamove_quotation_id) {
        console.log("MARK_SHIPPED: missing Lalamove quotation metadata for order", id);
        return;
      }

      const current = orders.find((o) => o.id === id) || null;

      // 3) Invoke lalamove-book edge function to create a real sandbox order
      const { data: result, error: fnErr } = await supabase.functions.invoke(
        "lalamove-book",
        {
          body: {
            order_id: id,
            quotationId: meta.lalamove_quotation_id,
            sender: {
              stopId: meta.lalamove_sender_stop_id,
              name: current?.customer?.name || "Sender",
              phone: "",
            },
            recipient: {
              stopId: meta.lalamove_recipient_stop_id,
              name: current?.customer?.name || "Customer",
              phone: "",
            },
          },
        }
      );

      console.log("MARK_SHIPPED lalamove-book result", { result, fnErr });

      if (!fnErr && result?.lalamove_order_id) {
        // 4) Update local state so UI shows real Lalamove tracking id
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id ? { ...o, lalamoveOrderId: result.lalamove_order_id } : o
          )
        );
      }
    } catch (e) {
      console.log("MARK_SHIPPED exception", e);
    }
  };

  const markDelivered = async (id) => {
    // shipped -> delivered
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "delivered" } : o))
    );
    try {
      const { error: ordersErr } = await supabase
        .from("orders")
        .update({ status: "Delivered" })
        .eq("id", id);
      console.log("MARK_DELIVERED orders update error", ordersErr);

      const { error: itemsErr } = await supabase
        .from("order_items")
        .update({ status: "Delivered" })
        .eq("order_id", id);
      console.log("MARK_DELIVERED order_items update error", itemsErr);
    } catch (e) {
      console.log("MARK_DELIVERED exception", e);
    }
  };

  const totalOf = (o) =>
    o.items.reduce((s, it) => s + it.price * it.qty, 0) + (o.shipping || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header + back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/seller")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
          title="Back to Dashboard"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">
            Order Management
          </h1>
          <p className="text-xs text-gray-600">
            View and manage customer orders
          </p>
        </div>
      </div>

      {/* KPI cards — single row */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="min-w-[720px] grid grid-cols-5 gap-3">
          <KpiCard label="All Orders" value={counts.all} />
          <KpiCard label="Pending" value={counts.pending} />
          <KpiCard label="Processing" value={counts.processing} />
          <KpiCard label="Shipped" value={counts.shipped} />
          <KpiCard label="Delivered" value={counts.delivered} />
        </div>
      </div>

      {/* search */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-3 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search by order ID or customer name…"
          />
        </div>
      </div>

      {/* tabs */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", `All (${counts.all})`],
            ["pending", `Pending (${counts.pending})`],
            ["processing", `Processing (${counts.processing})`],
            ["shipped", `Shipped (${counts.shipped})`],
            ["delivered", `Delivered (${counts.delivered})`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-3 py-1 text-sm border ${
                tab === key
                  ? "bg-[var(--orange-600)] border-[var(--orange-600)] text-white"
                  : "border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* order list */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <ul className="divide-y divide-[var(--line-amber)]/70">
          {filtered.map((o) => {
            const first = o.items[0];
            return (
              <li key={o.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* left: thumb + main meta */}
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={first.image}
                      alt={first.title}
                      className="h-16 w-20 object-cover rounded-lg border border-[var(--line-amber)]"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--brown-700)]">
                          {formatOrderId(o.id)}
                        </div>
                        <StatusPill status={o.status} />
                        {o.paymentStatus && o.paymentStatus !== "pending" && (
                          <PaymentStatusPill status={o.paymentStatus} />
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatOrderDate(o.dateISO)}
                      </div>
                      <div className="mt-1 text-sm text-[var(--brown-700)] truncate">
                        {first.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        Qty: {first.qty}
                      </div>
                      <div className="mt-1 text-xs text-gray-600 truncate">
                        {o.customer.name} — {o.customer.address}
                      </div>
                    </div>
                  </div>

                  {/* right: total + actions */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">
                      {peso(totalOf(o))}
                    </div>
                    <div className="text-xs text-gray-600">{o.payment}</div>
                    {o.lalamoveOrderId && (
                      <div className="mt-1 text-[11px] text-gray-600 flex flex-wrap items-center gap-2">
                        <span>Tracking: {o.lalamoveOrderId}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(o.lalamoveOrderId)}
                          className="px-2 py-0.5 rounded border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
                        >
                          Copy
                        </button>
                        {o.lalamoveShareLink && (
                          <a
                            href={o.lalamoveShareLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
                          >
                            Track on Lalamove
                          </a>
                        )}
                      </div>
                    )}
                    {o.payoutStatus && (
                      <div className="mt-1 text-[11px] text-gray-600">
                        Payout: {o.payoutStatus === "paid" ? "Paid" : "Pending"} 
                        {o.payoutNet ? ` · Net ${peso(o.payoutNet)}` : ""}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        className="rounded-lg border border-[var(--line-amber)] px-3 py-1.5 text-xs hover:bg-[var(--cream-50)]"
                        onClick={() => navigate("/seller/messages")}
                      >
                        Contact
                      </button>
                      <button
                        className="rounded-lg border border-[var(--line-amber)] px-3 py-1.5 text-xs hover:bg-[var(--cream-50)]"
                        onClick={() => setView(o)}
                      >
                        View Details
                      </button>

                      {o.status === "pending" && (
                        <button
                          className="rounded-lg bg-[var(--orange-600)] text-white px-3 py-1.5 text-xs hover:brightness-95"
                          onClick={() => acceptOrder(o.id)}
                        >
                          Accept Order
                        </button>
                      )}

                      {o.status === "processing" && (
                        <button
                          className="rounded-lg bg-[var(--orange-600)] text-white px-3 py-1.5 text-xs hover:brightness-95"
                          onClick={() => markShipped(o.id)}
                        >
                          Mark as Shipped
                        </button>
                      )}
                      {o.status === "shipped" && (
                        <button
                          className="rounded-lg bg-[var(--orange-600)] text-white px-3 py-1.5 text-xs hover:brightness-95"
                          onClick={() => markDelivered(o.id)}
                        >
                          Mark as Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}

          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-gray-600 text-sm">
              No orders found.
            </li>
          )}
        </ul>
      </div>

      {/* details modal */}
      {view && (
        <DetailsModal order={view} onClose={() => setView(null)} />
      )}
    </div>
  );
}

/* ---------- small UI helpers ---------- */
function KpiCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-[var(--brown-700)]">
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const colors = {
    pending: "text-orange-700 bg-orange-100 border-orange-300",
    processing: "text-yellow-700 bg-yellow-100 border-yellow-300",
    shipped: "text-blue-700 bg-blue-100 border-blue-300",
    delivered: "text-green-700 bg-green-100 border-green-300",
  };
  return (
    <span className={`border rounded-full px-2 py-0.5 text-xs ${colors[status]}`}>
      {status}
    </span>
  );
}

function PaymentStatusPill({ status }) {
  const normalized = (status || "").toLowerCase();
  const colors = {
    paid: "text-green-700 bg-green-100 border-green-300",
    pending: "text-orange-700 bg-orange-100 border-orange-300",
    failed: "text-red-700 bg-red-100 border-red-300",
    cancelled: "text-gray-700 bg-gray-100 border-gray-300",
  };
  const label = normalized === "paid" ? "Paid" : normalized || "Unknown";
  const color = colors[normalized] || "text-gray-700 bg-gray-100 border-gray-300";
  return (
    <span className={`border rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}

function DetailsModal({ order, onClose }) {
  const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;
  const subtotal = order.items.reduce((s, it) => s + it.qty * it.price, 0);
  const total = subtotal + (order.shipping || 0);
  const first = order.items[0];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[var(--line-amber)] overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--line-amber)]">
          <div>
            <div className="text-sm text-gray-600">Order Details</div>
            <div className="font-semibold text-[var(--brown-700)]">{formatOrderId(order.id)}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg w-8 h-8 grid place-items-center hover:bg-[var(--cream-50)]"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* body */}
        <div className="p-5 space-y-4">
          <img
            src={first.image}
            alt={first.title}
            className="h-44 w-full object-cover rounded-xl border border-[var(--line-amber)]"
          />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-[var(--cream-50)] border border-[var(--line-amber)] p-3">
              <div className="text-gray-600">Order Status</div>
              <div className="mt-1"><StatusPill status={order.status} /></div>
            </div>
            <div className="rounded-lg bg-[var(--cream-50)] border border-[var(--line-amber)] p-3">
              <div className="text-gray-600">Order Date</div>
              <div className="mt-1">{formatOrderDate(order.dateISO)}</div>
            </div>

            <div className="col-span-2 rounded-lg bg-[var(--cream-50)] border border-[var(--line-amber)] p-3">
              <div className="text-gray-600">Customer Information</div>
              <div className="mt-1 font-medium text-[var(--brown-700)]">
                {order.customer.name}
              </div>
              <div className="text-gray-600">{order.customer.address}</div>
            </div>

            <div className="col-span-2 rounded-lg border border-[var(--line-amber)] p-3">
              <div className="text-gray-600 mb-2">Order Items</div>
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1">
                  <div className="truncate">
                    {it.title} <span className="text-gray-600">×{it.qty}</span>
                  </div>
                  <div className="font-medium">{peso(it.price)}</div>
                </div>
              ))}
              <div className="my-2 h-px bg-[var(--line-amber)]/60" />
              <Row label="Subtotal" value={peso(subtotal)} />
              <Row label="Shipping Fee" value={peso(order.shipping || 0)} />
              <Row label="Total" value={peso(total)} bold />
              <Row label="Payment Method" value={order.payment} />
              {order.paymentStatus && order.paymentStatus !== "pending" && (
                <Row
                  label="Payment Status"
                  value={<PaymentStatusPill status={order.paymentStatus} />}
                />
              )}
              {order.lalamoveOrderId && (
                <Row
                  label="Lalamove Tracking"
                  value={
                    <span className="text-xs break-all">
                      {order.lalamoveOrderId}
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(order.lalamoveOrderId)}
                        className="ml-2 px-2 py-0.5 rounded border border-[var(--line-amber)] text-[11px] hover:bg-[var(--cream-50)]"
                      >
                        Copy
                      </button>
                    </span>
                  }
                />
              )}
              {order.payoutStatus && (
                <Row
                  label="Payout"
                  value={`${order.payoutStatus === "paid" ? "Paid" : "Pending"} – Net ${peso(order.payoutNet || 0)}`}
                />
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--line-amber)]">
          <button className="rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm hover:bg-[var(--cream-50)]">
            Print Invoice
          </button>
          <button
            className="rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm hover:bg-[var(--cream-50)]"
            onClick={() => alert("Open message thread")}
          >
            Contact Customer
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="text-gray-600">{label}</div>
      <div className={bold ? "font-semibold" : ""}>{value}</div>
    </div>
  );
}
