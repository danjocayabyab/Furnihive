// src/pages/user/Messages.jsx
import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

/** Mock data (same as before) */
const MOCK_THREADS = [
  {
    id: "t1",
    name: "Manila Furniture Co.",
    role: "seller",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
    last: "Hi! The sofa is available for delivery this week…",
    time: "10:40 AM",
    online: true,
    unread: 0,
  },
  {
    id: "t2",
    name: "Cebu Woodworks",
    role: "seller",
    avatar:
      "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=300&auto=format&fit=crop",
    last: "Thank you for your purchase! Your dining set will be…",
    time: "Yesterday",
    online: false,
    unread: 0,
  },
  {
    id: "t3",
    name: "Davao Sleep Solutions",
    role: "seller",
    avatar:
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=300&auto=format&fit=crop",
    last: "We have a 20% discount on bed frames this week!",
    time: "Mon",
    online: true,
    unread: 0,
  },
];

const MOCK_MSGS = [
  { id: 1, from: "me",     text: "Hello! I'm interested in the Modern Sectional Sofa. Is it still available?", time: "10:30 AM" },
  { id: 2, from: "seller", text: "Hi there! Yes, the sofa is still available. It's one of our best sellers!",  time: "10:35 AM" },
  { id: 3, from: "me",     text: "Great! Can you tell me more about the delivery options?",                  time: "10:37 AM" },
  { id: 4, from: "seller", text: "Hi! The sofa is available for delivery this week. What's your preferred schedule?", time: "10:40 AM" },
];

export default function Messages() {
  const [threads, setThreads] = useState(MOCK_THREADS);
  const [activeId, setActiveId] = useState(MOCK_THREADS[0].id);
  const [chat, setChat] = useState(MOCK_MSGS);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [sp] = useSearchParams();

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) || threads[0],
    [threads, activeId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.name.toLowerCase().includes(q));
  }, [threads, query]);

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    setChat((c) => [...c, { id: Date.now(), from: "me", text: txt, time: "Now" }]);
    setInput("");
    // TODO: POST /messages/:threadId
  };

  /** Prefill from Product Detail:
   * /messages?seller=Manila%20Furniture%20Co.&product=Modern%20Sectional%20Sofa&prefill=Hi...
   */
  useEffect(() => {
    const seller = sp.get("seller");
    const prefill = sp.get("prefill");
    if (!seller) return;

    const found = threads.find(
      (t) => t.name.toLowerCase() === seller.toLowerCase()
    );
    if (found) {
      setActiveId(found.id);
    } else {
      const id = `t-${Date.now()}`;
      const newThread = {
        id,
        name: seller,
        role: "seller",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
        last: "",
        time: "Now",
        online: true,
        unread: 0,
      };
      setThreads((prev) => [newThread, ...prev]);
      setActiveId(id);
    }
    if (prefill) setInput(prefill);
  }, [sp, threads]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/home" className="text-sm text-[var(--orange-600)] hover:underline">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-2">
            
            <h1 className="text-xl font-semibold text-[var(--brown-700)]">Messages</h1>
            <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-[var(--orange-600)] px-1.5 text-[11px] font-semibold text-white">
              {threads.reduce((n, t) => n + t.unread, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2-pane layout */}
      <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
        {/* Left: conversations */}
        <aside className="rounded-2xl border border-[var(--line-amber)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--line-amber)] px-4 py-3">
          
            <div className="font-medium text-[var(--brown-700)]">Conversations</div>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
              <span className="text-[var(--orange-700)]"></span>
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Search conversations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="max-h-[66vh] overflow-y-auto">
            {filtered.map((t) => (
              <li
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`cursor-pointer px-4 py-3 border-t border-[var(--line-amber)]/60 first:border-t-0 ${
                  activeId === t.id ? "bg-[var(--amber-50)]" : "hover:bg-[var(--cream-50)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover border border-[var(--line-amber)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium text-[var(--brown-700)]">
                        {t.name}
                      </div>
                      <span className="rounded-full border border-[var(--line-amber)] bg-[var(--amber-50)] px-1.5 text-[10px] text-[var(--orange-700)]">
                        {t.role}
                      </span>
                      {t.online && <span className="ml-1 h-2 w-2 rounded-full bg-emerald-500" />}
                    </div>
                    <div className="truncate text-sm text-gray-600">{t.last}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right: chat */}
        <section className="rounded-2xl border border-[var(--line-amber)] bg-white grid grid-rows-[auto,1fr,auto]">

          {/* Chat header */}
<div className="flex items-center justify-between border-b border-[var(--line-amber)] px-4 py-3">
  <div className="flex items-center gap-3">
    <img
      src={active.avatar}
      alt={active.name}
      className="h-9 w-9 rounded-full object-cover border border-[var(--line-amber)]"
    />
    <div>
      <div className="flex items-center gap-2">
        <div className="font-medium text-[var(--brown-700)]">{active.name}</div>
        <span className="rounded-full border border-[var(--line-amber)] bg-[var(--amber-50)] px-1.5 text-[10px] text-[var(--orange-700)]">
          {active.role}
        </span>
        {active.online && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
          </span>
        )}
      </div>
    </div>
  </div>

  
</div>


          {/* Chat body */}
          <div className="h-[60vh] overflow-y-auto p-4">
            {chat.map((m) => (
              <MessageBubble key={m.id} mine={m.from === "me"} time={m.time} text={m.text} />
            ))}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-[var(--line-amber)] px-3 py-3">
            <button className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line-amber)] hover:bg-[var(--cream-50)]" title="Attach">
              📎
            </button>
            <div className="flex-1">
              <input
                className="w-full rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-4 py-2 text-sm outline-none"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line-amber)] hover:bg-[var(--cream-50)]" title="Emoji">
              😊
            </button>
            <button
              onClick={send}
              className="grid h-10 w-10 place-items-center rounded-full bg-[var(--orange-600)] text-white hover:brightness-95"
              title="Send"
            >
              ➤
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MessageBubble({ mine, text, time }) {
  return (
    <div className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl border px-3 py-2 text-sm ${
          mine
            ? "bg-[var(--orange-600)] text-white border-[var(--orange-500)]"
            : "bg-[var(--cream-50)] text-[var(--brown-700)] border-[var(--line-amber)]"
        }`}
      >
        <div className="whitespace-pre-wrap">{text}</div>
        <div className={`mt-1 text-[10px] ${mine ? "text-white/90" : "text-gray-600"}`}>
          {time}
        </div>
      </div>
    </div>
  );
}


