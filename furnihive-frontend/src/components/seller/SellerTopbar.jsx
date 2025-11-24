import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useSellerNotifications from "../../seller/lib/useNotifications.js";
import { logout } from "../../lib/auth.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient";

export default function SellerTopbar() {
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { user, profile } = useAuth();
  const sellerId = user?.id;

  // Seller-specific notification bus (separate from Admin)
  const { items, unread, markRead, markAllRead, addNotification } = useSellerNotifications();

  // Unread messages across all conversations for this seller
  const [msgUnread, setMsgUnread] = useState(0);

  const accountRef = useRef(null);
  const notifRef = useRef(null);
  const [storeLogoUrl, setStoreLogoUrl] = useState(null);

  const avatarUrl =
    storeLogoUrl || profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const displayName =
    profile?.store_name ||
    (profile?.first_name || profile?.last_name
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : user?.email || "Account");
  const avatarInitial = (displayName || "U").slice(0, 1).toUpperCase();

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

  // Load store logo for this seller (owner_id = sellerId)
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("stores")
          .select("logo_url")
          .eq("owner_id", sellerId)
          .maybeSingle();
        if (!cancelled && !error) {
          setStoreLogoUrl(data?.logo_url || null);
        }
      } catch {
        if (!cancelled) setStoreLogoUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  // Realtime: new order notifications for this seller (order_items inserts)
  useEffect(() => {
    if (!sellerId) return;

    console.log("SELLER NOTIF: subscribing for new orders", { sellerId });

    const channel = supabase
      .channel(`seller-orders-${sellerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        (payload) => {
          console.log("SELLER NOTIF: order_items INSERT payload", payload);
          const row = payload?.new || {};
          if (!row || row.seller_id !== sellerId || payload.eventType !== "INSERT") return;

          const orderId = row.order_id;
          const buyerName = row.buyer_name || "Customer";
          if (!orderId) return;

          const shortId = String(orderId).slice(0, 8).toUpperCase();
          addNotification({
            title: "New order received",
            body: `Order ORD-${shortId} from ${buyerName}`,
            link: "/seller/orders",
            type: "success",
          });
        }
      )
      .subscribe();

    return () => {
      console.log("SELLER NOTIF: removing order subscription", { sellerId });
      supabase.removeChannel(channel);
    };
  }, [sellerId, addNotification]);

  // Poll seller conversations for unread message count
  useEffect(() => {
    if (!sellerId) return;

    let cancelled = false;

    async function loadUnread() {
      const { data, error } = await supabase
        .from("conversations")
        .select("seller_unread_count")
        .eq("seller_id", sellerId);

      if (cancelled || error || !data) return;

      const total = data.reduce(
        (n, c) => n + (Number.isFinite(c.seller_unread_count) ? c.seller_unread_count : 0),
        0
      );
      setMsgUnread(total);
    }

    loadUnread();
    const id = setInterval(loadUnread, 30000);

    // Realtime: update unread count immediately when conversations change
    const channel = supabase
      .channel(`seller-unread-${sellerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `seller_id=eq.${sellerId}`,
        },
        (payload) => {
          if (!cancelled) {
            try {
              const oldRow = payload?.old || {};
              const newRow = payload?.new || {};
              const oldCount = Number.isFinite(oldRow.seller_unread_count)
                ? oldRow.seller_unread_count
                : 0;
              const newCount = Number.isFinite(newRow.seller_unread_count)
                ? newRow.seller_unread_count
                : 0;

              // If unread count increased, treat it as a new buyer message
              if (newCount > oldCount && newRow.last_message) {
                addNotification({
                  title: 'New message from customer',
                  body: newRow.last_message,
                  link: '/seller/messages',
                  type: 'info',
                });
              }
            } catch {
              // best-effort; ignore notification errors
            }

            loadUnread();
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [sellerId, addNotification]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openNotification = (n) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
    setNotifOpen(false);
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
          {/* Notifications (same pattern as Admin) */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((s) => !s)}
              className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--cream-50)]"
              title="Notifications"
            >
              <span className="text-[16px] leading-none text-[var(--orange-700)]">⩍</span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-1 w-[360px] rounded-xl border border-[var(--line-amber)] bg-white shadow-card overflow-hidden z-50">
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

          {/* Messages – simple icon without numeric badge */}
          <button
            onClick={() => navigate("/seller/messages")}
            className="text-sm font-medium px-2 py-1 rounded-full hover:bg-[var(--cream-50)]"
            title="Messages"
          >
            <span className="text-[16px] leading-none text-[var(--orange-700)]">✉︎</span>
          </button>

          {/* Account dropdown */}
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => setAccountOpen((s) => !s)}
              className="flex items-center gap-2 px-3 h-9 rounded-full hover:bg-[var(--cream-50)] text-sm font-medium text-[var(--orange-700)]"
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
                    navigate("/seller/support");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--cream-50)] border-t border-[var(--line-amber)]/60"
                >
                  Seller Support
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
