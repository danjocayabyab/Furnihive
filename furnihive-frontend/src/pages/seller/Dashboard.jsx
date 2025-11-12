// src/pages/seller/Dashboard.jsx
import { useNavigate } from "react-router-dom";

export default function SellerDashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--brown-700)]">
          Welcome back, Manila Furniture Co.! 👋
        </h1>
        <p className="text-sm text-gray-600">
          Here’s what’s happening with your store today.
        </p>
      </div>

      {/* Top Summary Cards (no hover) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Sales"
          value="₱248,500"
          change="+12.5%"
          icon="💰"
          color="text-green-600"
        />
        <SummaryCard
          title="Active Orders"
          value="23"
          change="+3"
          icon="🧾"
          color="text-green-600"
        />
        <SummaryCard
          title="Products Listed"
          value="87"
          change="+5"
          icon="📦"
          color="text-green-600"
        />
        <SummaryCard
          title="Low Stock Items"
          value="12"
          change="-2"
          icon="⚠️"
          color="text-red-600"
        />
      </div>

      {/* Navigation Cards (with hover) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <NavButton
          label="Products"
          icon="📦"
          onClick={() => navigate("/seller/products")}
        />
        {/* ✅ Added navigation for Inventory */}
        <NavButton
          label="Inventory"
          icon="📋"
          onClick={() => navigate("/seller/inventory")}
        />
        <NavButton 
          label="Orders" 
          icon="🧾" 
          onClick={() => navigate("/seller/orders")} 
        />

        <NavButton 
          label="Promotions" 
          icon="🎯" 
          onClick={() => navigate("/seller/promotions")} 
        />

        <NavButton
          label="Analytics"
          icon="📊"
          onClick={() => navigate("/seller/analytics")} 
        />

        <NavButton
          label="Engagement"
          icon="💬"
          onClick={() => navigate("/seller/engagement")}
        />
      </div>

      {/* Dashboard Content */}
      <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Top Products */}
          <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
            <div className="px-5 py-4 border-b border-[var(--line-amber)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--brown-700)]">
                  Top Products
                </h3>
                <p className="text-xs text-gray-600">
                  Your best selling items this month
                </p>
              </div>
              {/* ✅ Navigates to Analytics */}
              <button
                onClick={() => navigate("/seller/analytics")}
                className="text-xs text-[var(--orange-600)] hover:underline"
              >
                View Full Analytics
              </button>
            </div>

            <ul className="divide-y divide-[var(--line-amber)]/70">
              {[
                {
                  title: "Modern Sectional Sofa",
                  price: "₱45,999",
                  sold: "54 units sold",
                },
                {
                  title: "Solid Wood Dining Set",
                  price: "₱35,500",
                  sold: "32 units sold",
                },
                {
                  title: "Queen Size Bed Frame",
                  price: "₱28,500",
                  sold: "28 units sold",
                },
              ].map((p, i) => (
                <li
                  key={i}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-[var(--brown-700)] text-sm">
                      {p.title}
                    </div>
                    <div className="text-xs text-gray-600">{p.sold}</div>
                  </div>
                  <div className="text-sm font-semibold text-[var(--brown-700)]">
                    {p.price}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Recent Orders */}
          <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
            <div className="px-5 py-4 border-b border-[var(--line-amber)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--brown-700)]">
                  Recent Orders
                </h3>
                <p className="text-xs text-gray-600">
                  Your latest customer orders
                </p>
              </div>
              {/* ✅ Navigates to Orders */}
              <button
                onClick={() => navigate("/seller/orders")}
                className="text-xs text-[var(--orange-600)] hover:underline"
              >
                View All
              </button>
            </div>

            <ul className="divide-y divide-[var(--line-amber)]/70">
              {[
                {
                  id: "ORD-2025-1244",
                  product: "Modern Sectional Sofa",
                  total: "₱45,999",
                  status: "pending",
                  customer: "Maria Santos",
                },
                {
                  id: "ORD-2025-1243",
                  product: "Solid Wood Dining Set",
                  total: "₱35,500",
                  status: "processing",
                  customer: "Juan dela Cruz",
                },
                {
                  id: "ORD-2025-1242",
                  product: "Queen Size Bed Frame",
                  total: "₱28,500",
                  status: "shipped",
                  customer: "Anna Reyes",
                },
                {
                  id: "ORD-2025-1241",
                  product: "Office Desk & Chair",
                  total: "₱18,500",
                  status: "delivered",
                  customer: "Carlos Mendoza",
                },
              ].map((o) => (
                <li key={o.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--brown-700)] truncate">
                        {o.id}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {o.product} — Customer: {o.customer}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{o.total}</div>
                      <StatusPill status={o.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right Side: Low Stock Alert */}
        <aside className="rounded-2xl border border-[var(--line-amber)] bg-white h-fit">
          <div className="px-5 py-4 border-b border-[var(--line-amber)]">
            <h3 className="font-semibold text-[var(--brown-700)]">
              Low Stock Alert
            </h3>
            <p className="text-xs text-gray-600">
              Products running out of stock
            </p>
          </div>
          <div className="p-4 space-y-3">
            {[
              { name: "Velvet Armchair", stock: 2 },
              { name: "Coffee Table Set", stock: 1 },
              { name: "Bookshelf Unit", stock: 1 },
            ].map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
              >
                <div>{p.name}</div>
                <span className="text-xs">Only {p.stock} left</span>
              </div>
            ))}
            {/* ✅ Navigates to Inventory */}
            <button
              onClick={() => navigate("/seller/inventory")}
              className="w-full mt-3 rounded-lg border border-red-300 text-red-700 text-sm py-2 hover:bg-red-100 transition"
            >
              Manage Inventory
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Reusable Components ---------- */
function SummaryCard({ title, value, change, icon, color }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4 flex justify-between items-center">
      <div>
        <div className="text-sm text-gray-600">{title}</div>
        <div className="text-2xl font-bold text-[var(--brown-700)]">{value}</div>
        <div className={`text-xs ${color}`}>{change}</div>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  );
}

/* Navigation Cards (with hover + white fill) */
function NavButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-xl border border-[var(--line-amber)] bg-white py-3 px-2 text-sm font-medium text-[var(--brown-700)] hover:bg-[var(--amber-50)] transition cursor-pointer shadow-sm"
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* Status pill colors (unchanged) */
function StatusPill({ status }) {
  const colors = {
    pending: "text-orange-700 border-orange-300 bg-orange-100",
    processing: "text-yellow-700 border-yellow-300 bg-yellow-100",
    shipped: "text-blue-700 border-blue-300 bg-blue-100",
    delivered: "text-green-700 border-green-300 bg-green-100",
  };

  return (
    <span
      className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs border ${colors[status]}`}
    >
      {status}
    </span>
  );
}
