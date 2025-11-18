// src/admin/RevenuePage.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const peso = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(n || 0);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function SummaryCard({ label, value, subtitle, icon, accent }) {
  return (
    <div className="rounded-2xl bg-white border border-[var(--line-amber)] shadow-card p-5 flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <div
            className={`h-8 w-8 rounded-full grid place-items-center text-white text-lg ${
              accent || "bg-[var(--orange-600)]"
            }`}
          >
            {icon}
          </div>
        )}
        <div className="text-xs font-medium text-[var(--brown-700)]/70">{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-[var(--brown-700)]">{value}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-[var(--brown-700)]/60">{subtitle}</div>
      )}
    </div>
  );
}

export default function RevenuePage() {
  const today = new Date();
  const currentMonthIndex = today.getMonth();

  const [month, setMonth] = useState(String(currentMonthIndex));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]); // raw seller_payouts
  const [profiles, setProfiles] = useState({}); // seller_id -> name
  const [payingSeller, setPayingSeller] = useState(null);

  const computeRange = () => {
    let monthStart = null;
    let monthEnd = null;
    if (month !== "all") {
      const idx = Number(month);
      if (!Number.isNaN(idx)) {
        const year = today.getFullYear();
        monthStart = new Date(year, idx, 1);
        monthEnd = new Date(year, idx + 1, 0, 23, 59, 59, 999);
      }
    }

    let customStart = dateFrom ? new Date(dateFrom) : null;
    let customEnd = dateTo ? new Date(dateTo) : null;
    if (customEnd) {
      customEnd.setHours(23, 59, 59, 999);
    }

    let start = monthStart || customStart;
    let end = monthEnd || customEnd;

    if (monthStart && customStart) {
      start = new Date(Math.max(monthStart.getTime(), customStart.getTime()));
    }
    if (monthEnd && customEnd) {
      end = new Date(Math.min(monthEnd.getTime(), customEnd.getTime()));
    }

    return { start, end };
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const { start, end } = computeRange();

      let q = supabase
        .from("seller_payouts")
        .select("seller_id, gross_amount, platform_fee, net_amount, status, created_at");

      if (start) {
        q = q.gte("created_at", start.toISOString());
      }
      if (end) {
        q = q.lte("created_at", end.toISOString());
      }

      const { data, error: err } = await q;
      if (err) throw err;

      const payouts = data || [];
      setRows(payouts);

      const sellerIds = Array.from(
        new Set(payouts.map((p) => p.seller_id).filter(Boolean))
      );

      if (sellerIds.length) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("id, role, first_name, last_name, store_name")
          .in("id", sellerIds);
        if (profErr) {
          console.warn("Failed to load revenue seller profiles", profErr);
        }
        const map = {};
        (profs || []).forEach((p) => {
          const role = String(p.role || "").toLowerCase();
          const store = p.store_name && role === "seller" ? p.store_name : "";
          const full = [p.first_name, p.last_name].filter(Boolean).join(" ");
          map[p.id] = store || full || "Seller";
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (e) {
      setError(e?.message || "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const { overallSales, overallCommission, sellerOverview, pendingBySeller } =
    useMemo(() => {
      if (!rows.length) {
        return {
          overallSales: 0,
          overallCommission: 0,
          sellerOverview: [],
          pendingBySeller: [],
        };
      }

      let totalSales = 0;
      let totalCommission = 0;
      const bySeller = new Map();
      const pendingMap = new Map();

      rows.forEach((p) => {
        const gross = Number(p.gross_amount || 0);
        const fee = Number(p.platform_fee || 0);
        const net = Number(p.net_amount || 0);
        totalSales += gross;
        totalCommission += fee;

        const sid = p.seller_id || "unknown";
        if (!bySeller.has(sid)) {
          bySeller.set(sid, { sellerId: sid, sales: 0, net: 0, fee: 0 });
        }
        const agg = bySeller.get(sid);
        agg.sales += gross;
        agg.net += net;
        agg.fee += fee;

        if (String(p.status || "").toLowerCase() === "pending") {
          if (!pendingMap.has(sid)) {
            pendingMap.set(sid, { sellerId: sid, sales: 0, net: 0, fee: 0 });
          }
          const pen = pendingMap.get(sid);
          pen.sales += gross;
          pen.net += net;
          pen.fee += fee;
        }
      });

      const sellerOverviewArr = Array.from(bySeller.values()).sort(
        (a, b) => b.sales - a.sales
      );
      const pendingArr = Array.from(pendingMap.values()).sort(
        (a, b) => b.net - a.net
      );

      return {
        overallSales: totalSales,
        overallCommission: totalCommission,
        sellerOverview: sellerOverviewArr,
        pendingBySeller: pendingArr,
      };
    }, [rows]);

  const handlePaySeller = async (sellerId) => {
    if (!sellerId) return;
    setPayingSeller(sellerId);
    try {
      const { start, end } = computeRange();
      let q = supabase
        .from("seller_payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("seller_id", sellerId)
        .eq("status", "pending");

      if (start) {
        q = q.gte("created_at", start.toISOString());
      }
      if (end) {
        q = q.lte("created_at", end.toISOString());
      }

      const { error } = await q;
      if (error) throw error;

      await loadData();
    } catch (e) {
      alert(e?.message || "Failed to pay seller");
    } finally {
      setPayingSeller(null);
    }
  };

  const monthLabel =
    month === "all" ? "All Months" : MONTHS[Number(month)] || "Month";

  return (
    <div className="space-y-5">
      {/* Overall revenue banner (platform revenue) */}
      <section className="rounded-2xl bg-[var(--orange-600)] text-white p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-card">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-80 mb-1">
            Overall Revenue (Furnihive)
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold">
            {peso(overallCommission)}
          </div>
          <div className="text-xs mt-1 opacity-80">
            Total commission earned from seller sales (5% platform share). Total sales processed: {peso(overallSales)}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-2xl bg-white border border-[var(--line-amber)] shadow-card p-5 space-y-4">
        <div className="text-sm font-semibold text-[var(--brown-700)] mb-1">
          Filter by Period
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-[var(--brown-700)]/70">Select Month</div>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
            >
              <option value="all">All months</option>
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-[var(--brown-700)]/70">Select Date Range</div>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
              />
              <button
                type="button"
                onClick={loadData}
                className="h-10 px-4 rounded-lg bg-[var(--orange-600)] text-white text-sm hover:brightness-95"
              >
                Apply
              </button>
            </div>
            <div className="text-[11px] text-[var(--brown-700)]/60">
              Filters use the intersection of the selected month and date range.
            </div>
          </div>
        </div>
        {loading && (
          <div className="text-xs text-[var(--brown-700)]/70">Loading data…</div>
        )}
        {error && <div className="text-xs text-red-600">{error}</div>}
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard
          label={`Total Sales (${monthLabel})`}
          value={peso(overallSales)}
          subtitle="Based on selected filters"
          icon="▲"
          accent="bg-emerald-500"
        />
        <SummaryCard
          label={`Total Revenue (${monthLabel})`}
          value={peso(overallCommission)}
          subtitle="5% commission from sales"
          icon="₱"
          accent="bg-indigo-500"
        />
      </section>

      {/* Seller sales overview */}
      <section className="rounded-2xl bg-white border border-[var(--line-amber)] shadow-card">
        <div className="px-5 py-3 border-b border-[var(--line-amber)]/70 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--brown-700)]">
              Seller Sales Overview
            </div>
            <div className="text-xs text-[var(--brown-700)]/70">
              Track individual seller performance
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[var(--cream-50)] border-b border-[var(--line-amber)]/60 text-xs text-[var(--brown-700)]/70">
                <th className="text-left px-5 py-3 font-medium">Seller Name</th>
                <th className="text-right px-5 py-3 font-medium">Total Sales</th>
                <th className="text-right px-5 py-3 font-medium">Seller Payout (95%)</th>
                <th className="text-right px-5 py-3 font-medium">Platform Commission (5%)</th>
              </tr>
            </thead>
            <tbody>
              {sellerOverview.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-xs text-[var(--brown-700)]/60"
                  >
                    No sales found for the selected period.
                  </td>
                </tr>
              )}

              {sellerOverview.map((row) => (
                <tr
                  key={row.sellerId}
                  className="border-b border-[var(--line-amber)]/40 last:border-b-0"
                >
                  <td className="px-5 py-3 whitespace-nowrap text-[var(--brown-700)]">
                    {profiles[row.sellerId] || row.sellerId}
                  </td>
                  <td className="px-5 py-3 text-right text-[var(--brown-700)]">
                    {peso(row.sales)}
                  </td>
                  <td className="px-5 py-3 text-right text-emerald-600 font-medium">
                    {peso(row.net)}
                  </td>
                  <td className="px-5 py-3 text-right text-indigo-600">
                    {peso(row.fee)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending payouts by seller */}
      <section className="rounded-2xl bg-white border border-[var(--line-amber)] shadow-card">
        <div className="px-5 py-3 border-b border-[var(--line-amber)]/70 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--brown-700)]">
              Pending Seller Payouts
            </div>
            <div className="text-xs text-[var(--brown-700)]/70">
              Process payments to sellers based on 95% payout / 5% commission
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[var(--cream-50)] border-b border-[var(--line-amber)]/60 text-xs text-[var(--brown-700)]/70">
                <th className="text-left px-5 py-3 font-medium">Seller Name</th>
                <th className="text-right px-5 py-3 font-medium">Total Sales</th>
                <th className="text-right px-5 py-3 font-medium">Amount to Pay (95%)</th>
                <th className="text-right px-5 py-3 font-medium">Revenue Earned (5%)</th>
                <th className="text-right px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingBySeller.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-xs text-[var(--brown-700)]/60"
                  >
                    No pending payouts for the selected period.
                  </td>
                </tr>
              )}

              {pendingBySeller.map((row) => (
                <tr
                  key={row.sellerId}
                  className="border-b border-[var(--line-amber)]/40 last:border-b-0"
                >
                  <td className="px-5 py-3 whitespace-nowrap text-[var(--brown-700)]">
                    {profiles[row.sellerId] || row.sellerId}
                  </td>
                  <td className="px-5 py-3 text-right text-[var(--brown-700)]">
                    {peso(row.sales)}
                  </td>
                  <td className="px-5 py-3 text-right text-emerald-600 font-medium">
                    {peso(row.net)}
                  </td>
                  <td className="px-5 py-3 text-right text-indigo-600">
                    {peso(row.fee)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handlePaySeller(row.sellerId)}
                      disabled={payingSeller === row.sellerId}
                      className="inline-flex items-center justify-center h-8 px-4 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:brightness-95 disabled:opacity-60"
                    >
                      {payingSeller === row.sellerId ? "Processing..." : "PAY"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
