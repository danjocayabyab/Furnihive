// src/admin/OrdersPage.jsx
import { useEffect, useMemo, useState } from "react";
import OrderDetailsModal from "./OrderDetailsModal";
import { addNotification } from "./lib/notifications";

const peso = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

export const STATUS_STYLES = {
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  shipped: "bg-purple-100 text-purple-700 border-purple-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_OPTIONS = ["processing", "shipped", "delivered", "pending", "cancelled"];

const SEED = [
  { id: "ORD-2024-001", item: "Modern Dining Set", customer: "John Dela Cruz", seller: "Manila Furniture Co.", orderDate: "10/3/2024", eta: "10/10/2024", amount: 25500, status: "processing", icon: "📦", address: "12 West Ave., Quezon City, Metro Manila", payment: "GCash", phone: "+63 917 555 0111", notes: "Leave with guard if not home." },
  { id: "ORD-2024-002", item: "Oak Wood Coffee Table", customer: "Maria Santos", seller: "Cebu Wood Works", orderDate: "10/2/2024", eta: "10/8/2024", amount: 8900, status: "shipped", icon: "🪵", address: "123 Mango St., Cebu City", payment: "Credit Card", phone: "+63 917 555 0222" },
  { id: "ORD-2024-003", item: "L-Shape Sofa", customer: "Carlos Rivera", seller: "Modern Living Solutions", orderDate: "9/28/2024", eta: "10/5/2024", amount: 35000, status: "delivered", icon: "🛋️", address: "88 Lakandula, Makati City", payment: "COD", phone: "+63 917 555 0333" },
  { id: "ORD-2024-004", item: "Queen Size Bed Frame", customer: "Ana Reyes", seller: "Manila Furniture Co.", orderDate: "10/4/2024", eta: "10/12/2024", amount: 18500, status: "pending", icon: "🛏️", address: "San Juan, Metro Manila", payment: "Bank Transfer", phone: "+63 917 555 0444" },
];

function StatusPill({ status }) {
  const cls = STATUS_STYLES[status] || "bg-gray-100 text-gray-600 border-gray-200";
  return <span className={`text-[12px] px-2 py-0.5 rounded-full border capitalize ${cls}`}>{status}</span>;
}

/* ---------- New: stat tiles (banners) ---------- */
function StatTile({ value, label, tint = "amber" }) {
  const bgMap = {
    amber: "from-[#fff7e6] to-[#fff3d6]",
    green: "from-[#effdf3] to-[#e9faef]",
    blue: "from-[#eef6ff] to-[#eaf3ff]",
    purple: "from-[#f4efff] to-[#f2ecff]",
  };
  return (
    <div className={`rounded-xl border border-[var(--line-amber)] bg-gradient-to-br ${bgMap[tint] || bgMap.amber} shadow-sm`}>
      <div className="px-5 py-4">
        <div className="text-2xl font-semibold text-[var(--brown-700)] text-center leading-none">{value}</div>
        <div className="text-xs text-[var(--brown-700)]/70 text-center mt-1">{label}</div>
      </div>
    </div>
  );
}

function OrderRow({ o, onView, onToggleStatus, isStatusOpen, onPickStatus }) {
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-gradient-to-br from-[#fffdf5] to-[#fffaf0] px-5 py-4 shadow-sm">
      <div className="grid grid-cols-12 gap-4 items-start">
        <div className="col-span-1">
          <span className="inline-grid h-9 w-9 place-items-center rounded-lg bg-white border border-[var(--line-amber)]">{o.icon}</span>
        </div>

        <div className="col-span-4 min-w-0">
          <div className="font-semibold text-[var(--brown-700)] truncate">{o.item}</div>
          <div className="text-[11px] text-[var(--brown-700)]/70">{o.id}</div>
          <div className="mt-3 text-[11px] text-[var(--brown-700)]/60">Customer</div>
          <div className="text-[var(--brown-700)]">{o.customer}</div>
          <div className="mt-3 text-[11px] text-[var(--brown-700)]/60">Est. Delivery: {o.eta}</div>
        </div>

        <div className="col-span-4">
          <div className="mt-6 text-[11px] text-[var(--brown-700)]/60">Seller</div>
          <div className="text-[var(--brown-700)]">{o.seller}</div>
        </div>

        <div className="col-span-3 flex flex-col items-end gap-2 relative">
          <div>
            <div className="text-[11px] text-[var(--brown-700)]/60 text-right">Order Date</div>
            <div className="text-[var(--brown-700)] text-right">{o.orderDate}</div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <span className="text-[var(--orange-600)] font-semibold">{peso(o.amount)}</span>
            <StatusPill status={o.status} />
          </div>

          <div className="mt-3 flex items-center gap-2" data-status-menu>
            <div className="relative" data-status-menu>
              <button
                onClick={() => onToggleStatus(o.id)}
                className="h-9 px-3 rounded-lg bg-white border border-[var(--line-amber)] text-sm hover:bg-[var(--cream-50)] capitalize"
                data-status-menu
              >
                {o.status} ▾
              </button>

              {isStatusOpen && (
                <div className="absolute right-0 mt-1 w-48 rounded-xl border border-[var(--line-amber)] bg-white shadow-card overflow-hidden z-10" data-status-menu>
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onPickStatus(o.id, opt)}
                      className={[
                        "w-full text-left px-3 py-2 text-sm capitalize hover:bg-[var(--cream-50)] flex items-center justify-between",
                        opt === o.status ? "bg-[var(--amber-400)]/15" : "",
                      ].join(" ")}
                      data-status-menu
                    >
                      <span data-status-menu>{opt}</span>
                      {opt === o.status && <span data-status-menu>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onView(o)}
              className="h-9 px-3 rounded-lg bg-white border border-[var(--line-amber)] text-sm hover:bg-[var(--cream-50)]"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Toast */
function Toast({ show, message, onClose }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [show, onClose]);

  if (!show) return null;

  return (
    /* Fixed to top; uses same max width as AdminTopbar/AdminTabs: max-w-6xl px-4 */
    <div className="fixed inset-x-0 z-[70] top-[75px]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="float-right rounded-xl bg-white border border-[var(--line-amber)] shadow-card px-4 py-3 flex items-start gap-2 min-w-[280px]">
          <span className="mt-0.5 h-5 w-5 grid place-items-center rounded-full bg-[var(--amber-400)]/25 border border-[var(--line-amber)]">
            ✔
          </span>
          <div className="text-sm text-[var(--brown-700)]">{message}</div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState(SEED);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const [statusMenuFor, setStatusMenuFor] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });

  /* ---------- New: live counts for banners ---------- */
  const counts = useMemo(() => {
    const c = { total: orders.length, pending: 0, processing: 0, shipped: 0, delivered: 0 };
    for (const o of orders) {
      if (o.status in c) c[o.status] += 1;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const hay = `${o.item} ${o.id} ${o.customer} ${o.seller}`.toLowerCase();
      const matchesQ = hay.includes(q.trim().toLowerCase());
      const matchesStatus = status === "all" ? true : o.status === status;
      return matchesQ && matchesStatus;
    });
  }, [orders, q, status]);

  useEffect(() => {
    const onDown = (e) => {
      if (!statusMenuFor) return;
      if (e.target.closest && e.target.closest("[data-status-menu]")) return;
      setStatusMenuFor(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [statusMenuFor]);

  const handleView = (o) => { setCurrent(o); setDetailsOpen(true); };
  const toggleStatusMenu = (id) => { setStatusMenuFor((prev) => (prev === id ? null : id)); };
  const applyStatus = (id, newStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    setStatusMenuFor(null);
    setToast({ show: true, message: `Order ${id} status updated to ${newStatus}` });

    addNotification({
      title: "Order updated",
      body: `${id} → ${newStatus}`,
      link: "/admin?tab=orders",
      type: "success",
    });

  };

  return (
    <>
      {/* ---------- Banners / Summary tiles ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <StatTile value={counts.total} label="Total Orders" tint="amber" />
        <StatTile value={counts.pending} label="Pending" tint="amber" />
        <StatTile value={counts.processing} label="Processing" tint="blue" />
        <StatTile value={counts.shipped} label="Shipped" tint="purple" />
        <StatTile value={counts.delivered} label="Delivered" tint="green" />
      </div>

      <section className="rounded-xl border border-[var(--line-amber)] bg-white shadow-card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line-amber)]/60 rounded-t-xl">
          <div className="flex items-center gap-2 font-semibold text-[var(--brown-700)]">
            <span>Order Management</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => { setStatusMenuFor(null); setQ(e.target.value); }}
              placeholder="Search orders, customers, or sellers..."
              className="h-9 w-[280px] rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm placeholder:text-[var(--brown-700)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
            />
            <select
              value={status}
              onChange={(e) => { setStatusMenuFor(null); setStatus(e.target.value); }}
              className="h-9 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
            >
              <option value="all">All Status</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {filtered.length ? (
            filtered.map((o) => (
              <OrderRow
                key={o.id}
                o={o}
                onView={handleView}
                onToggleStatus={toggleStatusMenu}
                isStatusOpen={statusMenuFor === o.id}
                onPickStatus={applyStatus}
              />
            ))
          ) : (
            <div className="py-12 text-center text-[var(--brown-700)]/60">No orders found.</div>
          )}
        </div>
      </section>

      <OrderDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        order={current}
        peso={peso}
        pillClass={(s) => STATUS_STYLES[s] || "bg-gray-100 text-gray-600 border-gray-200"}
      />

      <Toast show={toast.show} message={toast.message} onClose={() => setToast({ show: false, message: "" })} />
    </>
  );
}
