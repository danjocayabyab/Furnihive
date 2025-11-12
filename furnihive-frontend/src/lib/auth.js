// src/lib/auth.js
import { api } from "./apiClient";

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

export function logout() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock login for now. Swap body with:
 *   const { data } = await api.post('/auth/login', { email, password });
 *   setToken(data.token); setUser(data.user);
 */
export async function login({ email, password, roleHint }) {
  await delay(500);

  if (!email || !password || password.length < 6) {
    throw new Error("Invalid credentials");
  }

  // Demo routing rules
  let role = "buyer";
  if (email.toLowerCase() === "seller@demo.ph" || roleHint === "seller") {
    role = "seller";
  } else if (email.toLowerCase() === "buyer@demo.ph" || roleHint === "buyer") {
    role = "buyer";
  }

  const user = {
    id: "u-" + Date.now(),
    email,
    name: role === "seller" ? "Demo Seller" : "Demo Buyer",
    role,
  };

  const token = "dev-token-" + Date.now();

  setToken(token);
  setUser(user);

  return { token, user };
}

/**
 * Mock signup. Replace with POST /auth/signup later.
 */
export async function signup(payload) {
  await delay(600);
  const role = payload.role || "buyer";
  const user = {
    id: "u-" + Date.now(),
    email: payload.email,
    name: `${payload.firstName} ${payload.lastName}`.trim() || "New User",
    role,
  };
  setToken("dev-token-" + Date.now());
  setUser(user);
  return { user };
}
