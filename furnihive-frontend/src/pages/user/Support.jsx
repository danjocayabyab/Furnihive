import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import toast from "react-hot-toast";
import { createSupportTicket } from "../../lib/supportApi";
import { supabase } from "../../lib/supabaseClient";

const CATEGORIES = ["orders", "payments", "account", "seller", "other"];
export default function UserSupport() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("account");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth();
   const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [threadById, setThreadById] = useState({});
  const [loadingThreadId, setLoadingThreadId] = useState(null);
  const [replyById, setReplyById] = useState({});

  const loadTickets = async () => {
    if (!user?.id) return;
    try {
      setLoadingTickets(true);
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, category, status, created_at, message, type")
        .eq("user_id", user.id)
        .eq("type", "buyer")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (e) {
      // soft-fail
      console.warn("Failed to load support tickets", e);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please provide both a subject and message.");
      return;
    }
    try {
      setSubmitting(true);
      const md = user?.user_metadata || {};
      await createSupportTicket({
        userId: user?.id || null,
        type: "buyer",
        subject,
        category,
        priority: "normal",
        message,
        email: user?.email || md.email || null,
        name:
          profile?.first_name || profile?.last_name
            ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
            : md.full_name || md.name || null,
      });
      toast.success("Your support ticket has been submitted.");
      setSubject("");
      setMessage("");
      setCategory("account");
      loadTickets();
    } catch (e) {
      toast.error(e?.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">Customer Support</h1>
          <p className="text-xs text-gray-600">Send a ticket about your account, orders, or suspension.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line-amber)] bg-white px-5 py-4 shadow-card">
        <h2 className="text-lg font-semibold text-[var(--brown-700)] mb-2">Contact our team</h2>
        <p className="text-sm text-[var(--brown-700)]/80 mb-3">
          If you have questions about your account, orders, or need help with a suspension, please send us a ticket below.
        </p>
        
      </div>

      <div className="rounded-2xl border border-[var(--line-amber)] bg-white px-5 py-4 shadow-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--brown-700)] mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none"
              placeholder="Summarize what you need help with"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--brown-700)] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--brown-700)] mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none min-h-[140px] resize-none"
            placeholder="Describe the issue or question in as much detail as possible"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-xl bg-[var(--orange-600)] px-4 py-2.5 text-white text-sm font-medium hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit ticket"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line-amber)] bg-white px-5 py-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--brown-700)]">My Tickets</h2>
          {loadingTickets && (
            <span className="text-xs text-[var(--brown-700)]/60">Loading…</span>
          )}
        </div>

        {tickets.length === 0 && !loadingTickets && (
          <p className="text-sm text-[var(--brown-700)]/70">You haven't submitted any tickets yet.</p>
        )}

        <div className="space-y-2">
          {tickets.map((t) => {
            const created = t.created_at
              ? new Date(t.created_at).toLocaleString("en-PH", { month: "short", day: "numeric" })
              : "";
            const isActive = activeTicketId === t.id;
            const thread = threadById[t.id] || [];
            const loadingThread = loadingThreadId === t.id;
            return (
              <div
                key={t.id}
                className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)]/60 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-[var(--brown-700)] truncate">{t.subject}</div>
                    <div className="text-[11px] text-[var(--brown-700)]/60">
                      {created} • <span className="capitalize">{t.category}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[11px] px-2 py-[2px] rounded-full border border-[var(--line-amber)] bg-white capitalize text-[var(--brown-700)]">
                      {t.status || "open"}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const nextActive = isActive ? null : t.id;
                        setActiveTicketId(nextActive);
                        if (!nextActive) return;
                        try {
                          setLoadingThreadId(nextActive);
                          const { data, error } = await supabase
                            .from("support_messages")
                            .select("author_type, body, created_at")
                            .eq("ticket_id", nextActive)
                            .order("created_at", { ascending: true });
                          if (error) throw error;
                          const mapped = (data || []).map((m) => ({
                            by: m.author_type,
                            at: m.created_at
                              ? new Date(m.created_at).toLocaleString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "",
                            text: m.body || "",
                          }));
                          setThreadById((prev) => ({ ...prev, [nextActive]: mapped }));
                        } catch (e) {
                          console.warn("Failed to load support thread", e);
                        } finally {
                          setLoadingThreadId(null);
                        }
                      }}
                      className="text-xs px-3 py-1 rounded-lg border border-[var(--line-amber)] bg-white text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
                    >
                      {isActive ? "Hide conversation" : "View conversation"}
                    </button>
                  </div>
                </div>

                {isActive && (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-lg border border-[var(--line-amber)] bg-white max-h-56 overflow-auto p-3 space-y-2 text-sm">
                      {loadingThread && (
                        <div className="text-xs text-[var(--brown-700)]/60">Loading conversation…</div>
                      )}
                      {!loadingThread && thread.length === 0 && t.message && (
                        <div className="flex justify-end">
                          <div className="max-w-[80%] rounded-xl px-3 py-2 border text-xs md:text-[13px] bg-[var(--cream-50)] text-[var(--brown-700)] border-[var(--line-amber)]">
                            <div className="text-[10px] opacity-70 mb-0.5">
                              You
                              {t.created_at
                                ? ` • ${new Date(t.created_at).toLocaleString("en-PH", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`
                                : ""}
                            </div>
                            <div className="whitespace-pre-wrap">{t.message}</div>
                          </div>
                        </div>
                      )}
                      {!loadingThread &&
                        thread.map((m, idx) => {
                          const mine = m.by === "buyer";
                          const fromAdmin = m.by === "admin";
                          return (
                            <div
                              key={idx}
                              className={`flex ${mine ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-xl px-3 py-2 border text-xs md:text-[13px] ${
                                  fromAdmin
                                    ? "bg-[var(--amber-100)] text-[var(--brown-700)] border-[var(--line-amber)]"
                                    : "bg-[var(--cream-50)] text-[var(--brown-700)] border-[var(--line-amber)]"
                                }`}
                              >
                                <div className="text-[10px] opacity-70 mb-0.5">
                                  {fromAdmin ? "Admin" : "You"}
                                  {m.at ? ` • ${m.at}` : ""}
                                </div>
                                <div className="whitespace-pre-wrap">{m.text}</div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex items-end gap-2">
                      <textarea
                        value={replyById[t.id] || ""}
                        onChange={(e) =>
                          setReplyById((prev) => ({ ...prev, [t.id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Write a reply to support…"
                        className="flex-1 rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const text = (replyById[t.id] || "").trim();
                          if (!text) return;
                          try {
                            const now = new Date();
                            const stamp = now.toLocaleString("en-PH", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            const { error } = await supabase.from("support_messages").insert({
                              ticket_id: t.id,
                              author_type: "buyer",
                              body: text,
                            });
                            if (error) throw error;
                            const newMsg = { by: "buyer", at: stamp, text };
                            setThreadById((prev) => ({
                              ...prev,
                              [t.id]: [...(prev[t.id] || []), newMsg],
                            }));
                            setReplyById((prev) => ({ ...prev, [t.id]: "" }));
                          } catch (e) {
                            toast.error(e?.message || "Failed to send reply.");
                          }
                        }}
                        className="h-9 px-3 rounded-lg bg-[var(--orange-600)] text-white text-xs md:text-sm font-medium hover:brightness-95"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
