import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SellerTopbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(1); // mock; wire to backend later
  const menuRef = useRef(null);

  // close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const logout = () => {
    // clear your auth/session as needed
    localStorage.removeItem("fh_token");
    navigate("/login");
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

        {/* Right: messages + account */}
        <div className="flex items-center gap-4" ref={menuRef}>
          {/* ✅ Messages (text only) */}
          <button
            onClick={() => navigate("/seller/messages")}
            className="relative text-sm font-medium text-[var(--orange-700)] hover:underline"
            title="Messages"
          >
            ✉︎
            
          </button>

          {/* ✅ Account dropdown (text only) */}
          <div className="relative">
            <button
              onClick={() => setOpen((s) => !s)}
              className="flex items-center gap-1 px-3 h-9 rounded-full hover:bg-[var(--cream-50)] text-sm font-medium text-[var(--orange-700)]"
            >
              Account <span className="text-[10px]">▾</span>
            </button>

            {open && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl border border-[var(--line-amber)] bg-white shadow-card overflow-hidden">
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/seller/settings");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--cream-50)]"
                >
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
