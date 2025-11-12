import Stars from "./Stars.jsx";

export default function ReviewSummary({ average = 4.8, total = 127, dist = {5:78,4:32,3:12,2:4,1:1} }) {
  const max = Math.max(...Object.values(dist));
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-white p-4">
      <div className="text-3xl font-extrabold text-[var(--brown-700)]">{average.toFixed(1)}</div>
      <Stars value={average} size="md" />
      <div className="text-sm text-gray-600 mt-1">{total} reviews</div>

      <div className="mt-4 space-y-2">
        {[5,4,3,2,1].map(star => {
          const val = dist[star] ?? 0;
          const pct = max ? (val / max) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="w-4">{star}★</span>
              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--amber-500)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right text-gray-600">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
