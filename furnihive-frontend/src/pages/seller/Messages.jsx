import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Seller Messages
 *  - Left: conversation list with search + unread badge
 *  - Right: chat thread with send box
 *  - Designed for smooth backend integration (see "API hooks" section)
 */

const demoConversations = [
  {
    id: "c_maria",
    buyerName: "Maria Santos",
    buyerRole: "buyer",
    lastSnippet: "Perfect! I'll take it. Can you deliver it by Friday?",
    lastAt: Date.now() - 5 * 60 * 1000,
    unread: 3,
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&fit=crop&crop=faces",
  },
  {
    id: "c_juan",
    buyerName: "Juan dela Cruz",
    buyerRole: "buyer",
    lastSnippet: "Thank you! Looking forward to receiving my order.",
    lastAt: Date.now() - 2 * 60 * 60 * 1000,
    unread: 0,
    avatar:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=96&h=96&fit=crop&crop=faces",
  },
  {
    id: "c_lisa",
    buyerName: "Lisa Chen",
    buyerRole: "buyer",
    lastSnippet: "Do you have this in a different color?",
    lastAt: Date.now() - 24 * 60 * 60 * 1000,
    unread: 0,
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=faces",
  },
  {
    id: "c_robert",
    buyerName: "Robert Tan",
    buyerRole: "buyer",
    lastSnippet: "Great! I'll visit your showroom this weekend.",
    lastAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    unread: 0,
    avatar:
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=96&h=96&fit=crop&crop=faces",
  },
];

const demoMessages = {
  c_maria: [
    msg("customer", "Hi! I'm interested in the Modern Sectional Sofa. Is it still available?", "10:30 AM"),
    msg("seller", "Hello Maria! Yes, the sofa is still available. It's one of our best sellers!", "10:35 AM"),
    msg("customer", "Great! Can you tell me more about the delivery options?", "10:37 AM"),
    msg("seller", "We offer free delivery within Metro Manila! Usually takes 3–5 business days.", "10:40 AM"),
    msg("customer", "Perfect! I'll take it. Can you deliver it by Friday?", "10:42 AM"),
  ],
  c_juan: [msg("customer", "Thank you! Looking forward to receiving my order.", "8:10 AM")],
  c_lisa: [msg("customer", "Do you have this in a different color?", "1:05 PM")],
  c_robert: [msg("customer", "Great! I'll visit your showroom this weekend.", "9:12 AM")],
};

function msg(sender, text, timeLabel) {
  return { id: cryptoRandom(), sender, text, timeLabel, createdAt: Date.now() };
}

function cryptoRandom() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export default function SellerMessages() {
  const navigate = useNavigate();

  // ---- state
  const [threads, setThreads] = useState(demoConversations);
  const [activeId, setActiveId] = useState(demoConversations[0].id);
  const [messagesById, setMessagesById] = useState(demoMessages);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const listEndRef = useRef(null);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId),
    [threads, activeId]
  );

  const msgs = messagesById[activeId] || [];

  useEffect(() => {
    // Scroll to latest message whenever thread or messages change.
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, msgs.length]);

  // ------- API hooks (swap the internals when backend is ready)
  const api = {
    // fetch conversation list
    async loadConversations() {
      // const res = await fetch('/api/seller/conversations');
      // setThreads(await res.json());
      setThreads((t) => t); // demo no-op
    },
    // fetch a single thread
    async loadThread(threadId) {
      // const res = await fetch(`/api/seller/conversations/${threadId}`);
      // setMessagesById((prev) => ({ ...prev, [threadId]: await res.json() }));
      setMessagesById((prev) => ({ ...prev })); // demo no-op
    },
    // mark as read
    async markRead(threadId) {
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t))
      );
      // await fetch(`/api/seller/conversations/${threadId}/read`, { method: 'POST' });
    },
    // send message (supports WebSocket later)
    async send(threadId, body) {
      // optimistic update
      setMessagesById((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), msg("seller", body, timeNow())],
      }));
      updateSnippet(threadId, body);

      // await fetch(`/api/seller/conversations/${threadId}/messages`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text: body }),
      // });
    },
  };

  function timeNow() {
    const d = new Date();
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${m} ${ampm}`;
    }

  function updateSnippet(threadId, lastText) {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, lastSnippet: lastText, lastAt: Date.now() }
          : t
      )
    );
  }

  function onPickThread(id) {
    setActiveId(id);
    api.markRead(id);
    api.loadThread(id);
  }

  const filteredThreads = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return threads;
    return threads.filter(
      (t) =>
        t.buyerName.toLowerCase().includes(s) ||
        t.lastSnippet.toLowerCase().includes(s)
    );
  }, [threads, query]);

  async function onSend(e) {
    e?.preventDefault?.();
    const trimmed = text.trim();
    if (!trimmed) return;
    await api.send(activeId, trimmed);
    setText("");
  }

  // ---- UI
  return (
    <div className="max-w-6xl mx-auto px-4 py-5">
      {/* header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/seller")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
        >
          ←
        </button>
        <h1 className="text-xl font-semibold text-[var(--brown-700)]">
          Messages
        </h1>
        {totalUnread(threads) > 0 && (
          <span className="ml-2 rounded-full bg-[var(--orange-600)] text-white text-xs px-2 py-0.5">
            {totalUnread(threads)}
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-[320px,1fr] gap-4">
        {/* left: conversation list */}
        <aside className="rounded-2xl border border-[var(--line-amber)] bg-white p-3">
          <div className="px-2 pb-3">
            <div className="font-medium text-[var(--brown-700)] mb-2">
              Customer Conversations
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
              <span>🔎</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-[var(--line-amber)]/70">
            {filteredThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => onPickThread(t.id)}
                className={`w-full text-left p-3 flex gap-3 hover:bg-[var(--cream-50)] ${
                  activeId === t.id ? "bg-[var(--amber-50)]" : ""
                }`}
              >
                <img
                  src={t.avatar}
                  className="h-10 w-10 rounded-full object-cover border border-[var(--line-amber)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-[var(--brown-700)] truncate">
                      {t.buyerName}
                    </div>
                    <span className="text-[10px] rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 border border-blue-200">
                      {t.buyerRole}
                    </span>
                    {t.unread > 0 && (
                      <span className="ml-auto text-[10px] rounded-full bg-[var(--orange-600)] text-white px-1.5 py-0.5">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {t.lastSnippet}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {relativeTime(t.lastAt)}
                  </div>
                </div>
              </button>
            ))}

            {filteredThreads.length === 0 && (
              <div className="p-6 text-sm text-gray-600 text-center">
                No conversations found.
              </div>
            )}
          </div>
        </aside>

        {/* right: thread */}
        <section className="rounded-2xl border border-[var(--line-amber)] bg-white flex flex-col">
          {/* thread header */}
          <div className="p-4 border-b border-[var(--line-amber)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={active?.avatar}
                className="h-9 w-9 rounded-full object-cover border border-[var(--line-amber)]"
              />
              <div>
                <div className="font-medium text-[var(--brown-700)] leading-tight">
                  {active?.buyerName}
                </div>
                <div className="text-[11px] text-green-700">Online</div>
              </div>
            </div>
            {/* quick actions (icons only UI) */}
            <div className="flex items-center gap-3 text-[var(--orange-700)]">
              <span title="Call">📞</span>
              <span title="Open in CRM">🗂️</span>
              <span title="More">⋯</span>
            </div>
          </div>

          {/* message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m) => (
              <ChatBubble key={m.id} mine={m.sender === "seller"} m={m} />
            ))}
            <div ref={listEndRef} />
          </div>

          {/* composer */}
          <form
            onSubmit={onSend}
            className="p-3 border-t border-[var(--line-amber)] flex items-center gap-2"
          >
            <span className="text-[var(--orange-700)]">🧷</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-4 py-2 text-sm outline-none"
            />
            <button
              type="button"
              className="rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm hover:bg-[var(--cream-50)]"
              title="Emoji"
            >
              🙂
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95"
              title="Send"
            >
              ➤
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */

function ChatBubble({ mine, m }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-xl px-4 py-2 text-sm shadow-sm border ${
          mine
            ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)]"
            : "bg-[var(--cream-50)] text-[var(--brown-700)] border-[var(--line-amber)]"
        }`}
      >
        <div>{m.text}</div>
        <div
          className={`mt-1 text-[10px] ${
            mine ? "text-white/80" : "text-gray-600"
          }`}
        >
          {m.timeLabel}
        </div>
      </div>
    </div>
  );
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hours ago`;
  const d = Math.round(h / 24);
  return `${d} days ago`;
}

function totalUnread(list) {
  return list.reduce((n, t) => n + (t.unread || 0), 0);
}
