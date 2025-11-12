import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Replace the mock data with your API data later.
 * The only contract used below:
 *  - Review: { id, product, customer, dateISO, rating, text, status: "pending"|"replied", reply? }
 *  - Inquiry: { id, customer, dateISO, subject, message, status: "unread"|"read", reply? }
 */

export default function SellerEngagement() {
  const navigate = useNavigate();

  /* ---------------- Mock data (swap with fetch) ---------------- */
  const [reviews, setReviews] = useState([
    {
      id: "r1",
      product: "Modern Sectional Sofa",
      customer: "Maria Santos",
      dateISO: "2025-10-03",
      rating: 5,
      text:
        "This sofa exceeded my expectations. The quality is outstanding and it's very comfortable.",
      status: "replied",
      reply: "Thank you, Maria! We're so happy you love the sofa. 😊",
    },
    {
      id: "r2",
      product: "Solid Wood Dining Set",
      customer: "Juan dela Cruz",
      dateISO: "2025-10-02",
      rating: 4,
      text:
        "Beautiful dining set, exactly as described. Only issue was a slight delay in delivery.",
      status: "pending",
      reply: "",
    },
  ]);

  const [inquiries, setInquiries] = useState([
    {
      id: "q1",
      customer: "Carlos Mendoza",
      dateISO: "2025-10-04",
      subject: "Custom color options for dining table",
      message:
        "Hi! I'm interested in your solid wood dining table but would like it in a darker finish.",
      status: "unread",
      reply: "",
    },
    {
      id: "q2",
      customer: "Lisa Garcia",
      dateISO: "2025-10-04",
      subject: "Delivery to Cebu",
      message:
        "Do you deliver to Cebu City? I'm interested in ordering a sofa set.",
      status: "unread",
      reply: "",
    },
  ]);

  /* ---------------- Derived counts ---------------- */
  const kpis = useMemo(() => {
    const totalReviews = reviews.length;
    const totalInquiries = inquiries.length;
    const unread = inquiries.filter((i) => i.status === "unread").length;
    return { totalReviews, totalInquiries, unread };
  }, [reviews, inquiries]);

  /* ---------------- Reply modal state ---------------- */
  const [replyCtx, setReplyCtx] = useState(null); // { type: 'review'|'inquiry', id, initial }
  const closeModal = () => setReplyCtx(null);

  const openReply = (type, id, initial = "") =>
    setReplyCtx({ type, id, initial });

  const submitReply = (text) => {
    if (!replyCtx) return;
    if (replyCtx.type === "review") {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === replyCtx.id ? { ...r, reply: text, status: "replied" } : r
        )
      );
    } else {
      // inquiry
      setInquiries((prev) =>
        prev.map((q) =>
          q.id === replyCtx.id
            ? { ...q, reply: text, status: "read" }
            : q
        )
      );
    }
    closeModal();
  };

  const markInquiryRead = (id) =>
    setInquiries((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "read" } : q))
    );

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
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">
            Customer Engagement
          </h1>
          <p className="text-xs text-gray-600">
            Manage reviews and customer inquiries
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI label="Total Reviews" value={kpis.totalReviews} icon="⭐" />
        <KPI label="Inquiries" value={kpis.totalInquiries} icon="💬" />
        <KPI
          label="Unread"
          value={kpis.unread}
          icon="❗"
          accent="text-red-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Reviews */}
        <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
          <div className="px-5 py-4 border-b border-[var(--line-amber)]">
            <h3 className="font-semibold text-[var(--brown-700)]">
              Recent Reviews
            </h3>
            <p className="text-xs text-gray-600">
              Customer feedback on your products
            </p>
          </div>

          <ul className="p-4 space-y-4">
            {reviews.map((r) => (
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
                  <StatusPill
                    color={r.status === "replied" ? "green" : "amber"}
                  >
                    {r.status === "replied" ? "Replied" : "Pending"}
                  </StatusPill>
                </div>

                <div className="mt-1 text-xs text-gray-600">{r.product}</div>

                <Stars n={r.rating} />

                <p className="mt-2 text-sm text-[var(--brown-700)]">{r.text}</p>

                {r.reply && (
                  <div className="mt-3 rounded-lg border border-[var(--line-amber)] bg-white p-3 text-sm">
                    <div className="text-gray-600 mb-1">Your reply</div>
                    <div className="text-[var(--brown-700)]">{r.reply}</div>
                  </div>
                )}

                <div className="mt-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-amber)] px-3 py-1.5 text-sm hover:bg-[var(--cream-50)]"
                    onClick={() => openReply("review", r.id, r.reply || "")}
                  >
                    📝 {r.reply ? "Edit Reply" : "Reply"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Inquiries */}
        <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
          <div className="px-5 py-4 border-b border-[var(--line-amber)]">
            <h3 className="font-semibold text-[var(--brown-700)]">
              Customer Inquiries
            </h3>
            <p className="text-xs text-gray-600">
              Questions and requests from customers
            </p>
          </div>

          <ul className="p-4 space-y-4">
            {inquiries.map((q) => (
              <li
                key={q.id}
                className="rounded-xl border border-[var(--line-amber)] bg-[var(--amber-50)]/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[var(--brown-700)] text-sm">
                    {q.customer}
                    <span className="text-xs text-gray-600 ml-2">
                      {new Date(q.dateISO).toLocaleDateString()}
                    </span>
                  </div>
                  <StatusPill color={q.status === "unread" ? "rose" : "green"}>
                    {q.status === "unread" ? "Unread" : "Read"}
                  </StatusPill>
                </div>

                <div className="mt-1 font-medium text-[var(--brown-700)]">
                  {q.subject}
                </div>
                <p className="text-sm text-gray-700 mt-1">{q.message}</p>

                {q.reply && (
                  <div className="mt-3 rounded-lg border border-[var(--line-amber)] bg-white p-3 text-sm">
                    <div className="text-gray-600 mb-1">Your response</div>
                    <div className="text-[var(--brown-700)]">{q.reply}</div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {q.status === "unread" && (
                    <button
                      className="rounded-lg border border-[var(--line-amber)] px-3 py-1.5 text-sm hover:bg-[var(--cream-50)]"
                      onClick={() => markInquiryRead(q.id)}
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    className="rounded-lg bg-[var(--orange-600)] text-white px-3 py-1.5 text-sm hover:brightness-95"
                    onClick={() => openReply("inquiry", q.id, q.reply || "")}
                  >
                    Respond
                  </button>
                </div>
              </li>
            ))}
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
