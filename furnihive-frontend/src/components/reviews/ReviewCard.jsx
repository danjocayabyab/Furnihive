import Stars from "./Stars.jsx";

export default function ReviewCard({ r }) {
  const initials = r.name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-[var(--cream-50)] border border-[var(--line-amber)] grid place-items-center text-[var(--brown-700)] text-sm font-semibold">
          {initials}
        </div>

        {/* Header */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--brown-700)]">{r.name}</span>
            {r.verified && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                Verified Purchase
              </span>
            )}
            <span className="ml-auto text-xs text-gray-500">{r.date}</span>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <Stars value={r.rating} />
            <span className="text-xs text-gray-600">{r.variation || ""}</span>
          </div>

          <p className="mt-2 text-sm text-gray-800 leading-relaxed">
            {r.text}
          </p>

          <div className="mt-3 flex items-center gap-3 text-xs">
            <button
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
              onClick={r.onHelpful}
            >
              👍 Helpful <span className="text-gray-600">({r.helpful})</span>
            </button>
            <button className="text-[var(--orange-600)] hover:underline">Reply</button>
          </div>
        </div>
      </div>
    </div>
  );
}
