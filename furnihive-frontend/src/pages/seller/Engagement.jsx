import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";

export default function SellerEngagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sellerId = user?.id;

  /* ---------------- Reviews: loaded from Supabase ---------------- */
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [expandedIds, setExpandedIds] = useState([]); // which review cards are expanded

  /* ---------------- KPI counts ---------------- */
  const kpis = useMemo(() => {
    const totalReviews = reviews.length;
    return { totalReviews };
  }, [reviews]);

  /* ---------------- Reply modal state ---------------- */
  const [replyCtx, setReplyCtx] = useState(null); // { id, initial }
  const closeModal = () => setReplyCtx(null);

  const openReply = (id, initial = "") => setReplyCtx({ id, initial });

  const submitReply = async (text) => {
    if (!replyCtx) return;
    try {
      await supabase
        .from("reviews")
        .update({
          seller_reply: text,
          seller_reply_created_at: new Date().toISOString(),
        })
        .eq("id", replyCtx.id);
    } catch {
      // ignore error; fall back to local state update
    }
    setReviews((prev) =>
      prev.map((r) =>
        r.id === replyCtx.id ? { ...r, reply: text, status: "replied" } : r
      )
    );
    closeModal();
  };

  /* ---------------- Load reviews for this seller ---------------- */
  useEffect(() => {
    if (!sellerId) {
      setReviews([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingReviews(true);
      try {
        console.log("ENGAGEMENT sellerId", sellerId);
        // Step 1: find all orders that include this seller's items
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("order_id, title, buyer_name")
          .eq("seller_id", sellerId);
        console.log("ENGAGEMENT order_items", { error: itemsErr, count: items?.length, sample: items?.[0] });

        if (itemsErr || !items?.length || cancelled) {
          if (!cancelled) setReviews([]);
          return;
        }

        const metaByOrder = new Map();
        items.forEach((row) => {
          if (!row?.order_id) return;
          if (!metaByOrder.has(row.order_id)) {
            metaByOrder.set(row.order_id, {
              product: row.title || "",
              customer: row.buyer_name || "Customer",
            });
          }
        });

        const orderIds = Array.from(metaByOrder.keys());
        if (!orderIds.length) {
          setReviews([]);
          return;
        }

        // Step 2: load all reviews attached to those orders
        let query = supabase
          .from("reviews")
          .select(
            "id, order_id, rating, text, image_url, created_at, seller_reply, seller_reply_created_at"
          );

        if (orderIds.length === 1) {
          query = query.eq("order_id", orderIds[0]);
        } else {
          query = query.in("order_id", orderIds);
        }

        const { data: revRows, error: revErr } = await query.order("created_at", { ascending: false });
        console.log("ENGAGEMENT reviews query", { orderIds, error: revErr, count: revRows?.length, first: revRows?.[0] });

        if (revErr || !revRows || cancelled) return;

        const mapped = revRows.map((r) => {
          let images = [];
          if (r.image_url) {
            try {
              const parsed = JSON.parse(r.image_url);
              if (Array.isArray(parsed)) images = parsed;
            } catch {
              // ignore parse error
            }
          }
          const meta = metaByOrder.get(r.order_id) || {};
          const reply = r.seller_reply || "";
          return {
            id: r.id,
            product: meta.product || "",
            customer: meta.customer || "Customer",
            dateISO: r.created_at,
            rating: r.rating,
            text: r.text,
            status: reply ? "replied" : "pending",
            reply,
            images,
          };
        });

        if (!cancelled) setReviews(mapped);
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/seller")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
          title="Back to Dashboard"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">Review Engagement</h1>
          <p className="text-xs text-gray-600">
            Manage product reviews and your replies to customers
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI label="Total Reviews" value={kpis.totalReviews} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Reviews */}
        <section className="rounded-2xl border border-[var(--line-amber)] bg-white lg:col-span-2">
          <div className="px-5 py-4 border-b border-[var(--line-amber)]">
            <h3 className="font-semibold text-[var(--brown-700)]">
              Recent Reviews
            </h3>
            <p className="text-xs text-gray-600">
              Customer feedback on your products
            </p>
          </div>

          <ul className="p-4 space-y-4">
            {reviews.map((r) => {
              const isExpanded = expandedIds.includes(r.id);
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-[var(--line-amber)] bg-[var(--amber-50)]/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[var(--brown-700)] text-sm">
                      {r.customer}
                      <span className="text-xs text-gray-600 ml-2">
                        {new Date(r.dateISO).toLocaleDateString()}
                      </span>
                    </div>
                    <StatusPill color={r.status === "replied" ? "green" : "amber"}>
                      {r.status === "replied" ? "Replied" : "Pending"}
                    </StatusPill>
                  </div>

                  <div className="mt-1 text-xs text-gray-600">{r.product}</div>

                  <Stars n={r.rating} />

                  {isExpanded && (
                    <>
                      <p className="mt-2 text-sm text-[var(--brown-700)]">{r.text}</p>

                      {Array.isArray(r.images) && r.images.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.images.map((url, idx) => (
                            <div
                              key={idx}
                              className="h-16 w-16 rounded-lg border border-[var(--line-amber)] overflow-hidden bg-white"
                            >
                              <img
                                src={url}
                                alt="Review image"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {r.reply && (
                        <div className="mt-3 rounded-lg border border-[var(--line-amber)] bg-white p-3 text-sm">
                          <div className="text-gray-600 mb-1">Your reply</div>
                          <div className="text-[var(--brown-700)]">{r.reply}</div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-amber)] px-3 py-1.5 text-sm hover:bg-[var(--cream-50)]"
                      onClick={() => openReply(r.id, r.reply || "")}
                    >
                      {r.reply ? "Edit Reply" : "Reply"}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-amber)] px-3 py-1.5 text-xs hover:bg-[var(--cream-50)]"
                      onClick={() =>
                        setExpandedIds((prev) =>
                          prev.includes(r.id)
                            ? prev.filter((id) => id !== r.id)
                            : [...prev, r.id]
                        )
                      }
                    >
                      {isExpanded ? "Collapse" : "View"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Reply modal */}
      {replyCtx && (
        <ReplyModal
          initialText={replyCtx.initial}
          onCancel={closeModal}
          onSubmit={submitReply}
        />
      )}
    </div>
  );
}

/* ---------------- Small UI helpers ---------------- */

function KPI({ label, value, icon, accent = "text-[var(--orange-700)]" }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{label}</div>
        <span className={`text-xl ${accent}`}>{icon}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--brown-700)]">
        {value}
      </div>
    </div>
  );
}

function StatusPill({ color = "gray", children }) {
  const map = {
    green: "text-green-700 bg-green-100 border-green-300",
    amber: "text-yellow-700 bg-yellow-100 border-yellow-300",
    rose: "text-rose-700 bg-rose-100 border-rose-300",
    gray: "text-gray-700 bg-gray-100 border-gray-300",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${map[color]}`}
    >
      {children}
    </span>
  );
}

function Stars({ n = 0 }) {
  const full = "⭐";
  return (
    <div className="mt-2 text-[var(--orange-700)] text-sm" aria-label={`${n} stars`}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i}>{full}</span>
      ))}
    </div>
  );
}

function ReplyModal({ initialText = "", onCancel, onSubmit }) {
  const [value, setValue] = useState(initialText);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[var(--line-amber)] overflow-hidden">
        <div className="p-4 border-b border-[var(--line-amber)]">
          <div className="font-semibold text-[var(--brown-700)]">
            Write a Reply
          </div>
          <div className="text-xs text-gray-600">
            Your reply will be visible to the customer.
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-[var(--line-amber)] p-3 outline-none"
            placeholder="Type your reply…"
          />
        </div>
        <div className="p-4 border-t border-[var(--line-amber)] flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm hover:bg-[var(--cream-50)]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(value.trim())}
            disabled={!value.trim()}
            className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm font-medium hover:brightness-95 disabled:opacity-50"
          >
            Send Reply
          </button>
        </div>
      </div>
    </div>
  );
}
