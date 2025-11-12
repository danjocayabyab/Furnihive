// src/components/navbar/UserNavbar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCart } from "../contexts/CartContext.jsx";

export default function UserNavbar() {
  const navigate = useNavigate();
  const cart = useCart();

  // derive cart badge from context (sum of quantities)
  const cartCount = useMemo(
    () => cart.items.reduce((n, it) => n + (it.qty || 1), 0),
    [cart.items]
  );

  // (optional) unread messages – wire to backend later
  const [unread] = useState(0);

  const navItemCls = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-full text-sm text-[var(--orange-700)]
     hover:bg-[var(--cream-50)] ${isActive ? "bg-[var(--cream-50)] font-medium" : ""}`;

  const onSearchKey = (e) => {
    if (e.key === "Enter") {
      const q = e.currentTarget.value.trim();
      navigate(q ? `/shop?query=${encodeURIComponent(q)}` : "/shop");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-[var(--line-amber)]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        {/* Logo + tagline */}
        <Link to="/home" className="flex items-center gap-2">
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

          {/* Messages */}
          <NavLink to="/messages" className={navItemCls} title="Messages">
            <span className="relative">
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-[var(--orange-600)] px-1.5 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            <span>Messages</span>
          </NavLink>

          {/* Cart — now same animation/active style as others */}
          <NavLink to="/cart" className={navItemCls} title="Cart">
            <span></span>
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="ml-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-[var(--orange-600)] px-1.5 text-[11px] font-semibold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </NavLink>

          <NavLink to="/profile" className={navItemCls}>
            <span></span>
            <span>Account</span>
          </NavLink>
        </nav>

        {/* (Optional) mobile minimal controls could go here */}
      </div>
    </header>
  );
}
