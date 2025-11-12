const tabs = [
  { key: "applications", label: "Applications", icon: "" },
  { key: "analytics", label: "Analytics & Reports", icon: "" },
  { key: "orders", label: "Orders", icon: "" },
  { key: "users", label: "Users", icon: "" },
  { key: "support", label: "Support", icon: "" },
];

export default function AdminTabs({ active, onChange }) {
  return (
    <nav className="flex gap-3 py-3">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={[
            "flex items-center gap-2 px-3 h-9 rounded-lg border text-sm font-medium",
            active === t.key
              ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)] shadow-card"
              : "bg-white border-[var(--line-amber)] text-[var(--brown-700)] hover:bg-[var(--cream-50)]",
          ].join(" ")}
        >
          <span aria-hidden>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
