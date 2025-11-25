// src/components/navbar/UserNavbar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../contexts/CartContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import useBuyerNotifications from "../../buyer/lib/useNotifications.js";
import { supabase } from "../../lib/supabaseClient";

export default function UserNavbar() {
  const navigate = useNavigate();
  const cart = useCart();
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, profile } = useAuth();

  const notifRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const { items, unread, markRead, markAllRead, addNotification } = useBuyerNotifications();

  // derive cart badge from context (sum of quantities)
  const cartCount = useMemo(
    () => cart.items.reduce((n, it) => n + (it.qty || 1), 0),
    [cart.items]
  );

  // (optional) unread messages – wire to backend later
  const [msgUnread] = useState(0);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Realtime: buyer order updates (new orders + status changes)
  useEffect(() => {
    const buyerId = user?.id;
    if (!buyerId) return;

    console.log("BUYER NOTIF: subscribing for orders", { buyerId });

    const channel = supabase
      .channel(`buyer-orders-${buyerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${buyerId}`,
        },
        (payload) => {
          console.log("BUYER NOTIF: orders payload", payload);
          const eventType = payload?.eventType;
          const oldRow = payload?.old || {};
          const newRow = payload?.new || {};
          if (!newRow) return;

          const orderId = newRow.id;
          const shortId = String(orderId).slice(0, 8).toUpperCase();

          if (eventType === "INSERT") {
            addNotification({
              title: `Order ORD-${shortId} placed`,
              body: "Your order has been created.",
              link: "/profile",
              type: "success",
            });
            return;
          }

          if (eventType === "UPDATE") {
            if (oldRow && oldRow.status === newRow.status) return;
            const status = newRow.status || "Updated";

            addNotification({
              title: `Order ORD-${shortId} status updated`,
              body: `Your order is now: ${status}`,
              link: "/profile",
              type: "info",
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log("BUYER NOTIF: removing orders subscription", { buyerId });
      supabase.removeChannel(channel);
    };
  }, [user?.id, addNotification]);

  const navItemCls = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-full text-sm text-[var(--orange-700)]
     hover:bg-[var(--cream-50)] ${isActive ? "bg-[var(--cream-50)] font-medium" : ""}`;

  const onSearchKey = (e) => {
    if (e.key === "Enter") {
      const q = e.currentTarget.value.trim();
      navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
    }
  };

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const displayName =
    profile?.first_name || profile?.last_name
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : user?.email || "Account";
  const avatarInitial = (displayName || "U").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-[var(--line-amber)]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        {/* Logo + tagline */}
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 grid place-items-center rounded-md bg-[var(--orange-600)] text-white font-bold">
            F
          </div>
          <div className="leading-tight">
            <div className="text-[var(--brown-700)] font-semibold">FurniHive</div>
            <div className="text-[11px] text-[var(--orange-700)]/80 -mt-0.5">
              Furniture Marketplace
            </div>
          </div>
        </Link>

        {/* Search */}
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
            <span className="text-[var(--orange-700)]"></span>
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search for furniture, brands, or categories..."
              onKeyDown={onSearchKey}
            />
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="ml-auto hidden md:flex items-center gap-2">
          <NavLink to="/shop" className={navItemCls}>
            <span></span>
            <span>Shop</span>
          </NavLink>

          {/* Cart */}
          <NavLink to="/cart" className={navItemCls} title="Cart">
            <span></span>
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="ml-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-[var(--orange-600)] px-1.5 text-[11px] font-semibold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </NavLink>

          {user && (
            <>
              {/* Notifications – match SellerTopbar/AdminTopbar dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  title="Notifications"
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--cream-50)]"
                >
                  <span className="text-[16px] leading-none text-[var(--orange-700)]">⩍</span>
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--orange-600)] ring-2 ring-white" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[340px] rounded-xl border border-[var(--line-amber)] bg-white shadow-card overflow-hidden z-50">
                    <div className="px-4 py-2 flex items-center justify-between border-b border-[var(--line-amber)]/60">
                      <div className="font-medium text-[var(--brown-700)]">Notifications</div>
                      <button
                        type="button"
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
                            type="button"
                            onClick={() => {
                              markRead(n.id);
                              if (n.link) navigate(n.link);
                              setNotifOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 flex gap-2 items-start border-b border-[var(--line-amber)]/50 hover:bg-[var(--cream-50)] ${
                              n.read ? "opacity-80" : ""
                            }`}
                          >
                            <span className="mt-0.5 h-4 w-4 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] flex items-center justify-center text-[9px] font-semibold text-[var(--orange-700)]">
                              {n.type === "success"
                                ? "S"
                                : n.type === "warning"
                                ? "!"
                                : n.type === "error"
                                ? "!"
                                : "i"}
                            </span>
                            <span className="flex-1">
                              <div className="text-[13px] font-medium text-[var(--brown-700)]">{n.title}</div>
                              {n.body && (
                                <div className="text-[12px] text-[var(--brown-700)]/80">{n.body}</div>
                              )}
                              <div className="text-[11px] text-[var(--brown-700)]/50 mt-0.5">
                                {new Date(n.ts).toLocaleString()}
                              </div>
                            </span>
                            {!n.read && (
                              <span className="mt-1 h-2 w-2 rounded-full bg-[var(--orange-600)]" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages – match SellerTopbar icon style */}
              <NavLink
                to="/messages"
                className="text-sm font-medium px-2 py-1 rounded-full hover:bg-[var(--cream-50)]"
                title="Messages"
              >
                <span className="text-[16px] leading-none text-[var(--orange-700)]">✉︎</span>
              </NavLink>

              {/* Account dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-[var(--orange-700)] hover:bg-[var(--cream-50)] border border-transparent"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-7 w-7 rounded-full object-cover border border-[var(--line-amber)] bg-white"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-[var(--cream-50)] border border-[var(--line-amber)] grid place-items-center text-[11px] font-medium text-[var(--orange-700)]">
                      {avatarInitial}
                    </div>
                  )}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-xl border border-[var(--line-amber)] bg-white shadow-card text-sm z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--cream-50)] border-b border-[var(--line-amber)]/60"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        navigate("/support");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--cream-50)] border-b border-[var(--line-amber)]/60"
                    >
                      Customer Support
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        navigate("/logout");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--cream-50)]"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && (
            <div className="flex items-center gap-2 ml-2">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="px-3 py-2 text-sm rounded-full border border-[var(--line-amber)] text-[var(--orange-700)] hover:bg-[var(--cream-50)]"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="px-3 py-2 text-sm rounded-full bg-[var(--orange-600)] text-white hover:brightness-95"
              >
                Sign Up
              </button>
            </div>
          )}
        </nav>

        {/* (Optional) mobile minimal controls could go here */}
      </div>
    </header>
  );
}
