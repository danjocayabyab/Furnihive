// src/admin/AnalyticsReports.jsx
export default function AnalyticsReports() {
  // mock data — wire up later to real API
  const kpis = [
    { label: "Total Revenue", value: "$657,000", delta: "+12.5% from last period", good: true },
    { label: "Total Orders", value: "3,545", delta: "+8.3% from last period", good: true },
    { label: "Active Users", value: "3,562", delta: "+15.2% from last period", good: true },
    { label: "Avg. Order Value", value: "$185", delta: "-2.1% from last period", good: false },
  ];

  const metrics = [
    { label: "New User Registrations", value: 47, target: 100, delta: "+12%" },
    { label: "Orders Completed", value: 89, target: 100, delta: "+8%" },
    { label: "Seller Engagement", value: 72, target: 100, delta: "+5%" },
  ];

  const sellers = [
    { rank: 1, name: "Modern Living Co.", sales: 245, revenue: "$89,000", score: 4.9 },
    { rank: 2, name: "Comfort Furniture", sales: 198, revenue: "$72,000", score: 4.8 },
    { rank: 3, name: "Elite Interiors", sales: 176, revenue: "$64,000", score: 4.7 },
    { rank: 4, name: "Home Haven", sales: 154, revenue: "$56,000", score: 4.6 },
    { rank: 5, name: "Urban Style", sales: 132, revenue: "$48,000", score: 4.5 },
  ];

  return (
    <div className="space-y-5">
      {/* Header (no filters/export) */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--brown-700)]">Analytics & Reports</h2>
        <p className="text-sm text-[var(--brown-700)]/70">
          Core insights for your platform performance.
        </p>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-4"
          >
            <div className="text-sm text-[var(--brown-700)]/80">{k.label}</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--brown-700)]">{k.value}</div>
            <div
              className={[
                "mt-1 text-xs",
                k.good ? "text-green-700" : "text-red-600",
              ].join(" ")}
            >
              {k.good ? "↗︎ " : "↘︎ "}
              {k.delta}
            </div>
          </div>
        ))}
      </section>

      {/* Platform Metrics (progress bars) */}
      <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-4">
        <div className="font-semibold text-[var(--brown-700)] mb-3">Platform Metrics</div>
        <div className="space-y-4">
          {metrics.map((m) => {
            const pct = Math.max(0, Math.min(100, Math.round((m.value / m.target) * 100)));
            return (
              <div key={m.label}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--orange-600)] inline-block" />
                    <span className="text-[var(--brown-700)]">{m.label}</span>
                  </div>
                  <div className="text-[var(--brown-700)]/60">{m.delta}</div>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-[var(--amber-400)]/20 border border-[var(--line-amber)]">
                  <div
                    className="h-full rounded-full bg-[var(--orange-600)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-xs text-[var(--brown-700)]/60">
                  {pct}% of target
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Revenue & Orders Trend (simple SVG area; no libs) */}
      <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-4">
        <div className="font-semibold text-[var(--brown-700)] mb-3">Revenue & Orders Trend</div>
        <div className="w-full overflow-hidden rounded-lg border border-[var(--line-amber)]/60">
          <svg viewBox="0 0 800 240" className="w-full h-[260px]">
            {/* grid lines */}
            <g stroke="#f1c680" strokeOpacity="0.35">
              {[0,40,80,120,160,200,240].map((y)=>(
                <line key={y} x1="0" y1={y} x2="800" y2={y} />
              ))}
            </g>
            {/* orders (thin line) */}
            <polyline
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              points="0,190 80,180 160,184 240,170 320,178 400,172 480,158 560,150 640,142 720,136 800,130"
            />
            {/* revenue (area) */}
            <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e66100" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#e66100" stopOpacity="0.05" />
            </linearGradient>
            <path
              d="M0,170
                 L80,160 L160,164 L240,150 L320,158 L400,152 L480,138 L560,130 L640,122 L720,116 L800,110
                 L800,240 L0,240 Z"
              fill="url(#revGrad)"
              stroke="#e66100"
              strokeWidth="3"
              opacity="0.9"
            />
          </svg>
        </div>
        <div className="mt-2 text-xs text-[var(--brown-700)]/60 flex items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-4 bg-[#e66100]" /> Revenue ($)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-4 bg-[#fbbf24]" /> Orders
          </span>
        </div>
      </section>

      {/* Top Performing Sellers */}
      <section className="bg-white border border-[var(--line-amber)] rounded-xl shadow-card p-4">
        <div className="font-semibold text-[var(--brown-700)] mb-3">Top Performing Sellers</div>
        <div className="space-y-3">
          {sellers.map((s) => (
            <div
              key={s.rank}
              className="flex items-center justify-between rounded-xl border border-[var(--line-amber)] bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 grid place-items-center rounded-full bg-[var(--amber-400)]/30 border border-[var(--line-amber)] text-sm font-semibold">
                  #{s.rank}
                </span>
                <div>
                  <div className="font-medium text-[var(--brown-700)]">{s.name}</div>
                  <div className="text-xs text-[var(--brown-700)]/70">{s.sales} sales</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[var(--brown-700)]">{s.revenue}</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--amber-400)]/20 border border-[var(--line-amber)] text-xs">
                  ⭐ {s.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
