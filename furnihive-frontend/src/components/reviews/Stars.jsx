export default function Stars({ value = 0, size = "sm" }) {
  const sizes = { sm: "text-base", md: "text-lg" };
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <span className={`inline-flex items-center gap-0.5 ${sizes[size]}`}>
      {[...Array(5)].map((_, i) => {
        const filled = i < full || (i === full && hasHalf);
        return (
          <span
            key={i}
            className={filled ? "text-[var(--amber-500)]" : "text-gray-300"}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}
