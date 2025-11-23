import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect, useRef } from "react";
import Button from "../../components/ui/Button.jsx";
import { logout } from "../../lib/auth.js";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient";
import StoreLocationMap from "../../components/seller/StoreLocationMap.jsx";

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

  // Load real orders for this user from Supabase
  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      if (!authUser?.id) {
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, total_amount, item_count, summary_title, summary_image, status, seller_display, color, lalamove_order_id, lalamove_share_link, dropoff_lat, dropoff_lng, dropoff_address"
        )
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });

      if (cancelled || error || !data) return;

      const orderIds = data.map((o) => o.id).filter(Boolean);

      // Derive per-order status and primary product from order_items so buyer matches seller view
      const statusByOrder = new Map();
      const primaryProductByOrder = new Map();
      const sellerIdByOrder = new Map();
      if (orderIds.length) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, product_id, title, status, seller_id")
          .in("order_id", orderIds);

        const priority = { Delivered: 3, Shipped: 2, Processing: 1, Pending: 0 };
        (items || []).forEach((row) => {
          const oid = row.order_id;
          if (!oid) return;
          const raw = (row.status || "").toString();
          const normalized =
            /delivered/i.test(raw)
              ? "Delivered"
              : /shipped/i.test(raw)
              ? "Shipped"
              : /process/i.test(raw)
              ? "Processing"
              : /pending/i.test(raw)
              ? "Pending"
              : null;
          if (!normalized) return;
          const current = statusByOrder.get(oid);
          if (!current || priority[normalized] > priority[current]) {
            statusByOrder.set(oid, normalized);
          }

          // capture first seller_id per order for mapping to store coordinates
          if (row.seller_id && !sellerIdByOrder.has(oid)) {
            sellerIdByOrder.set(oid, row.seller_id);
          }

          // Capture the first product encountered per order as the primary product
          if (!primaryProductByOrder.has(oid) && row.product_id) {
            primaryProductByOrder.set(oid, {
              productId: row.product_id,
              title: row.title || null,
            });
          }
        });
      }

      // Load store coordinates for sellers involved in these orders so we can show pickup location on the map
      const storeCoordsBySeller = new Map();
      const sellerIds = Array.from(new Set(Array.from(sellerIdByOrder.values()).filter(Boolean)));
      if (sellerIds.length) {
        const { data: storesRows } = await supabase
          .from("stores")
          .select("owner_id, lat, lng")
          .in("owner_id", sellerIds);
        (storesRows || []).forEach((s) => {
          if (!s?.owner_id) return;
          storeCoordsBySeller.set(s.owner_id, {
            lat: s.lat != null ? Number(s.lat) : null,
            lng: s.lng != null ? Number(s.lng) : null,
          });
        });
      }

      console.log("ORDERS STATUS DEBUG", {
        orderIds,
        statusByOrder: Array.from(statusByOrder.entries()),
      });

      const mapped = data.map((o) => {
        const primary = primaryProductByOrder.get(o.id) || null;
        const derivedStatus = statusByOrder.get(o.id) || "Processing";
        const trackingId =
          derivedStatus === "Shipped" || derivedStatus === "Delivered"
            ? o.lalamove_order_id || null
            : null;

        const trackingUrl = trackingId && o.lalamove_share_link
          ? o.lalamove_share_link
          : null;

        const addressLines = o.dropoff_address
          ? [o.dropoff_address]
          : [];

        const sellerIdForOrder = sellerIdByOrder.get(o.id) || null;
        const storeCoords = sellerIdForOrder ? storeCoordsBySeller.get(sellerIdForOrder) || null : null;

        return {
          id: o.id,
          date: o.created_at ? o.created_at.slice(0, 10) : "",
          items: o.item_count || 0,
          title: primary?.title || o.summary_title || "Order",
          price: Number(o.total_amount || 0),
          // Status is now driven primarily by order_items.status so it matches seller view
          status: derivedStatus,
          image: o.summary_image || "",
          seller: o.seller_display || "",
          color: o.color || "",
          quantity: o.item_count || 0,
          productId: primary?.productId || null,
          address: addressLines,
          shippingFee: 0,
          trackingId,
          trackingUrl,
          dropoffLat: o.dropoff_lat ?? null,
          dropoffLng: o.dropoff_lng ?? null,
          storeLat: storeCoords?.lat ?? null,
          storeLng: storeCoords?.lng ?? null,
        };
      });

      setOrders(mapped);
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

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

  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Modals
  const [detailsFor, setDetailsFor] = useState(null);
  const [reviewFor, setReviewFor] = useState(null);

  const money = (n) => `₱${Number(n).toLocaleString()}`;

  const handleSubmitReview = async ({ orderId, product, rating, text, imageFiles, existingReviewId, existingImages = [] }) => {
    if (!text?.trim()) return;

    const files = Array.isArray(imageFiles) ? imageFiles : imageFiles ? [imageFiles] : [];
    const imageUrls = [];
    try {
      // Optional multi-image upload to review-images bucket
      for (const file of files) {
        if (!file) continue;
        const ext = (file.name || "jpg").split(".").pop() || "jpg";
        const path = `${authUser?.id || "anon"}/${orderId}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase
          .storage
          .from("review-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });
        if (!uploadErr) {
          const { data: pub } = supabase.storage
            .from("review-images")
            .getPublicUrl(path);
          if (pub?.publicUrl) imageUrls.push(pub.publicUrl);
        }
      }

      const combinedImages = [...existingImages, ...imageUrls];

      // Persist review in Supabase (table: public.reviews)
      let saved = null;
      try {
        if (existingReviewId) {
          const { data, error } = await supabase
            .from("reviews")
            .update({
              rating,
              text: text.trim(),
              image_url: combinedImages.length ? JSON.stringify(combinedImages) : null,
            })
            .eq("id", existingReviewId)
            .select("id, created_at, image_url")
            .single();
          if (!error && data) saved = data;
        } else {
          const { data, error } = await supabase
            .from("reviews")
            .insert({
              user_id: authUser?.id || null,
              order_id: orderId,
              rating,
              text: text.trim(),
              // store JSON-encoded array of URLs in image_url column
              image_url: combinedImages.length ? JSON.stringify(combinedImages) : null,
            })
            .select("id, created_at, image_url")
            .single();
          if (!error && data) saved = data;
        }
      } catch {
        // ignore; we'll still show the local review
      }

      // Try to infer product info from in-memory orders (for click-through to product page)
      const orderMatch = orders.find((o) => o.id === orderId);
      const inferredProductId = orderMatch?.productId || null;
      const inferredTitle = product || orderMatch?.title || "";

      const nextImages =
        (saved?.image_url && (() => {
          try {
            const parsed = JSON.parse(saved.image_url);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()) || combinedImages;

      const newReview = {
        id: saved?.id || existingReviewId || `rev-${Date.now()}`,
        orderId,
        productId: inferredProductId,
        product: inferredTitle,
        rating,
        text: text.trim(),
        date: (saved?.created_at || new Date().toISOString()).slice(0, 10),
        images: nextImages,
      };

      setReviews((prev) => {
        const idx = prev.findIndex((r) => r.orderId === orderId);
        if (idx === -1) return [newReview, ...prev];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newReview };
        return copy;
      });
      setReviewFor(null);
      setTab("reviews");
    } catch {
      // best-effort
    }
  };

  const handleMarkReceived = async (orderId) => {
    if (!orderId) return;
    try {
      // Update buyer-facing summary row
      await supabase
        .from("orders")
        .update({ status: "Delivered" })
        .eq("id", orderId)
        .eq("user_id", authUser?.id || "");

      // Update per-seller order_items rows so seller view matches
      await supabase
        .from("order_items")
        .update({ status: "Delivered" })
        .eq("order_id", orderId);
    } catch {
      // ignore errors; still update local state for UX
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "Delivered" } : o))
    );
    setDetailsFor((prev) =>
      prev && prev.id === orderId ? { ...prev, status: "Delivered" } : prev
    );
  };

  // Load existing reviews for this user's orders so they persist across refresh
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authUser?.id) {
        setReviews([]);
        return;
      }
      // First get all order ids and seller names for this buyer
      const { data: ordersRows, error: ordersErr } = await supabase
        .from("orders")
        .select("id, seller_display")
        .eq("user_id", authUser.id);
      if (cancelled || ordersErr || !ordersRows?.length) {
        setReviews([]);
        return;
      }
      const orderIds = Array.from(new Set(ordersRows.map((o) => o.id).filter(Boolean)));
      const orderMetaById = new Map();
      ordersRows.forEach((o) => {
        if (!o?.id) return;
        orderMetaById.set(o.id, {
          seller: o.seller_display || "",
        });
      });

      // Then load all reviews attached to any of those orders (regardless of user_id)
      const { data, error } = await supabase
        .from("reviews")
        .select("id, order_id, rating, text, image_url, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });
      if (cancelled || error || !data) return;
      const productByOrder = new Map();
      if (orderIds.length) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, product_id, title")
          .in("order_id", orderIds);
        (items || []).forEach((row) => {
          const oid = row.order_id;
          if (!oid || !row.product_id) return;
          if (!productByOrder.has(oid)) {
            productByOrder.set(oid, {
              productId: row.product_id,
              title: row.title || "",
            });
          }
        });
      }

      const mapped = data.map((r) => {
        let images = [];
        if (r.image_url) {
          try {
            const parsed = JSON.parse(r.image_url);
            if (Array.isArray(parsed)) images = parsed;
          } catch {
            // ignore parse error
          }
        }
        const prod = productByOrder.get(r.order_id) || null;
        const meta = orderMetaById.get(r.order_id) || null;
        return {
          id: r.id,
          orderId: r.order_id,
          productId: prod?.productId || null,
          product: prod?.title || "",
          rating: r.rating,
          text: r.text,
          date: (r.created_at || "").slice(0, 10),
          seller: meta?.seller || "",
          images,
        };
      });
      setReviews(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

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
              My Orders
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
          reviews={reviews}
          onViewDetails={setDetailsFor}
          onWriteReview={(order) => {
            const existing = reviews.find((r) => r.orderId === order.id) || null;
            setReviewFor(existing ? { ...order, existingReview: existing } : order);
          }}
        />
      )}
      {tab === "orders" && (
        <OrdersPanel
          money={money}
          orders={orders}
          reviews={reviews}
          onViewDetails={setDetailsFor}
          onWriteReview={(order) => {
            const existing = reviews.find((r) => r.orderId === order.id) || null;
            setReviewFor(existing ? { ...order, existingReview: existing } : order);
          }}
        />
      )}
      {tab === "reviews" && <ReviewsPanel reviews={reviews} />}

      {/* Modals */}
      {detailsFor && (
        <OrderDetailsModal
          order={detailsFor}
          onClose={() => setDetailsFor(null)}
          money={money}
          onMarkReceived={handleMarkReceived}
        />
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
function OverviewPanel({ money, orders, reviews, onViewDetails, onWriteReview }) {
  return (
    <div className="grid lg:grid-cols-[1fr,360px] gap-6">
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-amber)]">
          <h3 className="font-semibold text-[var(--brown-700)]">Recent Orders</h3>
          <span className="text-sm text-gray-600">{orders.length} total</span>
        </div>
        <ul className="divide-y divide-[var(--line-amber)]/70">
          {orders
            .filter((o) => o.status !== "Delivered")
            .map((o) => {
            const hasReview = reviews.some((r) => r.orderId === o.id);
            return (
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
                  {o.status === "Delivered" && (
                    <Button className="px-3 py-1.5 text-sm" onClick={() => onWriteReview(o)}>
                      {hasReview ? "Edit Review" : "Write Review"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function OrdersPanel({ money, orders, reviews, onViewDetails, onWriteReview }) {
  const [statusFilter, setStatusFilter] = useState("Delivered");

  const visibleOrders = orders.filter((o) => {
    if (!statusFilter) return true;
    return o.status === statusFilter;
  });

  const statuses = ["Pending", "Processing", "Shipped", "Delivered"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center mb-2">
        <span className="text-xs text-gray-600">Filter by status:</span>
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs border transition ${
              statusFilter === s
                ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)]"
                : "bg-white text-[var(--brown-700)] border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {visibleOrders.map((o) => {
        const hasReview = reviews.some((r) => r.orderId === o.id);
        return (
          <div key={o.id} className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--brown-700)]">
                  {formatOrderId(o.id)}
                </div>
                <div className="text-xs text-gray-600">Placed on {formatOrderDate(o.date)}</div>
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
                {o.trackingId && (
                  <div className="mt-1 text-[11px] text-gray-600 flex flex-wrap items-center gap-2">
                    <span>Tracking: {o.trackingId}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(o.trackingId)}
                      className="px-2 py-0.5 rounded border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
                    >
                      Copy
                    </button>
                    {o.trackingUrl && (
                      <a
                        href={o.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
                      >
                        Track on Lalamove
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-sm"
                  onClick={() => onViewDetails(o)}
                >
                  View Details
                </Button>
                {o.status === "Delivered" && (
                  <Button className="px-3 py-1.5 text-sm" onClick={() => onWriteReview(o)}>
                    {hasReview ? "Edit Review" : "Write Review"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewsPanel({ reviews }) {
  const navigate = useNavigate();

  if (!reviews.length) {
    return (
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-6 text-center text-gray-600">
        You haven't written any reviews yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => {
        const handleClick = () => {
          if (r.productId) {
            navigate(`/product/${r.productId}?tab=reviews`);
          }
        };
        return (
          <button
            key={r.id}
            type="button"
            onClick={handleClick}
            className="w-full text-left rounded-2xl border border-[var(--line-amber)] bg-white p-4 hover:bg-[var(--cream-50)] transition"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-[var(--brown-700)] truncate">
                    {r.product || "Product"}
                  </div>
                  {r.seller && (
                    <span className="text-[11px] text-gray-500 truncate">by {r.seller}</span>
                  )}
                  <span className="ml-auto text-[11px] text-gray-500">
                    {formatOrderDate(r.date)}
                  </span>
                </div>
                <div className="text-xs text-yellow-600 mb-1">⭐ {r.rating}/5</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.text}</p>
                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.images.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={r.product || "Review image"}
                        className="h-20 w-20 object-cover rounded-lg border border-[var(--line-amber)]"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
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

function formatOrderId(id) {
  if (!id) return "Order";
  return `ORD-${String(id).slice(0, 8).toUpperCase()}`;
}

function formatOrderDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function OrderRow({ o, money }) {
  const displayId = formatOrderId(o.id);
  const displayDate = formatOrderDate(o.date);
  return (
    <div className="flex items-center gap-3">
      <img
        src={o.image}
        alt={o.title}
        className="h-14 w-20 object-cover rounded-lg border border-[var(--line-amber)]"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--brown-700)] truncate">{displayId}</div>
        <div className="text-sm text-[var(--brown-700)] truncate">{o.title}</div>
        <div className="text-xs text-gray-600">
          {displayDate} • {money(o.price)}
        </div>
        {o.trackingId && (
          <div className="text-[11px] text-gray-600 mt-0.5 flex flex-wrap items-center gap-2">
            <span>Tracking: {o.trackingId}</span>
            {o.trackingUrl && (
              <a
                href={o.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
              >
                Track on Lalamove
              </a>
            )}
          </div>
        )}
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[o.status]}`}>
        {o.status}
      </span>
    </div>
  );
}

/* ---------- Modals ---------- */

function OrderDetailsModal({ order, onClose, money, onMarkReceived }) {
  const statuses = ["Processing", "Shipped", "Delivered"];

  // Haversine distance in kilometers between two lat/lng points
  const distanceKm = (() => {
    if (!order?.storeLat || !order?.storeLng || !order?.dropoffLat || !order?.dropoffLng) return null;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(order.dropoffLat - order.storeLat);
    const dLng = toRad(order.dropoffLng - order.storeLng);
    const lat1 = toRad(order.storeLat);
    const lat2 = toRad(order.dropoffLat);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    if (!Number.isFinite(d)) return null;
    return d;
  })();

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
            <div className="text-xs text-gray-600">Order ID: {formatOrderId(order.id)}</div>
            <div className="text-xs text-gray-600">Date: {formatOrderDate(order.date)}</div>
            <div className="text-xs text-gray-600">Seller: {order.seller}</div>
            <div className="text-xs text-gray-600">Qty: {order.quantity}</div>
            {order.trackingId && (
              <div className="mt-1 text-[11px] text-gray-600 flex items-center gap-2">
                <span>Tracking: {order.trackingId}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(order.trackingId)}
                  className="px-2 py-0.5 rounded border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-[var(--brown-700)]">{money(order.price)}</div>
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
          {order.dropoffLat && order.dropoffLng && (
            <div className="mt-3">
              <StoreLocationMap
                lat={order.storeLat || order.dropoffLat}
                lng={order.storeLng || order.dropoffLng}
                secondaryLat={order.storeLat ? order.dropoffLat : null}
                secondaryLng={order.storeLat ? order.dropoffLng : null}
              />
            </div>
          )}
          {distanceKm != null && (
            <div className="mt-2 text-[11px] text-gray-600">
              Distance between store and dropoff: {distanceKm.toFixed(1)} km
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {order.status !== "Delivered" && (
            <Button onClick={() => onMarkReceived?.(order.id)}>
              Mark as Received
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Write Review Modal ---------- */
function WriteReviewModal({ order, onClose, onSubmit }) {
  const existing = order?.existingReview || null;
  const [rating, setRating] = useState(existing?.rating || 5);
  const [text, setText] = useState(existing?.text || "");
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState(
    Array.isArray(existing?.images) ? existing.images : []
  );
  const fileInputRef = useRef(null);

  const submit = () => {
    if (!text.trim()) return;
    onSubmit({
      orderId: order.id,
      productId: order.productId || null,
      product: order.title,
      rating,
      text: text.trim(),
      imageFiles,
      existingReviewId: existing?.id,
      existingImages,
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
            <div className="text-xs text-gray-600">Order {formatOrderId(order.id)}</div>
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

        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--brown-700)]">Add photo(s) (optional)</label>
          <div className="border border-[var(--line-amber)] rounded-xl p-3 bg-[var(--cream-50)]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const selected = Array.from(e.target.files || []);
                if (!selected.length) return;
                setImageFiles((prev) => [...prev, ...selected]);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center rounded-lg border border-[var(--line-amber)] bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
            >
              Choose files
            </button>
            {(existingImages.length > 0 || imageFiles.length > 0) && (
              <div className="mt-3 space-y-2">
                {existingImages.map((url, idx) => (
                  <div
                    key={`existing-${idx}`}
                    className="w-full flex items-center justify-between rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2 text-[var(--brown-700)]">
                      <img
                        src={url}
                        alt="Review image"
                        className="h-10 w-10 object-cover rounded-md border border-[var(--line-amber)]"
                      />
                      <span className="truncate max-w-[180px]">Existing photo {idx + 1}</span>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-red-500"
                      onClick={() => setExistingImages((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {imageFiles.map((file, idx) => {
                  const ext = (file.name || "").split(".").pop() || "FILE";
                  return (
                    <div
                      key={`new-${idx}`}
                      className="w-full flex items-center justify-between rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2 text-[var(--brown-700)]">
                        <span className="truncate max-w-[220px]">{file.name}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        {ext}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Submit Review</Button>
        </div>
      </div>
    </div>
  );
}
