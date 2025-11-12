export default function SectionCard({ title, actions, children }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
