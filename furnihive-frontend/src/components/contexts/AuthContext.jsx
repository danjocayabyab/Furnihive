import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(u) {
    if (!u) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, seller_approved, first_name, last_name, phone, store_name, birth_date, gender, avatar_url, avatar_path")
      .eq("id", u.id)
      .single();
    if (!error && data) {
      setProfile(data);
      return;
    }
    // If profile missing, attempt to create it from user metadata once authenticated
    const md = u.user_metadata || {};
    const candidate = {
      id: u.id,
      role: md.role || "buyer",
      first_name: md.first_name || null,
      last_name: md.last_name || null,
      store_name: md.store_name || null,
      phone: md.phone || null,
      seller_approved: md.role === "seller" ? true : null,
    };
    const { error: upsertErr, data: upserted } = await supabase
      .from("profiles")
      .upsert(candidate, { onConflict: "id" })
      .select("id, role, seller_approved, first_name, last_name, phone, store_name, birth_date, gender, avatar_url, avatar_path")
      .single();
    if (!upsertErr && upserted) setProfile(upserted);
    else setProfile(null);
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
    }
    init();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const u = newSession?.user ?? null;
      setUser(u);
      loadProfile(u);
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return null;
    await loadProfile(user);
    return profile;
  };

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setUser(data.user ?? null);
    return data.user ?? null;
  };

  const value = useMemo(
    () => ({ session, user, profile, loading, refreshProfile, refreshUser }),
    [session, user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
