export default function MetricCard({ icon, label, value, trend = "+0%", trendUp = true }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 grid place-items-center rounded-lg bg-[var(--cream-50)] border border-[var(--line-amber)]">{icon}</div>
        <div className={`text-xs px-2 py-0.5 rounded-full border ${
          trendUp ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700 bg-red-50"
        }`}>
          {trend}
        </div>
      </div>
      <div className="mt-3 text-2xl font-extrabold text-[var(--brown-700)]">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
