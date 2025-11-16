// src/admin/CustomerSupportPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { addNotification } from "./lib/notifications";
import { supabase } from "../lib/supabaseClient";

/* ---------- Helpers ---------- */
const peso = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

const STATUS_STYLES = {
  open: "bg-amber-100 text-amber-900 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-green-100 text-green-700 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const PRIORITY_STYLES = {
  low: "bg-gray-100 text-gray-700 border-gray-200",
  normal: "bg-purple-100 text-purple-700 border-purple-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

const CATEGORIES = ["orders", "payments", "account", "seller", "other"];
const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];

/* ---------- Seed ---------- */
// We now load tickets from the support_tickets table but keep the same shape used by the UI.
// SEED is left as an empty array fallback.
const SEED = [];

/* ---------- Small UI ---------- */
function Pill({ cls, children }) {
  return <span className={`text-[11px] px-2 py-[2px] rounded-full border capitalize ${cls}`}>{children}</span>;
}
const StatusPill = ({ status }) => <Pill cls={STATUS_STYLES[status] || STATUS_STYLES.open}>{status.replace("_", " ")}</Pill>;
const PriorityPill = ({ priority }) => <Pill cls={PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal}>{priority}</Pill>;

function Toast({ show, message, onClose }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [show, onClose]);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 z-[70] top-[75px]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="float-right rounded-xl bg-white border border-[var(--line-amber)] shadow-card px-4 py-3 flex items-start gap-2 min-w-[280px]">
          <span className="mt-0.5 h-5 w-5 grid place-items-center rounded-full bg-[var(--amber-400)]/25 border border-[var(--line-amber)]">✔</span>
          <div className="text-sm text-[var(--brown-700)]">{message}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Row ---------- */
function TicketRow({ t, onView }) {
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-gradient-to-br from-[#fffdf5] to-[#fffaf0] px-5 py-4 shadow-sm">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 min-w-0">
          <div className="font-semibold text-[var(--brown-700)] truncate">{t.subject}</div>
          <div className="text-[11px] text-[var(--brown-700)]/70">{t.customer} • {t.email}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill cls="bg-amber-50 text-amber-900 border-[var(--line-amber)]/70">{t.category}</Pill>
            <StatusPill status={t.status} />
            <PriorityPill priority={t.priority} />
          </div>
        </div>
        <div className="col-span-3">
          <div className="text-[11px] text-[var(--brown-700)]/60">Created</div>
          <div className="text-[var(--brown-700)]">{t.createdAt}</div>
          {t.orderId && (
            <>
              <div className="mt-2 text-[11px] text-[var(--brown-700)]/60">Order</div>
              <div className="text-[var(--brown-700)]">{t.orderId}</div>
            </>
          )}
        </div>
        <div className="col-span-3 flex items-start justify-end">
          <div className="flex flex-col items-end gap-2">
            {t.amount ? <div className="text-[11px] text-[var(--brown-700)]/60 text-right">Order Amount</div> : null}
            {t.amount ? <div className="text-[var(--orange-600)] font-semibold">{peso(t.amount)}</div> : null}
            <button onClick={() => onView(t)} className="h-9 px-3 rounded-lg bg-white border border-[var(--line-amber)] text-sm hover:bg-[var(--cream-50)]">View</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Modal ---------- */
function TicketDetailsModal({ open, onClose, ticket, onReply, onUpdateStatus, onUpdatePriority }) {
  const [msg, setMsg] = useState("");
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, ticket]);

  if (!open || !ticket) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white border border-[var(--line-amber)] shadow-md overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-[var(--line-amber)]">
            <div className="text-base font-semibold text-[var(--brown-700)]">Ticket Details</div>
            <div className="text-sm text-[var(--brown-700)]/70 truncate">{ticket.subject}</div>
          </div>

          <div className="px-6 py-4">
            <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-[var(--brown-700)]/60">Ticket ID</div>
                <div className="font-medium text-[var(--brown-700)]">{ticket.ticketCode || ticket.id}</div>
              </div>
              <div className="flex gap-2 items-end justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--brown-700)]/60">Status</span>
                  <select value={ticket.status} onChange={(e) => onUpdateStatus(e.target.value)} className="h-8 rounded-lg border border-[var(--line-amber)] bg-white px-2 text-sm">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--brown-700)]/60">Priority</span>
                  <select value={ticket.priority} onChange={(e) => onUpdatePriority(e.target.value)} className="h-8 rounded-lg border border-[var(--line-amber)] bg-white px-2 text-sm">
                    {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[var(--brown-700)]/60">From</div>
                <div className="font-medium text-[var(--brown-700)]">{ticket.customer}</div>
                <div className="text-[12px] text-[var(--brown-700)]/70">{ticket.email}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--brown-700)]/60">Created</div>
                <div className="font-medium text-[var(--brown-700)]">{ticket.createdAt}</div>
              </div>

              {ticket.orderId && (
                <>
                  <div>
                    <div className="text-[11px] text-[var(--brown-700)]/60">Order</div>
                    <div className="font-medium text-[var(--brown-700)]">{ticket.orderId}</div>
                    {ticket.seller && <div className="text-[12px] text-[var(--brown-700)]/70">{ticket.seller}</div>}
                  </div>
                  {ticket.amount ? (
                    <div className="text-right">
                      <div className="text-[11px] text-[var(--brown-700)]/60">Amount</div>
                      <div className="font-medium text-[var(--orange-600)]">{peso(ticket.amount)}</div>
                    </div>
                  ) : <div />}
                </>
              )}
            </div>
          </div>

          <div className="px-6">
            <div ref={scrollerRef} className="rounded-xl border border-[var(--line-amber)] bg-white h-64 overflow-auto p-4 space-y-3">
              {ticket.thread.map((m, idx) => {
                const mine = m.by === "admin";
                return (
                  <div key={idx} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm border ${
                      mine ? "bg-[var(--amber-100)] text-[var(--brown-700)] border-[var(--line-amber)]"
                           : "bg-[var(--cream-50)] text-[var(--brown-700)] border-[var(--line-amber)]"}`}>
                      <div className="text-[11px] opacity-70 mb-0.5">
                        {m.by === "admin" ? "Admin" : m.by === "seller" ? "Seller" : "Customer"} • {m.at}
                      </div>
                      <div className="whitespace-pre-wrap">{m.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-end gap-2">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 min-h-[68px] rounded-xl border border-[var(--line-amber)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
              />
              <button
                onClick={() => { if (!msg.trim()) return; onReply(msg.trim()); setMsg(""); }}
                className="h-10 px-4 rounded-lg bg-[var(--orange-600)] text-white text-sm hover:opacity-95"
              >
                Send
              </button>
            </div>
          </div>

          <div className="px-6 py-3 border-t border-[var(--line-amber)] flex justify-end">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[var(--line-amber)] bg-white hover:bg-[var(--cream-50)]">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tiles ---------- */
function StatTile({ value, label, tint = "amber" }) {
  const bgMap = {
    amber: "from-[#fff7e6] to-[#fff3d6]",
    blue: "from-[#eef6ff] to-[#eaf3ff]",
    green: "from-[#effdf3] to-[#e9faef]",
    gray: "from-[#f9fafb] to-[#f3f4f6]",
  };
  return (
    <div className={`rounded-xl border border-[var(--line-amber)] bg-gradient-to-br ${bgMap[tint]} shadow-sm`}>
      <div className="px-5 py-4">
        <div className="text-2xl font-semibold text-[var(--brown-700)] text-center leading-none">{value}</div>
        <div className="text-xs text-[var(--brown-700)]/70 text-center mt-1">{label}</div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState(SEED);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const [current, setCurrent] = useState(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  // Load tickets from support_tickets on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, type, subject, category, status, priority, created_at, customer_name, customer_email, message")
        .order("created_at", { ascending: false });
      if (error || !data || cancelled) return;

      const mapped = data.map((row) => {
        const rawId = String(row.id || "");
        const ticketCode = rawId
          ? `TCK-${rawId.replace(/-/g, "").slice(0, 8).toUpperCase()}`
          : "TCK-UNKNOWN";
        const createdAt = row.created_at
          ? new Date(row.created_at).toLocaleDateString("en-PH")
          : "";
        const initialMsg = {
          by: row.type === "seller" ? "seller" : "customer",
          at: row.created_at
            ? new Date(row.created_at).toLocaleString("en-PH", { hour: "2-digit", minute: "2-digit" })
            : "",
          text: row.message || "",
        };
        return {
          id: row.id,
          ticketCode,
          subject: row.subject,
          category: row.category,
          status: row.status || "open",
          priority: row.priority || "normal",
          createdAt,
          customer: row.customer_name || "",
          email: row.customer_email || "",
          orderId: null,
          seller: row.type === "seller" ? row.customer_name || "Seller" : null,
          amount: null,
          thread: [initialMsg],
        };
      });

      setTickets(mapped);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    for (const t of tickets) c[t.status] = (c[t.status] || 0) + 1;
    return c;
  }, [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const hay = `${t.subject} ${t.customer} ${t.email} ${t.id} ${t.orderId || ""}`.toLowerCase();
      const matchesQ = hay.includes(q.trim().toLowerCase());
      const matchesCat = cat === "all" ? true : t.category === cat;
      const matchesStatus = status === "all" ? true : t.status === status;
      const matchesPri = priority === "all" ? true : t.priority === priority;
      return matchesQ && matchesCat && matchesStatus && matchesPri;
    });
  }, [tickets, q, cat, status, priority]);

  const handleView = async (t) => {
    setCurrent(t);
    setOpen(true);

    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("author_type, body, created_at")
        .eq("ticket_id", t.id)
        .order("created_at", { ascending: true });

      if (error || !data) return;

      const thread = data.map((m) => ({
        by: m.author_type === "admin" ? "admin" : m.author_type === "seller" ? "seller" : "customer",
        at: m.created_at
          ? new Date(m.created_at).toLocaleString("en-PH", { hour: "2-digit", minute: "2-digit" })
          : "",
        text: m.body || "",
      }));

      setCurrent((prev) => (prev && prev.id === t.id ? { ...prev, thread } : prev));
      setTickets((prev) => prev.map((row) => (row.id === t.id ? { ...row, thread } : row)));
    } catch (e) {
      // On failure we keep the initial thread from ticket creation.
      console.warn("Failed to load support messages", e);
    }
  };
  const updateTicket = (id, patch) => setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <>
      {/* Banners */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatTile value={counts.open || 0} label="Open" tint="amber" />
        <StatTile value={counts.in_progress || 0} label="In Progress" tint="blue" />
        <StatTile value={counts.resolved || 0} label="Resolved" tint="green" />
        <StatTile value={counts.closed || 0} label="Closed" tint="gray" />
      </div>

      {/* Container */}
      <section className="rounded-xl border border-[var(--line-amber)] bg-white shadow-card">
        <div className="px-5 py-3 border-b border-[var(--line-amber)]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-[var(--brown-700)]">Customer Support</div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tickets, users, orders..."
              className="h-9 w-[240px] md:w-[280px] rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm placeholder:text-[var(--brown-700)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
            />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm">
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm">
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm">
              <option value="all">All Priority</option>
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {filtered.length ? filtered.map((t) => <TicketRow key={t.id} t={t} onView={handleView} />)
                           : <div className="py-12 text-center text-[var(--brown-700)]/60">No tickets found.</div>}
        </div>
      </section>

      <TicketDetailsModal
        open={open}
        onClose={() => setOpen(false)}
        ticket={current}
        onReply={async (text) => {
          if (!current) return;
          const now = new Date();
          const stamp =
            now.toLocaleDateString("en-PH") +
            " " +
            now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
          try {
            await supabase.from("support_messages").insert({
              ticket_id: current.id,
              author_type: "admin",
              body: text,
            });

            updateTicket(current.id, { thread: [...current.thread, { by: "admin", at: stamp, text }] });
            setCurrent((c) =>
              c && c.id === current.id
                ? { ...c, thread: [...(c.thread || []), { by: "admin", at: stamp, text }] }
                : c
            );
            setToast({ show: true, message: `Reply sent to ${current.customer}` });

            // 🔔 notify
            addNotification({
              title: "Reply sent",
              body: `${current.id} • ${current.customer}`,
              type: "success",
              link: "/admin?tab=support",
            });
          } catch (e) {
            setToast({ show: true, message: e?.message || "Failed to send reply" });
          }
        }}
        onUpdateStatus={async (newStatus) => {
          if (!current) return;
          try {
            await supabase
              .from("support_tickets")
              .update({ status: newStatus })
              .eq("id", current.id);

            updateTicket(current.id, { status: newStatus });
            setCurrent((c) => ({ ...c, status: newStatus }));
            setToast({ show: true, message: `Ticket ${current.id} marked as ${newStatus.replace("_", " ")}` });

            // 🔔 notify
            addNotification({
              title: "Ticket status updated",
              body: `${current.id} → ${newStatus.replace("_", " ")}`,
              type: newStatus === "resolved" ? "success" : newStatus === "closed" ? "info" : "warning",
              link: "/admin?tab=support",
            });
          } catch (e) {
            setToast({ show: true, message: e?.message || "Failed to update status" });
          }
        }}
        onUpdatePriority={async (newPriority) => {
          if (!current) return;
          try {
            await supabase
              .from("support_tickets")
              .update({ priority: newPriority })
              .eq("id", current.id);

            updateTicket(current.id, { priority: newPriority });
            setCurrent((c) => ({ ...c, priority: newPriority }));
            setToast({ show: true, message: `Ticket ${current.id} priority set to ${newPriority}` });

            // 🔔 notify
            addNotification({
              title: "Ticket priority changed",
              body: `${current.id} → ${newPriority}`,
              type: newPriority === "urgent" ? "warning" : "info",
              link: "/admin?tab=support",
            });
          } catch (e) {
            setToast({ show: true, message: e?.message || "Failed to update priority" });
          }
        }}
      />

      <Toast show={toast.show} message={toast.message} onClose={() => setToast({ show: false, message: "" })} />
    </>
  );
}
