import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  async function loadProfile(u) {
    if (!u) {
      setProfile(null);
      setIsAdmin(false);
      return null;
    }
    const md = u.user_metadata || {};
    // Always load base profile from profiles
    const prof = await supabase
      .from("profiles")
      .select(
        "id, role, seller_approved, suspended, first_name, last_name, phone, store_name, birth_date, gender, avatar_url, avatar_path, last_active"
      )
      .eq("id", u.id)
      .single();
    if (!prof.error && prof.data) {
      const current = prof.data;
      setProfile(current);

      // Update last_active timestamp for this user
      try {
        await supabase
          .from("profiles")
          .update({ last_active: new Date().toISOString() })
          .eq("id", u.id);
      } catch (e) {
        console.warn("Failed to update last_active", e);
      }

      return current;
    }

    // create minimal profile if missing
    const candidate = {
      id: u.id,
      role: md.role || "buyer",
      first_name: md.first_name || null,
      last_name: md.last_name || null,
      store_name: md.store_name || null,
      phone: md.phone || null,
      suspended: false,
      // New profiles are never auto-approved as sellers; they must be verified explicitly
      seller_approved: false,
    };
    const up = await supabase
      .from("profiles")
      .upsert(candidate, { onConflict: "id" })
      .select(
        "id, role, seller_approved, suspended, first_name, last_name, phone, store_name, birth_date, gender, avatar_url, avatar_path, last_active"
      )
      .single();
    if (!up.error && up.data) {
      const created = up.data;
      setProfile(created);

      // Set last_active for newly created profile
      try {
        await supabase
          .from("profiles")
          .update({ last_active: new Date().toISOString() })
          .eq("id", u.id);
      } catch (e) {
        console.warn("Failed to set last_active on new profile", e);
      }

      return created;
    }
    return null;
  }

  async function loadAdmin(u) {
    try {
      if (!u?.id) {
        setIsAdmin(false);
        return;
      }
      const { data: adminRow } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.id)
        .maybeSingle();
      setIsAdmin(!!adminRow);
    } catch {
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      // Do not block initial render on profile fetch; load it in background
      setLoading(false);
      loadProfile(data.session?.user ?? null);
      loadAdmin(data.session?.user ?? null);
    }
    init();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const u = newSession?.user ?? null;
      setUser(u);
      loadProfile(u);
      loadAdmin(u);
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return null;
    const latest = await loadProfile(user);
    return latest;
  };

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setUser(data.user ?? null);
    return data.user ?? null;
  };

  const value = useMemo(
    () => ({ session, user, profile, loading, isAdmin, refreshProfile, refreshUser }),
    [session, user, profile, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
