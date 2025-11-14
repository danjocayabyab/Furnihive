import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { logout } from "../../lib/auth.js";

export default function SellerTopbar() {
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "New order received", read: false },
    { id: 2, text: "Product approved", read: false },
    { id: 3, text: "Verification completed", read: false },
  ]);

  const accountRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Mark notifications as read
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[var(--line-amber)]">
      <div className="mx-auto max-w-6xl px-4 h-[58px] flex items-center justify-between">
        {/* Left: logo + label */}
        <Link to="/seller" className="flex items-center gap-3">
          <div className="h-8 w-8 grid place-items-center rounded-md bg-[var(--orange-600)] text-white font-bold">
            F
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[var(--brown-700)]">FurniHive</div>
            <div className="text-[11px] text-[var(--orange-700)]/90 -mt-0.5">
              Seller Dashboard
            </div>
          </div>
        </Link>

        {/* Right: notifications + messages + account */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((s) => !s)}
              className="relative flex items-center gap-1 px-3 h-9 rounded-full hover:bg-[var(--cream-50)] text-sm font-medium text-[var(--orange-700)]"
              title="Notifications"
            >
              ⩍
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-xl border border-[var(--line-amber)] bg-white shadow-card overflow-hidden z-50">
                {notifications.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No notifications</div>
                ) : (
                  <ul>
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`px-4 py-3 text-sm cursor-pointer hover:bg-[var(--cream-50)] ${
                          !n.read ? "font-medium bg-[var(--cream-50)]" : ""
                        }`}
                        onClick={() => markAsRead(n.id)}
                      >
                        {n.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <button
            onClick={() => navigate("/seller/messages")}
            className="text-sm font-medium text-[var(--orange-700)] hover:underline"
            title="Messages"
          >
            ✉︎
          </button>

          {/* Account dropdown */}
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => setAccountOpen((s) => !s)}
              className="flex items-center gap-1 px-3 h-9 rounded-full hover:bg-[var(--cream-50)] text-sm font-medium text-[var(--orange-700)]"
            >
              Account <span className="text-[10px]">▾</span>
            </button>

            {accountOpen && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl border border-[var(--line-amber)] bg-white shadow-card overflow-hidden z-50">
                <button
                  onClick={() => {
                    setAccountOpen(false);
                    navigate("/seller/settings");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--cream-50)]"
                >
                  Account Settings
                </button>
                <button
                  onClick={() => {
                    setAccountOpen(false);
                    handleLogout();
                  }}
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
