// src/pages/user/Messages.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const buyerId = user?.id;

  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messagesById, setMessagesById] = useState({});
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [sp] = useSearchParams();
  const listEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );

  const chat = messagesById[activeId] || [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.name.toLowerCase().includes(q));
  }, [threads, query]);

  function totalUnread(list) {
    return list.reduce((n, t) => n + (t.unread || 0), 0);
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
        t.id === threadId ? { ...t, last: lastText, time: "Now", unread: 0 } : t
      )
    );
  }

  const send = async () => {
    const txt = input.trim();
    if (!txt || !buyerId) return;

    // If there is no active conversation yet, but we have a sellerId from the URL,
    // create or reuse a real conversation row in Supabase.
    let conversationId = activeId;
    const sellerIdFromQuery = sp.get("sellerId");

    try {
      if (!conversationId && sellerIdFromQuery) {
        // Try to reuse an existing conversation between this buyer and seller
        const { data: existing, error: existingError } = await supabase
          .from("conversations")
          .select(
            "id, seller_id, last_message, last_message_at, buyer_unread_count, seller_unread_count"
          )
          .eq("buyer_id", buyerId)
          .eq("seller_id", sellerIdFromQuery)
          .maybeSingle();

        if (!existingError && existing) {
          conversationId = existing.id;
          setActiveId(existing.id);
        } else {
          // Create a new conversation row
          const { data: created, error: createError } = await supabase
            .from("conversations")
            .insert({
              buyer_id: buyerId,
              seller_id: sellerIdFromQuery,
              last_message: txt,
              last_message_at: new Date().toISOString(),
              buyer_unread_count: 0,
              seller_unread_count: 1,
            })
            .select("id, seller_id, last_message, last_message_at")
            .single();

          if (createError || !created) {
            return;
          }

          conversationId = created.id;
          setActiveId(created.id);

          // Load seller profile so the new thread has a proper name/avatar
          let sellerProfile = null;
          if (created.seller_id) {
            const { data: sellers } = await supabase
              .from("profiles")
              .select("id, store_name, first_name, last_name, avatar_url")
              .eq("id", created.seller_id)
              .limit(1);
            sellerProfile = sellers?.[0] || null;
          }

          const name =
            sellerProfile?.store_name ||
            [sellerProfile?.first_name, sellerProfile?.last_name]
              .filter(Boolean)
              .join(" ") ||
            "Seller";

          const newThread = {
            id: created.id,
            name,
            role: "seller",
            avatar: sellerProfile?.avatar_url || "",
            last: created.last_message || txt,
            time: created.last_message_at,
            online: false,
            unread: 0,
          };

          setThreads((prev) => {
            if (prev.some((t) => t.id === created.id)) return prev;
            return [newThread, ...prev];
          });
        }
      }

      if (!conversationId) return;

      const optimistic = {
        id: Date.now(),
        from: "me",
        text: txt,
        time: timeNow(),
      };

      setMessagesById((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), optimistic],
      }));
      updateSnippet(conversationId, txt);
      setInput("");

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: buyerId,
        sender_role: "buyer",
        text: txt,
      });

      // Increment seller_unread_count so the seller sees a new unread message
      try {
        const { data: convo } = await supabase
          .from("conversations")
          .select("seller_unread_count")
          .eq("id", conversationId)
          .single();

        const nextUnread = (convo?.seller_unread_count || 0) + 1;

        await supabase
          .from("conversations")
          .update({
            last_message: txt,
            last_message_at: new Date().toISOString(),
            seller_unread_count: nextUnread,
          })
          .eq("id", conversationId);
      } catch {
        // best-effort; if this fails the message still sends
        await supabase
          .from("conversations")
          .update({
            last_message: txt,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to send message", e?.message || e);
    }
  };

  function onPickThread(id) {
    setActiveId(id);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t))
    );
    supabase
      .from("conversations")
      .update({ buyer_unread_count: 0 })
      .eq("id", id);
  }

  function onPickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e) {
    const file = (e.target.files || [])[0];
    if (!file || !buyerId) {
      e.target.value = "";
      return;
    }

    const isImage = file.type.startsWith("image/");
    const fallbackText = isImage
      ? "Sent a photo"
      : `Sent a file: ${file.name}`;

    let conversationId = activeId;
    const sellerIdFromQuery = sp.get("sellerId");

    try {
      // Ensure we have a real conversation row, similar to send()
      if (!conversationId && sellerIdFromQuery) {
        const { data: existing, error: existingError } = await supabase
          .from("conversations")
          .select(
            "id, seller_id, last_message, last_message_at, buyer_unread_count, seller_unread_count"
          )
          .eq("buyer_id", buyerId)
          .eq("seller_id", sellerIdFromQuery)
          .maybeSingle();

        if (!existingError && existing) {
          conversationId = existing.id;
          setActiveId(existing.id);
        } else {
          const { data: created, error: createError } = await supabase
            .from("conversations")
            .insert({
              buyer_id: buyerId,
              seller_id: sellerIdFromQuery,
              last_message: fallbackText,
              last_message_at: new Date().toISOString(),
              buyer_unread_count: 0,
              seller_unread_count: 1,
            })
            .select("id, seller_id, last_message, last_message_at")
            .single();

          if (createError || !created) {
            e.target.value = "";
            return;
          }

          conversationId = created.id;
          setActiveId(created.id);

          let sellerProfile = null;
          if (created.seller_id) {
            const { data: sellers } = await supabase
              .from("profiles")
              .select("id, store_name, first_name, last_name, avatar_url")
              .eq("id", created.seller_id)
              .limit(1);
            sellerProfile = sellers?.[0] || null;
          }

          const name =
            sellerProfile?.store_name ||
            [sellerProfile?.first_name, sellerProfile?.last_name]
              .filter(Boolean)
              .join(" ") ||
            "Seller";

          const newThread = {
            id: created.id,
            name,
            role: "seller",
            avatar: sellerProfile?.avatar_url || "",
            last: created.last_message || fallbackText,
            time: created.last_message_at,
            online: false,
            unread: 0,
          };

          setThreads((prev) => {
            if (prev.some((t) => t.id === created.id)) return prev;
            return [newThread, ...prev];
          });
        }
      }

      if (!conversationId) {
        e.target.value = "";
        return;
      }

      // Upload the file to Supabase storage so the attachment URL is stable
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const path = `${buyerId}/${conversationId}/${Date.now()}-${safeName}`;
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

      const optimistic = {
        id: Date.now(),
        from: "me",
        text: fallbackText,
        time: timeNow(),
        attachment: {
          name: file.name,
          url: publicUrl,
          isImage,
        },
      };

      setMessagesById((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), optimistic],
      }));
      updateSnippet(conversationId, fallbackText);

      try {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: buyerId,
          sender_role: "buyer",
          text: fallbackText,
          attachment_name: file.name,
          attachment_type: file.type,
          attachment_url: publicUrl,
        });

        // Update conversation last message + unread count for the seller
        try {
          const { data: convo } = await supabase
            .from("conversations")
            .select("seller_unread_count")
            .eq("id", conversationId)
            .single();

          const nextUnread = (convo?.seller_unread_count || 0) + 1;

          await supabase
            .from("conversations")
            .update({
              last_message: fallbackText,
              last_message_at: new Date().toISOString(),
              seller_unread_count: nextUnread,
            })
            .eq("id", conversationId);
        } catch {
          await supabase
            .from("conversations")
            .update({
              last_message: fallbackText,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to save attachment message", err?.message || err);
      } finally {
        e.target.value = "";
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Attachment send failed", err?.message || err);
      e.target.value = "";
    }
  }

  /** Prefill from Product Detail:
   * /messages?seller=Manila%20Furniture%20Co.&product=Modern%20Sectional%20Sofa&prefill=Hi...
   */
  useEffect(() => {
    const seller = sp.get("seller");
    const sellerIdFromQuery = sp.get("sellerId");
    const prefill = sp.get("prefill");
    if (!seller && !sellerIdFromQuery) return;

    // Prefer selecting by sellerId when available
    let found = null;
    if (sellerIdFromQuery) {
      found = threads.find((t) => t.sellerId === sellerIdFromQuery) || null;
    }
    if (!found && seller) {
      found = threads.find(
        (t) => t.name.toLowerCase() === seller.toLowerCase()
      ) || null;
    }
    if (found) {
      setActiveId(found.id);
    }
    if (prefill) setInput(prefill);
  }, [sp, threads]);

  // Load conversations for this buyer
  useEffect(() => {
    if (!buyerId) return;
    let cancelled = false;

    async function loadConversations() {
      let { data: convos, error } = await supabase
        .from("conversations")
        .select("id, seller_id, last_message, last_message_at, buyer_unread_count")
        .eq("buyer_id", buyerId)
        .order("last_message_at", { ascending: false });

      if (error || !convos || cancelled) {
        setThreads([]);
        return;
      }

      // If coming from ProductDetail with a specific sellerId and there is no
      // existing conversation yet for this (buyer, seller) pair, create one
      // so the thread is ready and can be auto-selected.
      const sellerIdFromQuery = sp.get("sellerId");
      if (sellerIdFromQuery && !convos.some((c) => c.seller_id === sellerIdFromQuery)) {
        try {
          const { data: created, error: convErr } = await supabase
            .from("conversations")
            .insert({
              buyer_id: buyerId,
              seller_id: sellerIdFromQuery,
              last_message: null,
              last_message_at: new Date().toISOString(),
              buyer_unread_count: 0,
              seller_unread_count: 0,
            })
            .select("id, seller_id, last_message, last_message_at, buyer_unread_count")
            .single();

          if (!convErr && created) {
            convos = [created, ...convos];
          }
        } catch {
          // ignore; if insert fails (e.g. RLS), we just won't have a pre-created thread
        }
      }

      const sellerIds = Array.from(
        new Set(convos.map((c) => c.seller_id).filter(Boolean))
      );
      let sellerById = {};
      let storeByOwnerId = {};
      if (sellerIds.length) {
        const [{ data: sellers }, { data: stores }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, store_name, first_name, last_name, avatar_url, last_active")
            .in("id", sellerIds),
          supabase
            .from("stores")
            .select("owner_id, name, logo_url")
            .in("owner_id", sellerIds),
        ]);

        (sellers || []).forEach((s) => {
          sellerById[s.id] = s;
        });
        (stores || []).forEach((st) => {
          storeByOwnerId[st.owner_id] = st;
        });
      }

      const mapped = convos.map((c) => {
        const s = sellerById[c.seller_id] || {};
        const st = storeByOwnerId[c.seller_id] || {};
        const name =
          st.name ||
          s.store_name ||
          [s.first_name, s.last_name].filter(Boolean).join(" ") ||
          "Seller";
        const lastActive = s.last_active ? Date.parse(s.last_active) : null;
        const online =
          lastActive && Number.isFinite(lastActive)
            ? Date.now() - lastActive < 5 * 60 * 1000
            : false;
        return {
          id: c.id,
          sellerId: c.seller_id,
          name,
          role: "seller",
          avatar: st.logo_url || s.avatar_url || "",
          last: c.last_message || "",
          time: c.last_message_at,
          online,
          unread: c.buyer_unread_count || 0,
        };
      });

      if (!cancelled) {
        setThreads(mapped);
        const hasPrefSeller = !!(sp.get("seller") || sp.get("sellerId"));
        if (!activeId && !hasPrefSeller && mapped.length) {
          setActiveId(mapped[0].id);
        }
      }
    }

    loadConversations();
    return () => {
      cancelled = true;
    };
  }, [buyerId, sp]);

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

      const mapped = data.map((m) => ({
        id: m.id,
        from: m.sender_role === "buyer" ? "me" : "seller",
        text: m.text || "",
        time: new Date(m.created_at).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        attachment: m.attachment_url
          ? {
              url: m.attachment_url,
              name: m.attachment_name,
              isImage: m.attachment_type?.startsWith("image/") || false,
            }
          : undefined,
      }));

      setMessagesById((prev) => ({ ...prev, [activeId]: mapped }));
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Realtime: subscribe to new messages on the active conversation
  useEffect(() => {
    if (!activeId || !buyerId) return undefined;

    const channel = supabase
      .channel(`buyer-messages-${activeId}`)
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
          if (m.sender_id === buyerId) return;

          setMessagesById((prev) => {
            const existing = prev[activeId] || [];
            if (existing.some((msg) => msg.id === m.id)) return prev;

            const mapped = {
              id: m.id,
              from: m.sender_role === 'buyer' ? 'me' : 'seller',
              text: m.text || '',
              time: new Date(m.created_at).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              }),
              attachment: m.attachment_url
                ? {
                    url: m.attachment_url,
                    name: m.attachment_name,
                    isImage: m.attachment_type?.startsWith('image/') || false,
                  }
                : undefined,
            };

            return {
              ...prev,
              [activeId]: [...existing, mapped],
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, buyerId]);

  // Lightweight polling: refresh seller online status every 30s based on profiles.last_active
  useEffect(() => {
    if (!threads.length) return;

    const interval = setInterval(async () => {
      const sellerIds = Array.from(
        new Set(threads.map((t) => t.sellerId).filter(Boolean))
      );
      if (!sellerIds.length) return;

      const { data: sellers } = await supabase
        .from("profiles")
        .select("id, last_active")
        .in("id", sellerIds);

      const byId = {};
      (sellers || []).forEach((s) => {
        byId[s.id] = s.last_active;
      });

      setThreads((prev) =>
        prev.map((t) => {
          const la = byId[t.sellerId];
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

  return (
    <div className="h-[calc(100vh-80px)] max-w-6xl mx-auto px-4 py-5">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
            aria-label="Back to Home"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">Messages</h1>
        </div>
      </div>

      {/* 2-pane layout */}
      <div className="flex h-[calc(100%-56px)] gap-4">
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
                onClick={() => onPickThread(t.id)}
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
                    <div className="text-xs text-gray-600 truncate">
                      {t.last}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {relativeTime(t.time)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right: chat */}
        <section className="flex-1 rounded-2xl border border-[var(--line-amber)] bg-white flex flex-col min-w-0">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              Select a conversation to start chatting.
            </div>
          ) : (
            <>
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat body */}
              <div className="flex-1 overflow-y-auto p-4">
                {chat.length === 0 && (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    No messages yet. Start the conversation!
                  </div>
                )}
                {chat.map((m) => (
                  <MessageBubble
                    key={m.id}
                    mine={m.from === "me"}
                    time={m.time}
                    text={m.text}
                    attachment={m.attachment}
                  />
                ))}
                <div ref={listEndRef} />
              </div>

              {/* Composer */}
              <div className="flex items-center gap-2 border-t border-[var(--line-amber)] px-3 py-3">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
                  title="Attach"
                  onClick={onPickFile}
                  type="button"
                >
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={onFileChange}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function MessageBubble({ mine, text, time, attachment }) {
  return (
    <div className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl border px-3 py-2 text-sm ${
          mine
            ? "bg-[var(--orange-600)] text-white border-[var(--orange-500)]"
            : "bg-[var(--cream-50)] text-[var(--brown-700)] border-[var(--line-amber)]"
        }`}
      >
        <div className="space-y-2">
          {attachment && attachment.isImage && attachment.url && (
            <div className="rounded-lg overflow-hidden border border-[var(--line-amber)] bg-[var(--cream-50)]">
              <img
                src={attachment.url}
                alt={attachment.name || "Attachment"}
                className="max-h-60 w-full object-cover"
              />
            </div>
          )}

          {attachment && !attachment.isImage && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2 text-xs">
              <span>📎</span>
              <span className="truncate">{attachment.name || "File attachment"}</span>
            </div>
          )}

          <div className="whitespace-pre-wrap">{text}</div>
        </div>
        <div className={`mt-1 text-[10px] ${mine ? "text-white/90" : "text-gray-600"}`}>
          {time}
        </div>
      </div>
    </div>
  );
}


