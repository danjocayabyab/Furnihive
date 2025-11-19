// src/admin/AdminTopbar.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useNotifications from "./lib/useNotifications";
import { logout } from "../lib/auth.js";

export default function AdminTopbar() {
  const navigate = useNavigate();

  // account dropdown
  const [openAcct, setOpenAcct] = useState(false);
  const acctRef = useRef(null);

  // notifications
  const { items, unread, markRead, markAllRead } = useNotifications();
  const [openBell, setOpenBell] = useState(false);
  const bellRef = useRef(null);

  // close dropdowns on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) setOpenAcct(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpenBell(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const openNotification = (n) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
    setOpenBell(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[var(--line-amber)]">
      <div className="mx-auto max-w-6xl px-4 h-[58px] flex items-center justify-between">
        {/* Left: logo + label */}
        <Link to="/admin" className="flex items-center gap-3">
          <div className="h-8 w-8 grid place-items-center rounded-md bg-[var(--orange-600)] text-white font-bold">
            F
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[var(--brown-700)]">FurniHive</div>
            {/* Changed color to black */}
            <div className="text-[11px] text-black -mt-0.5">
              Admin Dashboard
            </div>
          </div>
        </Link>

        {/* Right: notifications + account */}
        <div className="flex items-center gap-3">
          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setOpenBell((s) => !s)}
              className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--cream-50)] text-black" // <-- changed to black
              title="Notifications"
            >
              ⩍
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--orange-600)] ring-2 ring-white" />
              )}
            </button>

            {openBell && (
              <div className="absolute right-0 mt-2 w-[360px] rounded-xl border border-[var(--line-amber)] bg-white shadow-card overflow-hidden">
                <div className="px-4 py-2 flex items-center justify-between border-b border-[var(--line-amber)]/60">
                  <div className="font-medium text-[var(--brown-700)]">Notifications</div>
                  <button
                    onClick={markAllRead}
                    className="text-[12px] px-2 py-1 rounded border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
                  >
                    Mark all as read
                  </button>
                </div>

                <div className="max-h-80 overflow-auto">
                  {items.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-[var(--brown-700)]/60">No notifications.</div>
                  ) : (
                    items.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => openNotification(n)}
                        className={`w-full text-left px-4 py-3 flex gap-2 items-start border-b border-[var(--line-amber)]/50 hover:bg-[var(--cream-50)] ${
                          n.read ? "opacity-80" : ""
                        }`}
                      >
                        <span className="mt-0.5 text-[16px]">
                          {n.type === "success" ? "✅" : n.type === "warning" ? "⚠️" : n.type === "error" ? "⛔" : "🛈"}
                        </span>
                        <span className="flex-1">
                          <div className="text-[13px] font-medium text-[var(--brown-700)]">{n.title}</div>
                          {n.body && <div className="text-[12px] text-[var(--brown-700)]/80">{n.body}</div>}
                          <div className="text-[11px] text-[var(--brown-700)]/50 mt-0.5">
                            {new Date(n.ts).toLocaleString()}
                          </div>
                        </span>
                        {!n.read && <span className="mt-1 h-2 w-2 rounded-full bg-[var(--orange-600)]" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account */}
          <div className="relative" ref={acctRef}>
            <button
              onClick={() => setOpenAcct((s) => !s)}
              className="flex items-center gap-2 px-3 h-9 rounded-full hover:bg-[var(--cream-50)] text-black" // <-- changed to black
            >
              <span className="text-sm">Admin</span>
              <span className="text-[10px]">▾</span>
            </button>

            {openAcct && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl border border-[var(--line-amber)] bg-white shadow-card overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
