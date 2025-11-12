export default function StatusPill({ status }) {
  const styles = {
    pending:   "bg-amber-100 text-amber-700 border border-amber-200",
    processing:"bg-sky-100 text-sky-700 border border-sky-200",
    shipped:   "bg-indigo-100 text-indigo-700 border border-indigo-200",
    delivered: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    canceled:  "bg-red-100 text-red-700 border border-red-200",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
