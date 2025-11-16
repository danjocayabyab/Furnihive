import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import Button from "../../components/ui/Button.jsx";
import { logout } from "../../lib/auth.js";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient";

/* ---------- Mock data (swap with API later) ---------- */
// replaced by AuthContext values

const initialOrders = [
  {
    id: "ORD-2024-001",
    date: "2024-12-20",
    items: 1,
    title: "Modern Sectional Sofa",
    price: 45999,
    status: "Delivered",
    image:
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=800&auto=format&fit=crop",
    seller: "Manila Furniture Co.",
    color: "Charcoal Gray",
    quantity: 1,
    address: ["123 Katipunan Ave, Loyola Heights", "Quezon City, Metro Manila 1108"],
    shippingFee: 0,
  },
  {
    id: "ORD-2024-002",
    date: "2024-12-18",
    items: 1,
    title: "Solid Wood Dining Set",
    price: 35500,
    status: "Shipped",
    image:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop",
    seller: "Cebu Woodworks",
    color: "Natural",
    quantity: 1,
    address: ["45 Ayala Ave, CBD", "Makati, Metro Manila 1226"],
    shippingFee: 500,
  },
  {
    id: "ORD-2024-003",
    date: "2024-12-15",
    items: 2,
    title: "Premium Bed Frame + Mattress",
    price: 28999,
    status: "Processing",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800&auto=format&fit=crop",
    seller: "Davao Sleep Solutions",
    color: "Walnut",
    quantity: 2,
    address: ["Blk 7 Lot 12 Commonwealth", "QC, Metro Manila 1118"],
    shippingFee: 500,
  },
];

const STATUS_STYLES = {
  Delivered: "bg-green-100 text-green-700 border border-green-200",
  Shipped: "bg-sky-100 text-sky-700 border border-sky-200",
  Processing: "bg-amber-100 text-amber-700 border border-amber-200",
};

/* ----------------------------------------------------- */

export default function Profile() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const tab = sp.get("tab") ?? "overview";
  const setTab = (t) => setSp({ tab: t });
  const { user: authUser, profile, refreshProfile } = useAuth();
  const isSuspended = !!profile?.suspended;
  const [avatarSrc, setAvatarSrc] = useState("");
  const [defaultAddress, setDefaultAddress] = useState("");

  useEffect(() => {
    // ensure freshest profile after navigating from settings
    refreshProfile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isSuspended) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <div className="font-semibold text-red-900 mb-1">Account suspended</div>
          <p className="mb-2">
            Your account has been suspended by an administrator. You can still browse products, but
            accessing your profile and order history is currently disabled.
          </p>
          <p className="text-xs text-red-900/80 mb-3">
            If you believe this is a mistake or would like to appeal, please contact support.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/logout")}
              className="rounded-xl border border-[var(--line-amber)] px-4 py-2.5 text-sm font-medium text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
            >
              Log out
            </button>
            <button
              type="button"
              onClick={() => navigate("/support")}
              className="rounded-xl bg-[var(--orange-600)] px-4 py-2.5 text-white text-sm font-medium hover:brightness-95"
            >
              Contact support
            </button>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const md = authUser?.user_metadata || {};
    const publicUrl = profile?.avatar_url || md.avatar_url || "";
    const path = profile?.avatar_path || md.avatar_path || "";
    let cancelled = false;
    async function load() {
      if (publicUrl) {
        setAvatarSrc(publicUrl);
        return;
      }
      if (path) {
        const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
        if (!cancelled) setAvatarSrc(data?.signedUrl || "");
        return;
      }
      setAvatarSrc("");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authUser, profile]);

  useEffect(() => {
    let cancelled = false;
    async function loadDefaultAddress() {
      if (!authUser?.id) return setDefaultAddress("");
      const { data, error } = await supabase
        .from("addresses")
        .select("line1,postal_code,province,city,is_default,deleted_at")
        .eq("user_id", authUser.id)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);
      if (!cancelled) {
        const a = data?.[0];
        const cityProv = [a?.city, a?.province].filter(Boolean).join(", ");
        const withPostal = [cityProv, a?.postal_code].filter(Boolean).join(" ");
        const parts = [a?.line1, withPostal].filter((p) => !!p && String(p).trim().length > 0);
        const text = a ? parts.join(" · ") : "";
        setDefaultAddress(text);
      }
    }
    loadDefaultAddress();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  const [orders] = useState(initialOrders);
  const [reviews, setReviews] = useState([]);

  // Modals
  const [detailsFor, setDetailsFor] = useState(null);
  const [reviewFor, setReviewFor] = useState(null);

  const money = (n) => `₱${Number(n).toLocaleString()}`;

  const handleSubmitReview = ({ orderId, product, rating, text }) => {
    const newReview = {
      id: `rev-${Date.now()}`,
      orderId,
      product,
      rating,
      text,
      date: new Date().toISOString().slice(0, 10),
    };
    setReviews((r) => [newReview, ...r]);
    setReviewFor(null);
    setTab("reviews");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
          aria-label="Back to Home"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">My Profile</h1>
          <p className="text-xs text-gray-600">View your orders, reviews, and account details.</p>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-2xl overflow-hidden border border-[var(--line-amber)]">
        <div className="bg-gradient-to-r from-[var(--amber-500)] to-[var(--orange-600)] p-5 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {(() => {
            const md = authUser?.user_metadata || {};
            const fullName = [
              profile?.first_name || md.first_name,
              profile?.last_name || md.last_name,
            ]
              .filter(Boolean)
              .join(" ")
              .trim() || md.full_name || "";
            const avatar = avatarSrc || null;
            const seed = fullName || authUser?.email || "User";
            const src = avatar || ("https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(seed));
            return (
              <img
                src={src}
                alt={fullName || authUser?.email || "User"}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/80 bg-white"
              />
            );
          })()}
          <div>
            {(() => {
              const md = authUser?.user_metadata || {};
              const fullName = [
                profile?.first_name || md.first_name,
                profile?.last_name || md.last_name,
              ]
                .filter(Boolean)
                .join(" ")
                .trim() || md.full_name || "";
              const title = fullName || authUser?.email || "User";
              const showEmail = !!authUser?.email && title !== authUser.email;
              return (
                <>
                  <div className="text-xl font-bold">{title}</div>
                  {showEmail && <div className="text-sm opacity-95">{authUser.email}</div>}
                </>
              );
            })()}
              <div className="text-xs opacity-90 mt-1 flex items-center gap-3">
                <span>🪪 Member</span>
                <span>📍 {defaultAddress || "—"}</span>
              </div>
            </div>
          </div>
          <div>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-sm bg-white text-[var(--orange-600)] border border-white hover:bg-[var(--cream-50)]"
              onClick={() => navigate("/profile/settings")}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[var(--cream-50)] px-4 py-2 border-t border-[var(--line-amber)]">
          <div className="flex gap-2">
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>
              Order History
            </TabButton>
            <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
              Reviews
            </TabButton>
          </div>
        </div>
      </div>

      {/* Panels */}
      {tab === "overview" && (
        <OverviewPanel
          money={money}
          orders={orders}
          onViewDetails={setDetailsFor}
          onWriteReview={setReviewFor}
        />
      )}
      {tab === "orders" && (
        <OrdersPanel
          money={money}
          orders={orders}
          onViewDetails={setDetailsFor}
          onWriteReview={setReviewFor}
        />
      )}
      {tab === "reviews" && <ReviewsPanel reviews={reviews} />}

      {/* Modals */}
      {detailsFor && (
        <OrderDetailsModal order={detailsFor} onClose={() => setDetailsFor(null)} money={money} />
      )}
      {reviewFor && (
        <WriteReviewModal
          order={reviewFor}
          onClose={() => setReviewFor(null)}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  );
}

/* ---------- Panels ---------- */
function OverviewPanel({ money, orders, onViewDetails, onWriteReview }) {
  return (
    <div className="grid lg:grid-cols-[1fr,360px] gap-6">
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">Recent Orders</h3>
          <span className="text-sm text-gray-600">{orders.length} total</span>
        </div>
        <ul className="divide-y divide-[var(--line-amber)]/70">
          {orders.map((o) => (
            <li key={o.id} className="px-5 py-4">
              <OrderRow o={o} money={money} />
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-sm"
                  onClick={() => onViewDetails(o)}
                >
                  View Details
                </Button>
                <Button className="px-3 py-1.5 text-sm" onClick={() => onWriteReview(o)}>
                  Write Review
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function OrdersPanel({ money, orders, onViewDetails, onWriteReview }) {
  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--brown-700)]">{o.id}</div>
              <div className="text-xs text-gray-600">Placed on {o.date}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[o.status]}`}>
              {o.status}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <img
              src={o.image}
              alt={o.title}
              className="h-16 w-20 object-cover rounded-lg border border-[var(--line-amber)]"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[var(--brown-700)] font-medium truncate">{o.title}</div>
              <div className="text-xs text-gray-600">
                {o.items} item{o.items > 1 ? "s" : ""} • {money(o.price)}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => onViewDetails(o)}>
                View Details
              </Button>
              <Button className="px-3 py-1.5 text-sm" onClick={() => onWriteReview(o)}>
                Write Review
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewsPanel({ reviews }) {
  if (!reviews.length) {
    return (
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-6 text-center text-gray-600">
        You haven't written any reviews yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-[var(--line-amber)] bg-white p-4 flex gap-3"
        >
          <div className="text-2xl">⭐</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-[var(--brown-700)]">{r.product}</div>
              <span className="text-xs text-gray-600">({r.rating}/5)</span>
              <span className="ml-auto text-xs text-gray-600">{r.date}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{r.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- UI bits ---------- */
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full transition ${
        active
          ? "bg-white border border-[var(--line-amber)] text-[var(--orange-600)] font-medium"
          : "hover:bg-white text-[var(--brown-700)]"
      }`}
    >
      {children}
    </button>
  );
}

function OrderRow({ o, money }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={o.image}
        alt={o.title}
        className="h-14 w-20 object-cover rounded-lg border border-[var(--line-amber)]"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--brown-700)] truncate">{o.id}</div>
        <div className="text-sm text-[var(--brown-700)] truncate">{o.title}</div>
        <div className="text-xs text-gray-600">
          {o.date} • {money(o.price)}
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[o.status]}`}>
        {o.status}
      </span>
    </div>
  );
}

/* ---------- Modals ---------- */

function OrderDetailsModal({ order, onClose, money }) {
  const statuses = ["Processing", "Shipped", "Delivered"];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-[var(--line-amber)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[var(--brown-700)] font-semibold">Order Details</h4>
          <button className="text-sm text-gray-600" onClick={onClose}>✕</button>
        </div>

        <div className="flex gap-4">
          <img
            src={order.image}
            alt={order.title}
            className="h-24 w-32 object-cover rounded-lg border border-[var(--line-amber)]"
          />
          <div className="flex-1">
            <div className="font-semibold text-[var(--brown-700)]">{order.title}</div>
            <div className="text-xs text-gray-600">Order ID: {order.id}</div>
            <div className="text-xs text-gray-600">Date: {order.date}</div>
            <div className="text-xs text-gray-600">Seller: {order.seller}</div>
            <div className="text-xs text-gray-600">Color: {order.color}</div>
            <div className="text-xs text-gray-600">Qty: {order.quantity}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-[var(--brown-700)]">{money(order.price)}</div>
            <div className="text-xs text-gray-600">Shipping: {order.shippingFee ? money(order.shippingFee) : "FREE"}</div>
            <div className="text-sm font-semibold text-[var(--brown-700)] mt-1">
              Total: {money(order.price + (order.shippingFee || 0))}
            </div>
          </div>
        </div>

        {/* Basic order tracking */}
        <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-3 space-y-2">
          <div className="text-xs font-semibold text-[var(--brown-700)] mb-1">Order Tracking</div>
          <div className="flex items-center gap-2">
            {statuses.map((s, i) => (
              <div key={i} className="flex-1 text-center">
                <div
                  className={`w-6 h-6 mx-auto rounded-full ${
                    s === order.status || statuses.indexOf(s) < statuses.indexOf(order.status)
                      ? "bg-[var(--orange-600)]"
                      : "bg-gray-300"
                  }`}
                />
                <div className="text-[10px] mt-1">{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-3">
          <div className="text-xs font-semibold text-[var(--brown-700)] mb-1">Shipping Address</div>
          <div className="text-sm text-gray-700">
            {order.address.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Write Review Modal ---------- */
function WriteReviewModal({ order, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onSubmit({
      orderId: order.id,
      product: order.title,
      rating,
      text: text.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[var(--line-amber)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[var(--brown-700)] font-semibold">Write a Review</h4>
          <button className="text-sm text-gray-600" onClick={onClose}>✕</button>
        </div>

        <div className="flex gap-3 items-center">
          <img
            src={order.image}
            alt={order.title}
            className="h-14 w-18 object-cover rounded-lg border border-[var(--line-amber)]"
          />
          <div>
            <div className="text-sm font-semibold text-[var(--brown-700)]">{order.title}</div>
            <div className="text-xs text-gray-600">Order {order.id}</div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--brown-700)]">Rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? "text-[var(--amber-500)]" : "text-gray-300"}`}
                aria-label={`${n} star`}
              >
                ★
              </button>
            ))}
            <span className="text-xs text-gray-600 ml-2">{rating}/5</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--brown-700)]">Your Review</label>
          <textarea
            rows={5}
            className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none"
            placeholder="Share your experience about the product and delivery..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Submit Review</Button>
        </div>
      </div>
    </div>
  );
}
