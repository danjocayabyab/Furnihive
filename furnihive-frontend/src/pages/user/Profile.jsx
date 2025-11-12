import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Button from "../../components/ui/Button.jsx";
import ProductCard from "../../components/ProductCard.jsx";

/* ---------- Mock data (swap with API later) ---------- */
const user = {
  name: "Maria Santos",
  email: "maria.santos@email.com",
  joined: "Joined August 2023",
  location: "Quezon City, Metro Manila",
  avatar:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop",
  stats: { totalOrders: 15, totalSpent: 425000, wishlist: 8, reviews: 12 },
};

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

  const [orders] = useState(initialOrders);

  // Reviews live here so both Overview/Orders panels can add, and Reviews tab can display.
  const [reviews, setReviews] = useState([]);

  // Modals
  const [detailsFor, setDetailsFor] = useState(null);
  const [reviewFor, setReviewFor] = useState(null);

  const money = (n) => `₱${Number(n).toLocaleString()}`;

  // submit new review (frontend only)
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

  // Derived counters for header stats
  const computedStats = useMemo(
    () => ({
      ...user.stats,
      reviews: reviews.length,
    }),
    [reviews]
  );

  // ✅ Logout function (added)
  const handleLogout = () => {
    localStorage.removeItem("fh_user");
    localStorage.removeItem("fh_token");
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/home" className="text-sm text-[var(--orange-600)] hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">My Profile</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="px-3 py-2 text-sm"
            onClick={() => navigate("/profile/settings")}
          >
            Account Settings
          </Button>
          {/* ✅ Logout now works */}
          <Button className="px-3 py-2 text-sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-2xl overflow-hidden border border-[var(--line-amber)]">
        <div className="bg-gradient-to-r from-[var(--amber-500)] to-[var(--orange-600)] p-5 text-white">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar}
              alt={user.name}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/80"
            />
            <div className="flex-1">
              <div className="text-xl font-bold">{user.name}</div>
              <div className="text-sm opacity-95">{user.email}</div>
              <div className="text-xs opacity-90 mt-1 flex items-center gap-3">
                <span>🪪 {user.joined}</span>
                <span>📍 {user.location}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6 text-right text-sm">
              <Stat value={computedStats.totalOrders} label="Total Orders" />
              <Stat value={money(computedStats.totalSpent)} label="Total Spent" />
              <Stat value={computedStats.wishlist} label="Wishlist Items" />
              <Stat value={computedStats.reviews} label="Reviews Written" />
            </div>
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
            <TabButton active={tab === "wishlist"} onClick={() => setTab("wishlist")}>
              Wishlist
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
      {tab === "wishlist" && <WishlistPanel />}
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
      {/* Recent orders */}
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

        {/* Achievements */}
        <div className="grid sm:grid-cols-3 gap-4 p-5">
          <Badge icon="👑" title="VIP Customer" sub="Earned after 10+ orders" />
          <Badge icon="⭐" title="Top Reviewer" sub="10+ helpful reviews written" />
          <Badge icon="👁️" title="Early Adopter" sub="Joined in the first year" />
        </div>
      </div>

      {/* Quick actions */}
      <aside className="rounded-2xl border border-[var(--line-amber)] bg-white h-fit p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-3">Quick Actions</h3>
        <div className="space-y-3">
          <ActionButton label="Track Orders" to="/profile?tab=orders" />
          <ActionButton label="View Wishlist" to="/profile?tab=wishlist" />
          <ActionButton label="Write Review" to="/profile?tab=reviews" />
          <ActionButton label="Payment Methods" to="/profile/settings" />
        </div>
      </aside>
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

function WishlistPanel() {
  // Mock wishlist items (replace with GET /wishlist later)
  const wishlist = [
    {
      id: "p1",
      title: "Executive Office Desk",
      price: 22500,
      oldPrice: 28000,
      image:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=800&auto=format&fit=crop",
      seller: "Metro Office Solutions",
      rating: 4.6,
      reviews: 156,
    },
    {
      id: "p2",
      title: "Modern Bookshelf",
      price: 15500,
      oldPrice: 18500,
      image:
        "https://images.unsplash.com/photo-1589820296156-f03f61d5c3c9?q=80&w=800&auto=format&fit=crop",
      seller: "Palawan Design Co.",
      rating: 4.6,
      reviews: 134,
    },
    {
      id: "p3",
      title: "Glass Coffee Table",
      price: 12500,
      oldPrice: 15000,
      image:
        "https://images.unsplash.com/photo-1598300053650-943ff61ad3f6?q=80&w=800&auto=format&fit=crop",
      seller: "QC Home Essentials",
      rating: 4.3,
      reviews: 67,
      outOfStock: true,
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {wishlist.map((p) => (
        <ProductCard key={p.id} product={p} />
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

function Stat({ value, label }) {
  return (
    <div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="opacity-90">{label}</div>
    </div>
  );
}

function Badge({ icon, title, sub }) {
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4 text-center">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 font-semibold text-[var(--brown-700)]">{title}</div>
      <div className="text-xs text-gray-600">{sub}</div>
    </div>
  );
}

function ActionButton({ label, to }) {
  return (
    <Link
      to={to}
      className="w-full text-left px-3 py-2 rounded-lg border border-[var(--line-amber)] hover:bg-[var(--cream-50)] flex items-center gap-2 text-sm"
    >
      <span className="text-[var(--orange-600)]">•</span>
      <span>{label}</span>
    </Link>
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
            {[1,2,3,4,5].map((n) => (
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
