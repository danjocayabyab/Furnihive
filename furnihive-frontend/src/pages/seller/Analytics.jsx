import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";

/**
 * NOTE: Everything reads from local state for now (mock data).
 * When you wire the backend, replace the mock with your fetcher
 * and keep the render code as-is.
 */

const peso = (n) =>
  `₱${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function SellerAnalytics() {
  const navigate = useNavigate();

  const { user } = useAuth();
  const sellerId = user?.id;

  // Snapshot metrics derived from real order_items data
  const [snapshot, setSnapshot] = useState({
    revenue: 0,
    revenueChangePct: 0,
    orders: 0,
    ordersChangePct: 0,
  });

  // Sales overview (for now we only compute Average Order Value)
  const [salesOverview, setSalesOverview] = useState({
    aov: 0,
  });

  // Top products by units sold and revenue for this seller
  const [topProducts, setTopProducts] = useState([]);

  // Payout summary: gross sales with payouts, net earnings and pending payouts
  const [payoutsSummary, setPayoutsSummary] = useState({
    grossTotal: 0,
    netTotal: 0,
    pendingNet: 0,
  });

  // Payout history rows for this seller
  const [payoutHistory, setPayoutHistory] = useState([]);

  // Date range filter: 7d | 30d | all
  const [range, setRange] = useState("30d");

  // Load analytics data from order_items for this seller
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;

    (async () => {
      try {
        // Compute from-date based on selected range
        let fromISO = null;
        if (range === "7d" || range === "30d") {
          const days = range === "7d" ? 7 : 30;
          const d = new Date();
          d.setDate(d.getDate() - days);
          fromISO = d.toISOString();
        }

        let query = supabase
          .from("order_items")
          .select("order_id, qty, unit_price, product_id, title, created_at")
          .eq("seller_id", sellerId);

        if (fromISO) {
          query = query.gte("created_at", fromISO);
        }

        const { data: items, error } = await query;

        if (cancelled || error || !items) {
          if (!cancelled) {
            setSnapshot({
              revenue: 0,
              revenueChangePct: 0,
              orders: 0,
              ordersChangePct: 0,
            });
            setSalesOverview({ aov: 0 });
            setTopProducts([]);
          }
          return;
        }

        const orderIds = new Set();
        let totalSales = 0;
        const byProduct = new Map();

        items.forEach((row) => {
          if (row?.order_id) orderIds.add(row.order_id);

          const qty = Number(row?.qty || 0) || 0;
          const price = Number(row?.unit_price || 0) || 0;
          totalSales += qty * price;

          if (!row?.product_id) return;
          const key = row.product_id;
          if (!byProduct.has(key)) {
            byProduct.set(key, {
              productId: key,
              title: row.title || "Product",
              units: 0,
              revenue: 0,
            });
          }
          const entry = byProduct.get(key);
          entry.units += qty;
          entry.revenue += qty * price;
        });

        const totalOrders = orderIds.size;
        const aov = totalOrders ? totalSales / totalOrders : 0;

        const topList = Array.from(byProduct.values())
          .filter((p) => p.units > 0)
          .sort((a, b) => b.units - a.units)
          .slice(0, 10)
          .map((p, idx) => ({
            rank: idx + 1,
            title: p.title,
            units: p.units,
            revenue: p.revenue,
          }));

        if (!cancelled) {
          setSnapshot({
            revenue: totalSales,
            revenueChangePct: 0,
            orders: totalOrders,
            ordersChangePct: 0,
          });
          setSalesOverview({ aov });
          setTopProducts(topList);
        }
      } catch {
        if (!cancelled) {
          setSnapshot({
            revenue: 0,
            revenueChangePct: 0,
            orders: 0,
            ordersChangePct: 0,
          });
          setSalesOverview({ aov: 0 });
          setTopProducts([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sellerId, range]);

  // Load payout summary (net earnings + pending payouts) from seller_payouts for this seller
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;

    (async () => {
      try {
        // Compute from-date based on selected range
        let fromISO = null;
        if (range === "7d" || range === "30d") {
          const days = range === "7d" ? 7 : 30;
          const d = new Date();
          d.setDate(d.getDate() - days);
          fromISO = d.toISOString();
        }

        let query = supabase
          .from("seller_payouts")
          .select("id, order_id, gross_amount, net_amount, status, created_at")
          .eq("seller_id", sellerId);

        if (fromISO) {
          query = query.gte("created_at", fromISO);
        }

        const { data: payoutRows, error } = await query;

        if (cancelled || error || !payoutRows) {
          if (!cancelled) {
            setPayoutsSummary({ grossTotal: 0, netTotal: 0, pendingNet: 0 });
            setPayoutHistory([]);
          }
          return;
        }

        let grossTotal = 0;
        let netTotal = 0; // seller earnings (83% of gross)
        let pendingNet = 0; // pending payout (83% of gross for pending rows)

        const history = payoutRows
          .slice()
          .sort((a, b) => {
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            return tb - ta;
          });

        history.forEach((row) => {
          const gross = Number(row?.gross_amount || 0) || 0;
          const payout = gross * 0.83; // 83% amount to pay to seller

          grossTotal += gross;
          netTotal += payout;

          const st = String(row?.status || "").toLowerCase();
          if (st === "pending") {
            pendingNet += payout;
          }
        });

        if (!cancelled) {
          setPayoutsSummary({ grossTotal, netTotal, pendingNet });
          setPayoutHistory(history);
        }
      } catch {
        if (!cancelled) {
          setPayoutsSummary({ grossTotal: 0, netTotal: 0, pendingNet: 0 });
          setPayoutHistory([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sellerId, range]);

  // Simple CSV export (you can swap this with a server report later)
  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Sales (with payouts)", payoutsSummary.grossTotal],
      ["Total Orders", snapshot.orders],
      ["Net Earnings (paid + pending)", payoutsSummary.netTotal],
      ["Pending Payouts", payoutsSummary.pendingNet],
      ["Average Order Value", salesOverview.aov],
      [],
      ["Top Products", "Units", "Revenue"],
      ...topProducts.map((p) => [p.title, p.units, p.revenue]),
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
            <div className="mt-2 flex flex-wrap gap-2">
              {["7d", "30d", "all"].map((key) => {
                const label =
                  key === "7d" ? "Last 7 days" : key === "30d" ? "Last 30 days" : "All time";
                const active = range === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRange(key)}
                    className={`text-xs px-3 py-1 rounded-full border transition ${
                      active
                        ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)]"
                        : "bg-white text-[var(--brown-700)] border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
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
          label="Total Sales"
          value={peso(payoutsSummary.grossTotal)}
          delta={snapshot.revenueChangePct}
          
          accent="text-emerald-600"
        />
        <KPI
          label="Net Earnings"
          value={peso(payoutsSummary.netTotal)}
          delta={0}
          
          accent="text-emerald-600"
        />
        <KPI
          label="Total Orders"
          value={snapshot.orders}
          delta={snapshot.ordersChangePct}
          
          accent="text-emerald-600"
        />
        <KPI
          label="Pending Payouts"
          value={peso(payoutsSummary.pendingNet)}
          delta={0}
          
          accent="text-emerald-600"
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

      {/* Payout summary + history */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">Payout Summary</h3>
          <p className="text-xs text-gray-600">
            Overview of what you have earned and what is still awaiting payout for the selected period.
          </p>
        </div>

        <div className="p-4 grid sm:grid-cols-2 gap-4 border-b border-[var(--line-amber)]/60">
          <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--amber-50)]/40 p-4 text-sm text-[var(--brown-700)]/90 space-y-1">
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Net Earnings
            </div>
            <div className="text-2xl font-bold">{peso(payoutsSummary.netTotal)}</div>
            <p className="text-xs text-gray-600">
              This is your earnings after the 5% Furnihive commission has been deducted from your sales.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4 text-sm text-[var(--brown-700)]/90 space-y-1">
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Pending Payouts
            </div>
            <div className="text-2xl font-bold">{peso(payoutsSummary.pendingNet)}</div>
            <p className="text-xs text-gray-600">
              Amount from completed orders that is still marked as pending in payouts and has not been paid out yet.
            </p>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Payout History
          </div>
          <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)]/40 max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--line-amber)] bg-[var(--cream-50)]/80 text-[var(--brown-700)]">
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Order</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center text-gray-600">
                      No payouts recorded for this period yet.
                    </td>
                  </tr>
                )}
                {payoutHistory.map((row) => {
                  const labelStatus = String(row.status || "").toLowerCase();
                  return (
                    <tr key={row.id} className="border-t border-[var(--line-amber)]/50">
                      <td className="px-3 py-2 text-gray-700">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                            })
                          : ""}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.order_id ? `ORD-${String(row.order_id).slice(0, 8).toUpperCase()}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full border border-[var(--line-amber)] px-2 py-0.5 text-[10px] capitalize bg-white">
                          {labelStatus || "pending"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-[var(--brown-700)]">
                        {peso(row.net_amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* --- Small UI helpers --- */

function KPI({ label, value, delta, icon, accent = "", iconColor = "" }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{label}</div>
        <span className={`text-xl ${iconColor}`}>{icon}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--brown-700)]">
        {value}
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
