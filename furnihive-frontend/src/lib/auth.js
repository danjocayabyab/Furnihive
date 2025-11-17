// src/lib/auth.js
import { supabase } from "../lib/supabaseClient";

// Storage keys
const USER_KEY = "fh_user";
const TOKEN_KEY = "fh_token";

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(u) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

export function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function logout() {
  try {
    // Before clearing session, mark the user as offline by pushing last_active into the past
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;
    if (userId) {
      try {
        await supabase
          .from("profiles")
          .update({ last_active: new Date(Date.now() - 10 * 60 * 1000).toISOString() })
          .eq("id", userId);
      } catch {}
    }

    // Clear Supabase session
    await supabase.auth.signOut();
  } catch {}
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock login for now. Swap body with:
 *   const { data } = await api.post('/auth/login', { email, password });
 *   setToken(data.token); setUser(data.user);
 */
export async function login({ email, password }) {
  await delay(150);
  if (!email || !password || password.length < 6) {
    throw new Error("Invalid credentials");
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Auth] login failed", { code: error.code, message: error.message });
    throw new Error(error.message);
  }
  const sess = data.session;
  const u = data.user;
  // Load profile/role
  let { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", u.id)
    .maybeSingle();
  if ((!profile || profileErr) && u) {
    const md = u.user_metadata || {};
    const candidate = {
      id: u.id,
      role: md.role || "buyer",
      first_name: md.first_name || null,
      last_name: md.last_name || null,
      store_name: md.store_name || null,
      phone: md.phone || null,
    };
    const { data: upserted } = await supabase
      .from("profiles")
      .upsert(candidate, { onConflict: "id" })
      .select("id, role, first_name, last_name")
      .maybeSingle();
    if (upserted) profile = upserted;
  }
  const fullName = profile?.first_name || profile?.last_name
    ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
    : u.email;
  const role = (u.user_metadata?.role) || profile?.role || "buyer";
  const user = { id: u.id, email: u.email, name: fullName, role };
  // Optionally mirror for legacy callers
  setToken(sess?.access_token || "");
  setUser(user);
  return { token: sess?.access_token || "", user };
}

/**
 * Mock signup. Replace with POST /auth/signup later.
 */
export async function signup(payload) {
  await delay(150);
  const { email, password, firstName, lastName } = payload;
  if (!email || !password) throw new Error("Missing email or password");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        role: payload.role || "buyer",
        store_name: payload.role === "seller" ? (payload.storeName || null) : null,
        phone: payload.role === "seller" ? (payload.phone || null) : null,
      },
    },
  });
  if (error) throw new Error(error.message);
  const u = data.user;
  if (u) {
    // Create or update profile with role and optional seller fields
    const prof = {
      id: u.id,
      role: payload.role || "buyer",
      first_name: firstName,
      last_name: lastName,
    };
    if (payload.role === "seller") {
      prof.store_name = payload.storeName || null;
      prof.phone = payload.phone || null;
    }
    await supabase.from("profiles").upsert(prof, { onConflict: "id" });
  }
  // Some projects require email confirmation -> session may be null.
  const name = `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim() || payload.email;
  const user = { id: u?.id || "", email: payload.email, name, role: payload.role || "buyer" };
  setUser(user);
  return { user, session: data.session || null };
}
