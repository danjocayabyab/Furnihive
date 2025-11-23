import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import { addNotification } from "../../seller/lib/notifications.js";

/**
 * Seller Messages
 *  - Left: conversation list with search + unread badge
 *  - Right: chat thread with send box
 *  - Designed for smooth backend integration (see "API hooks" section)
 */

// demoConversations/demoMessages are no longer used; data now comes from Supabase

function msg(sender, text, timeLabel, extra = {}) {
  return { id: cryptoRandom(), sender, text, timeLabel, createdAt: Date.now(), ...extra };
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
  const { user } = useAuth();
  const sellerId = user?.id;

  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messagesById, setMessagesById] = useState({});
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const listEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );

  const msgs = messagesById[activeId] || [];

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
    // Mark all conversations as read locally when seller views messages
    setThreads((prev) => prev.map((t) => ({ ...t, unread: 0 })));
    // And clear unread counts in the database for this seller so the badge clears
    supabase
      .from("conversations")
      .update({ seller_unread_count: 0 })
      .eq("seller_id", sellerId);
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
    if (!trimmed || !activeId || !sellerId) return;

    // optimistic update
    setMessagesById((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), msg("seller", trimmed, timeNow())],
    }));
    updateSnippet(activeId, trimmed);
    setText("");

    try {
      await supabase.from("messages").insert({
        conversation_id: activeId,
        sender_id: sellerId,
        sender_role: "seller",
        text: trimmed,
      });

      await supabase
        .from("conversations")
        .update({
          last_message: trimmed,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", activeId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Seller send failed", e?.message || e);
    }
  }

  function onPickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e) {
    const file = (e.target.files || [])[0];
    if (!file || !activeId || !sellerId) {
      e.target.value = "";
      return;
    }

    const isImage = file.type.startsWith("image/");

    const fallbackText = isImage
      ? "Sent a photo"
      : `Sent a file: ${file.name}`;

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const path = `${sellerId}/${activeId}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase
        .storage
        .from("message-attachments")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadErr) {
        // eslint-disable-next-line no-console
        console.warn("Failed to upload attachment", uploadErr.message || uploadErr);
        e.target.value = "";
        return;
      }

      const { data: pub } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(path);
      const publicUrl = pub?.publicUrl || null;
      if (!publicUrl) {
        e.target.value = "";
        return;
      }

      setMessagesById((prev) => ({
        ...prev,
        [activeId]: [
          ...(prev[activeId] || []),
          msg("seller", fallbackText, timeNow(), {
            attachment: { name: file.name, url: publicUrl, isImage },
          }),
        ],
      }));
      updateSnippet(activeId, fallbackText);

      try {
        await supabase.from("messages").insert({
          conversation_id: activeId,
          sender_id: sellerId,
          sender_role: "seller",
          text: fallbackText,
          attachment_name: file.name,
          attachment_type: file.type,
          attachment_url: publicUrl,
        });

        await supabase
          .from("conversations")
          .update({
            last_message: fallbackText,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", activeId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to save attachment message", err?.message || err);
      } finally {
        e.target.value = "";
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Seller attachment send failed", err?.message || err);
      e.target.value = "";
    }
  }

  // Load conversations for this seller
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;

    async function loadConversations() {
      const { data: convos, error } = await supabase
        .from("conversations")
        .select("id, buyer_id, last_message, last_message_at, seller_unread_count")
        .eq("seller_id", sellerId)
        .order("last_message_at", { ascending: false });

      if (error || !convos || cancelled) {
        setThreads([]);
        return;
      }

      const buyerIds = Array.from(
        new Set(convos.map((c) => c.buyer_id).filter(Boolean))
      );
      let buyerById = {};
      if (buyerIds.length) {
        const { data: buyers } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url, last_active")
          .in("id", buyerIds);
        (buyers || []).forEach((b) => {
          buyerById[b.id] = b;
        });
      }

      const mapped = convos.map((c) => {
        const b = buyerById[c.buyer_id] || {};
        const fullName = [b.first_name, b.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const shortId = c.buyer_id
          ? String(c.buyer_id).replace(/-/g, "").slice(0, 4).toUpperCase()
          : "";
        const fallback = shortId ? `Customer ${shortId}` : "Customer";
        const name = fullName || fallback;

        const lastActive = b.last_active ? Date.parse(b.last_active) : null;
        const online =
          lastActive && Number.isFinite(lastActive)
            ? Date.now() - lastActive < 5 * 60 * 1000
            : false;

        return {
          id: c.id,
          buyerName: name,
          buyerRole: "buyer",
          lastSnippet: c.last_message || "",
          lastAt: c.last_message_at,
          // Do not show per-thread unread badges for sellers
          unread: 0,
          avatar: b.avatar_url || "",
          online,
        };
      });

      if (!cancelled) {
        setThreads(mapped);
        if (!activeId && mapped.length) {
          setActiveId(mapped[0].id);
        }
      }
    }

    loadConversations();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    async function loadMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, sender_id, sender_role, text, attachment_url, attachment_name, attachment_type, created_at"
        )
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error || !data) {
        setMessagesById((prev) => ({ ...prev, [activeId]: [] }));
        return;
      }

      const mapped = data.map((m) =>
        msg(
          m.sender_role === "buyer" ? "customer" : "seller",
          m.text || "",
          new Date(m.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
          m.attachment_url
            ? {
                attachment: {
                  url: m.attachment_url,
                  name: m.attachment_name,
                  isImage: m.attachment_type?.startsWith("image/") || false,
                },
              }
            : {}
        )
      );

      setMessagesById((prev) => ({ ...prev, [activeId]: mapped }));
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Realtime: subscribe to new messages on the active conversation
  useEffect(() => {
    if (!activeId || !sellerId) return undefined;

    const channel = supabase
      .channel(`seller-messages-${activeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const m = payload.new;
          // Skip messages we already added optimistically
          if (m.sender_id === sellerId) return;

          setMessagesById((prev) => {
            const existing = prev[activeId] || [];
            if (existing.some((msg) => msg.id === m.id)) return prev;

            const mapped = msg(
              m.sender_role === 'buyer' ? 'customer' : 'seller',
              m.text || '',
              new Date(m.created_at).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              }),
              m.attachment_url
                ? {
                    attachment: {
                      url: m.attachment_url,
                      name: m.attachment_name,
                      isImage: m.attachment_type?.startsWith('image/') || false,
                    },
                  }
                : {}
            );

            const next = {
              ...prev,
              [activeId]: [...existing, mapped],
            };

            // Also push a seller notification for this new buyer message
            if (m.sender_role === 'buyer') {
              try {
                addNotification({
                  title: 'New message from customer',
                  body: m.text || 'New message received',
                  link: '/seller/messages',
                  type: 'info',
                });
              } catch {}
            }

            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, sellerId]);

  // Lightweight polling: refresh buyer online status every 30s based on profiles.last_active
  useEffect(() => {
    if (!threads.length) return;

    const interval = setInterval(async () => {
      const buyerIds = Array.from(
        new Set(threads.map((t) => t.buyerId).filter(Boolean))
      );
      if (!buyerIds.length) return;

      const { data: buyers } = await supabase
        .from("profiles")
        .select("id, last_active")
        .in("id", buyerIds);

      const byId = {};
      (buyers || []).forEach((b) => {
        byId[b.id] = b.last_active;
      });

      setThreads((prev) =>
        prev.map((t) => {
          const la = byId[t.buyerId];
          if (!la) return t;
          const ms = Date.parse(la);
          const online =
            ms && Number.isFinite(ms) ? Date.now() - ms < 5 * 60 * 1000 : false;
          return { ...t, online };
        })
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [threads]);

  // ---- UI
  return (
    <div className="h-[calc(100vh-80px)] max-w-6xl mx-auto px-4 py-5">
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

      <div className="flex h-[calc(100%-56px)] gap-4">
        {/* left: conversation list */}
        <aside className="w-[320px] rounded-2xl border border-[var(--line-amber)] bg-white p-3 flex flex-col">
          <div className="px-2 pb-3">
            <div className="font-medium text-[var(--brown-700)] mb-2">
              Customer Conversations
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
              
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-[var(--line-amber)]/70 flex-1 overflow-y-auto">
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
        <section className="flex-1 rounded-2xl border border-[var(--line-amber)] bg-white flex flex-col min-w-0">
          {/* thread header */}
          <div className="p-4 border-b border-[var(--line-amber)] flex items-center gap-3">
            <img
              src={active?.avatar}
              className="h-9 w-9 rounded-full object-cover border border-[var(--line-amber)]"
            />
            <div>
              <div className="font-medium text-[var(--brown-700)] leading-tight">
                {active?.buyerName}
              </div>
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
            <button
              type="button"
              onClick={onPickFile}
              className="text-[var(--orange-700)] px-1"
              title="Attach file or photo"
            >
              🧷
            </button>
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
              onClick={() => setText((prev) => prev + " 🙂")}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={onFileChange}
          />
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
        <div className="space-y-2">
          {m.attachment && m.attachment.isImage && m.attachment.url && (
            <div className="rounded-lg overflow-hidden border border-[var(--line-amber)] bg-[var(--cream-50)]">
              <img
                src={m.attachment.url}
                alt={m.attachment.name || "Attachment"}
                className="max-h-60 w-full object-cover"
              />
            </div>
          )}

          {m.attachment && !m.attachment.isImage && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2 text-xs">
              <span>📎</span>
              <span className="truncate">
                {m.attachment.name || "File attachment"}
              </span>
            </div>
          )}

          {m.text && <div>{m.text}</div>}
        </div>
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
  if (!ts) return "";

  // Support both numeric timestamps and ISO strings from Supabase
  let ms = typeof ts === "number" ? ts : Date.parse(ts);
  if (!Number.isFinite(ms)) return "";

  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return "just now";

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
