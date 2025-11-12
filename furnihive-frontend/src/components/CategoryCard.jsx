import { Link } from "react-router-dom";

export default function CategoryCard({ item }) {
  const to = `/shop?category=${encodeURIComponent(item.label)}`;

  return (
    <Link to={to} className="block rounded-xl overflow-hidden border border-[var(--line-amber)] bg-white hover:shadow-card transition">
      <div className="relative">
        <img src={item.image} alt={item.label} className="h-28 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-2 text-white text-sm font-semibold drop-shadow">
          {item.label}
        </div>
      </div>
      <div className="px-3 py-2 text-xs text-gray-600">{item.meta}</div>
    </Link>
  );
}
