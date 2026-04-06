// Buyer-specific notification bus with Supabase sync and localStorage persistence
import { supabase } from "../../lib/supabaseClient";

const STORAGE_KEY = "fh_buyer_notifications_v1";
let listeners = new Set();
let realtimeSubscription = null;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  emit();
}

let _state = load(); // [{id, title, body, ts, read, link?, type?, data?}]

function emit() {
  for (const cb of listeners) cb(getState());
}

export function getState() {
  return [..._state].sort((a, b) => b.ts - a.ts);
}

export function getUnreadCount() {
  return _state.filter((n) => !n.read).length;
}

export function subscribe(cb) {
  listeners.add(cb);
  cb(getState());
  return () => listeners.delete(cb);
}

export function addNotification({ title, body, link, type, data }) {
  const n = {
    id: crypto.randomUUID(),
    title,
    body: body || "",
    link: link || null,
    type: type || "info", // info | success | warning | error | promotion
    data: data || null,
    ts: Date.now(),
    read: false,
  };
  _state = [n, ..._state].slice(0, 100);
  save(_state);
  return n.id;
}

export function markRead(id) {
  _state = _state.map((n) => (n.id === id ? { ...n, read: true } : n));
  save(_state);
}

export function markAllRead() {
  _state = _state.map((n) => ({ ...n, read: true }));
  save(_state);
}

export function clearAll() {
  _state = [];
  save(_state);
}

// Fetch notifications from Supabase for logged-in user
export async function fetchNotificationsFromSupabase(userId) {
  if (!userId) {
    console.log("[Notifications] No userId provided, skipping fetch");
    return;
  }
  
  console.log("[Notifications] Fetching notifications for user:", userId);
  
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("[Notifications] Error fetching notifications:", error);
      return;
    }
    
    console.log("[Notifications] Fetched", data?.length || 0, "notifications from Supabase");
    
    if (data && data.length > 0) {
      // Merge with local state, avoiding duplicates
      const existingIds = new Set(_state.map(n => n.id));
      const newNotifications = data
        .filter(n => !existingIds.has(n.id))
        .map(n => ({
          id: n.id,
          title: n.title,
          body: n.message || n.body || "",
          link: n.link || null,
          type: n.type || "info",
          ts: new Date(n.created_at).getTime(),
          read: false,
        }));
      
      console.log("[Notifications] Adding", newNotifications.length, "new notifications to state");
      
      if (newNotifications.length > 0) {
        _state = [...newNotifications, ..._state].slice(0, 100);
        save(_state);
      }
    }
  } catch (err) {
    console.error("[Notifications] Error in fetchNotificationsFromSupabase:", err);
  }
}

// Subscribe to realtime notifications
export function subscribeToRealtimeNotifications(userId) {
  if (!userId) {
    console.log("[Notifications] No userId provided, skipping realtime subscription");
    return () => {};
  }
  
  console.log("[Notifications] Setting up realtime subscription for user:", userId);
  
  // Unsubscribe from existing subscription
  if (realtimeSubscription) {
    realtimeSubscription.unsubscribe();
  }
  
  realtimeSubscription = supabase
    .channel("buyer-notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[Notifications] Realtime notification received:", payload);
        const n = payload.new;
        addNotification({
          id: n.id,
          title: n.title,
          body: n.message || n.body || "",
          link: n.link || null,
          type: n.type || "info",
          ts: new Date(n.created_at).getTime(),
        });
      }
    )
    .subscribe((status) => {
      console.log("[Notifications] Realtime subscription status:", status);
    });
  
  return () => {
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
      realtimeSubscription = null;
    }
  };
}
