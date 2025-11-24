import { useEffect, useMemo, useState } from "react";
import UserProfileModal from "./UserProfileModal";
import { listUsers, toggleUserSuspension } from "./api/adminApi";

/* helpers */
const peso = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

function Toast({ show, message, onClose }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [show, onClose]);

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 z-[70] top-[75px]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="float-right rounded-xl bg-white border border-[var(--line-amber)] shadow-card px-4 py-3 flex items-start gap-2 min-w-[280px]">
          <span className="mt-0.5 h-5 w-5 grid place-items-center rounded-full bg-[var(--amber-400)]/25 border border-[var(--line-amber)]">
            ✔
          </span>
          <div className="text-sm text-[var(--brown-700)]">{message}</div>
        </div>
      </div>
    </div>
  );
}

/* seed removed; loading from Supabase */

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

  const [toast, setToast] = useState({ show: false, message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const list = await listUsers();
        if (alive) setUsers(list);
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load users");
      } finally {
        if (alive) setLoading(false);
      }
    };

    // Initial load
    load();

    // Auto-refresh every 30 seconds while admin is on this page
    const id = setInterval(() => {
      load();
    }, 30000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // profile modal
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const metrics = useMemo(() => ({
    total: users.length,
    customers: users.filter((u) => u.role === "customer").length,
    sellers: users.filter((u) => u.role === "seller").length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
  }), [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const text = `${u.name} ${u.email} ${u.role}`.toLowerCase();
      const qMatch = text.includes(query.toLowerCase());
      const rMatch = role === "all" ? true : u.role === role;
      const sMatch = status === "all" ? true : u.status === status;
      return qMatch && rMatch && sMatch;
    });
  }, [users, query, role, status]);

  const onView = (u) => { setCurrent(u); setOpen(true); };

  const toggleSuspend = async (id) => {
    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u
      )
    );

    const target = users.find((u) => u.id === id);
    const nextSuspend = target?.status !== "suspended"; // true when going to suspended

    try {
      const res = await toggleUserSuspension(id, nextSuspend);
      // Ensure local state matches server result
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: res.status } : u))
      );
      setToast({ show: true, message: `User ${id} is now ${res.status}` });
    } catch (e) {
      // Revert on error
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u
        )
      );
      setToast({ show: true, message: `Failed to update status for ${id}` });
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard value={metrics.total} label="Total Users" color="bg-[var(--amber-100)]" />
          <MetricCard value={metrics.customers} label="Customers" color="bg-blue-50" />
          <MetricCard value={metrics.sellers} label="Sellers" color="bg-purple-50" />
          <MetricCard value={metrics.active} label="Active" color="bg-green-50" />
          <MetricCard value={metrics.suspended} label="Suspended" color="bg-red-50" />
        </div>

        {/* User Management */}
        <section className="rounded-xl border border-[var(--line-amber)] bg-white shadow-card">
          {/* TOP: title + filters aligned */}
          <div className="px-5 py-3 border-b border-[var(--line-amber)]/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold text-[var(--brown-700)]">
              User Management
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users..."
                className="h-9 w-[240px] md:w-[280px] rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm placeholder:text-[var(--brown-700)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
              >
                <option value="all">All Types</option>
                <option value="customer">Customers</option>
                <option value="seller">Sellers</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {loading && (
              <div className="text-sm text-[var(--brown-700)]/70">Loading users...</div>
            )}
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            {filtered.map((u) => (
              <UserCard key={u.id} user={u} onView={() => onView(u)} onSuspend={() => toggleSuspend(u.id)} />
            ))}
          </div>
        </section>
      </div>

      {/* Profile Modal */}
      <UserProfileModal
        open={open}
        onClose={() => setOpen(false)}
        user={current}
        peso={peso}
        onSuspend={() => current && toggleSuspend(current.id)}
      />

      {/* Toast */}
      <Toast show={toast.show} message={toast.message} onClose={() => setToast({ show: false, message: "" })} />
    </>
  );
}

/* Components */

function MetricCard({ value, label, color }) {
  return (
    <div className={`rounded-xl border border-[var(--line-amber)] shadow-card ${color} p-4 flex flex-col items-center justify-center`}>
      <div className="text-2xl font-semibold text-[var(--brown-700)]">{value}</div>
      <div className="text-sm text-[var(--brown-700)]/70">{label}</div>
    </div>
  );
}

function Tag({ color, children }) {
  const COLORS = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return (
    <span className={`text-[11px] px-2 py-[1px] rounded-full border capitalize ${COLORS[color]}`}>
      {children}
    </span>
  );
}

function UserCard({ user, onView, onSuspend }) {
  const first = (user.name || "?")[0]?.toUpperCase() || "U";
  const fullId = String(user.id || "");
  const compactId = fullId.replace(/-/g, "").toUpperCase().slice(0, 8);
  const displayId = compactId ? `USR-${compactId}` : "USR-UNKNOWN";
  const isSeller = user.role === "seller";
  const avatarSrc = isSeller && user.storeLogo ? user.storeLogo : user.avatarUrl;
  return (
    <div className="relative rounded-xl border border-[var(--line-amber)] bg-gradient-to-br from-[#fffdf5] to-[#fffaf0] p-5 flex flex-col sm:flex-row sm:items-center justify-between">
      {/* Left: basic info */}
      <div className="flex items-start gap-4">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={user.name || "User"}
            className="h-10 w-10 rounded-full object-cover border border-[var(--line-amber)] bg-white"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[var(--amber-400)]/25 grid place-items-center text-[var(--orange-600)] font-medium">
            {first}
          </div>
        )}
        <div>
          <div className="font-semibold text-[var(--brown-700)]">{user.name}</div>
          <div className="text-sm text-[var(--brown-700)]/70">{user.email}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Tag color={user.role === "seller" ? "purple" : "blue"}>
              {user.role === "seller" ? "seller" : "buyer"}
            </Tag>
            <Tag color={user.status === "active" ? "green" : "red"}>{user.status}</Tag>
          </div>
          <div className="text-[11px] text-[var(--brown-700)]/60 mt-2">
            Join Date: {user.joinDate} • Member for {user.days} days
          </div>
        </div>
      </div>

      {/* Middle stats: only last active */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:gap-8 mt-3 sm:mt-0">
        <div className="text-center sm:text-left">
          <div className="text-[11px] text-[var(--brown-700)]/60">Last Active</div>
          <div className="text-[var(--brown-700)]">{user.lastActive}</div>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 mt-3 sm:mt-0">
        <button onClick={onView} className="h-8 px-3 rounded-lg border border-[var(--line-amber)] text-sm hover:bg-[var(--cream-50)]">
          View Profile
        </button>
        <button
          onClick={onSuspend}
          className={`h-8 px-3 rounded-lg border text-sm ${
            user.status === "active"
              ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >
          {user.status === "active" ? "Suspend" : "Unsuspend"}
        </button>
      </div>

      {/* User ID at right: short code with full UUID in tooltip */}
      <div
        className="absolute right-6 top-4 text-[11px] text-[var(--brown-700)]/60"
        title={fullId || undefined}
      >
        User ID {displayId}
      </div>
    </div>
  );
}
