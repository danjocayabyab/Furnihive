import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * NOTE: Everything reads from local state for now (mock data).
 * When you wire the backend, replace the mock with your fetcher
 * and keep the render code as-is.
 */

const peso = (n) =>
  `₱${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function SellerAnalytics() {
  const navigate = useNavigate();

  // ---- Mock snapshot (swap with API later)
  const [snapshot] = useState({
    revenue: 248500,
    revenueChangePct: +12.5,
    orders: 89,
    ordersChangePct: +8.2,
    visitors: 1400, // 1.4k in UI
    visitorsChangePct: +15.3,
    conversionRatePct: 2.8,
    conversionChangePct: -0.3,
  });

  const [topProducts] = useState([
    { rank: 1, title: "Modern Sectional Sofa", units: 18, revenue: 828000 },
    { rank: 2, title: "Solid Wood Dining Set", units: 12, revenue: 426000 },
    { rank: 3, title: "Queen Size Bed Frame", units: 9, revenue: 260100 },
  ]);

  const [salesOverview] = useState({
    aov: 34500,
    aovChangePct: +15,
    retentionPct: 68,
    retentionChangePct: +5,
    returnRatePct: 2.1,
    returnRateChangePct: +0.3,
  });

  const prettyVisitors = useMemo(() => {
    const n = snapshot.visitors;
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  }, [snapshot.visitors]);

  // Simple CSV export (you can swap this with a server report later)
  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Revenue", snapshot.revenue],
      ["Total Orders", snapshot.orders],
      ["Store Visitors", snapshot.visitors],
      ["Conversion Rate (%)", snapshot.conversionRatePct],
      [],
      ["Top Products", "Units", "Revenue"],
      ...topProducts.map((p) => [p.title, p.units, p.revenue]),
      [],
      ["Average Order Value", salesOverview.aov],
      ["Customer Retention (%)", salesOverview.retentionPct],
      ["Return Rate (%)", salesOverview.returnRatePct],
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              Analytics & Reports
            </h1>
            <p className="text-xs text-gray-600">
              Track your business performance
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--orange-600)] text-white px-4 py-2 font-semibold hover:brightness-95"
        >
          ⤓ Export
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Total Revenue"
          value={peso(snapshot.revenue)}
          delta={snapshot.revenueChangePct}
          
          accent="text-emerald-600"
        />
        <KPI
          label="Total Orders"
          value={snapshot.orders}
          delta={snapshot.ordersChangePct}
          
          accent="text-emerald-600"
        />
        <KPI
          label="Store Visitors"
          value={prettyVisitors}
          delta={snapshot.visitorsChangePct}
          
          accent="text-emerald-600"
          iconColor="text-blue-600"
        />
        <KPI
          label="Conversion Rate"
          value={`${snapshot.conversionRatePct}%`}
          delta={snapshot.conversionChangePct}
          
          accent={snapshot.conversionChangePct >= 0 ? "text-emerald-600" : "text-red-600"}
          iconColor="text-fuchsia-600"
        />
      </div>

      {/* Top performing products */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">
            Top Performing Products
          </h3>
          <p className="text-xs text-gray-600">
            Your best-selling products this month
          </p>
        </div>

        <ul className="divide-y divide-[var(--line-amber)]/70">
          {topProducts.map((p) => (
            <li key={p.rank} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 grid place-items-center rounded-full bg-[var(--amber-50)] border border-[var(--line-amber)] text-[var(--orange-700)] text-sm">
                  #{p.rank}
                </span>
                <div>
                  <div className="font-medium text-[var(--brown-700)] text-sm">
                    {p.title}
                  </div>
                  <div className="text-xs text-gray-600">{p.units} units sold</div>
                </div>
              </div>
              <div className="text-sm font-semibold">{peso(p.revenue)}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* Sales overview */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">Sales Overview</h3>
          <p className="text-xs text-gray-600">
            Performance summary for the last 30 days
          </p>
        </div>

        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <OverviewCard
            label="Average Order Value"
            value={peso(salesOverview.aov)}
            change={`${salesOverview.aovChangePct}% from last month`}
            changePositive
          />
          <OverviewCard
            label="Customer Retention"
            value={`${salesOverview.retentionPct}%`}
            change={`${salesOverview.retentionChangePct}% from last month`}
            changePositive
          />
          <OverviewCard
            label="Return Rate"
            value={`${salesOverview.returnRatePct}%`}
            change={`${salesOverview.returnRateChangePct}% from last month`}
            changePositive={false}
          />
        </div>
      </section>
    </div>
  );
}

/* --- Small UI helpers --- */

function KPI({ label, value, delta, icon, accent = "", iconColor = "" }) {
  const up = delta >= 0;
  const deltaText = `${up ? "+" : ""}${delta}%`;
  const deltaColor = up ? "text-emerald-600" : "text-red-600";

  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{label}</div>
        <span className={`text-xl ${iconColor}`}>{icon}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--brown-700)]">
        {value}
      </div>
      <div className={`mt-1 text-xs flex items-center gap-1 ${deltaColor}`}>
        <span>{up ? "↗︎" : "↘︎"}</span>
        <span className={`${accent}`}>{deltaText}</span>
      </div>
    </div>
  );
}

function OverviewCard({ label, value, change, changePositive = true }) {
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--amber-50)]/40 p-4">
      <div className="text-sm text-gray-700">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[var(--brown-700)]">{value}</div>
      <div
        className={`text-xs ${
          changePositive ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {change.startsWith("+") ? change : `+${change}`}
      </div>
    </div>
  );
}
