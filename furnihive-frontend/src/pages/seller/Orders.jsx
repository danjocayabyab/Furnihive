// src/pages/seller/Orders.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ---------- demo data (replace with API later) ---------- */
const demoOrders = [
  {
    id: "ORD-2025-1244",
    status: "pending", // pending | processing | shipped | delivered
    dateISO: "2025-10-04T10:30:00",
    payment: "GCash",
    customer: {
      name: "Maria Santos",
      address: "123 Quezon Ave, Quezon City, Metro Manila",
    },
    items: [
      {
        title: "Modern Sectional Sofa",
        qty: 1,
        price: 45999,
        image:
          "https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?q=80&w=600&auto=format&fit=crop",
      },
    ],
    shipping: 500,
  },
  {
    id: "ORD-2025-1243",
    status: "processing",
    dateISO: "2025-10-03T14:15:00",
    payment: "Bank Transfer",
    customer: {
      name: "Juan dela Cruz",
      address: "456 Rizal St, Makati City, Metro Manila",
    },
    items: [
      {
        title: "Solid Wood Dining Set",
        qty: 1,
        price: 35500,
        image:
          "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=600&auto=format&fit=crop",
      },
    ],
    shipping: 500,
  },
  {
    id: "ORD-2025-1242",
    status: "shipped",
    dateISO: "2025-10-02T09:45:00",
    payment: "COD",
    customer: {
      name: "Anna Reyes",
      address: "789 Manila Rd, Pasig City, Metro Manila",
    },
    items: [
      {
        title: "Queen Size Bed Frame",
        qty: 1,
        price: 28900,
        image:
          "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=600&auto=format&fit=crop",
      },
    ],
    shipping: 0,
  },
  {
    id: "ORD-2025-1241",
    status: "delivered",
    dateISO: "2025-10-01T11:20:00",
    payment: "Credit Card",
    customer: {
      name: "Carlos Mendoza",
      address: "321 Bonifacio Dr, Taguig City, Metro Manila",
    },
    items: [
      {
        title: "Office Desk & Chair",
        qty: 1,
        price: 18500,
        image:
          "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=600&auto=format&fit=crop",
      },
    ],
    shipping: 0,
  },
];

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function SellerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState(demoOrders);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all | pending | processing | shipped | delivered
  const [view, setView] = useState(null); // order object for the modal

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
  const acceptOrder = (id) => {
    // pending -> processing
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "processing" } : o))
    );
  };

  const markShipped = (id) => {
    // processing -> shipped
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "shipped" } : o))
    );
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

      {/* search + filters (filters button UI only) */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-3 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
          
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search by order ID or customer name…"
          />
        </div>
        <button className="rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm hover:bg-[var(--cream-50)]">
          Filters
        </button>
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
                          {o.id}
                        </div>
                        <StatusPill status={o.status} />
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(o.dateISO).toLocaleString()}
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
            <div className="font-semibold text-[var(--brown-700)]">{order.id}</div>
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
              <div className="mt-1">{new Date(order.dateISO).toLocaleString()}</div>
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
