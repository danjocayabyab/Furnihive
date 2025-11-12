// Simple cross-page notification bus with localStorage persistence

const STORAGE_KEY = "fh_admin_notifications_v1";
let listeners = new Set();

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

let _state = load(); // [{id, title, body, ts, read, link?, type?}]

function emit() {
  for (const cb of listeners) cb(getState());
}

export function getState() {
  // newest first
  return [..._state].sort((a,b) => b.ts - a.ts);
}
export function getUnreadCount() {
  return _state.filter(n => !n.read).length;
}
export function subscribe(cb) {
  listeners.add(cb);
  cb(getState());
  return () => listeners.delete(cb);
}
export function addNotification({ title, body, link, type }) {
  const n = {
    id: crypto.randomUUID(),
    title,
    body: body || "",
    link: link || null,
    type: type || "info", // info | success | warning | error
    ts: Date.now(),
    read: false,
  };
  _state = [n, ..._state].slice(0, 100); // cap
  save(_state);
  return n.id;
}
export function markRead(id) {
  _state = _state.map(n => n.id === id ? { ...n, read: true } : n);
  save(_state);
}
export function markAllRead() {
  _state = _state.map(n => ({ ...n, read: true }));
  save(_state);
}
export function clearAll() {
  _state = [];
  save(_state);
}

/* ---- (Optional) Dev realtime mock) ----
   Call startMock() once anywhere in dev to simulate pushes. */
let mockTimer = null;
export function startMock() {
  if (mockTimer) return;
  mockTimer = setInterval(() => {
    const pool = [
      { title: "New support ticket", body: "Maria Santos opened TCK-1005", link: "/admin?tab=support", type: "warning" },
      { title: "Order updated", body: "ORD-2024-004 moved to Shipped", link: "/admin?tab=orders", type: "success" },
      { title: "Seller application", body: "Cebu Homeware submitted docs", link: "/admin?tab=applications", type: "info" },
    ];
    addNotification(pool[Math.floor(Math.random()*pool.length)]);
  }, 15000);
}
export function stopMock() {
  if (mockTimer) clearInterval(mockTimer);
  mockTimer = null;
}
