export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full grid place-items-center bg-hive">
      <div
        className="w-full max-w-xl bg-white border rounded-2xl shadow-card p-8 md:p-10"
        style={{ borderColor: "var(--line-amber)", borderWidth: "1px" }}
      >
        {children}
      </div>
    </div>
  );
}
