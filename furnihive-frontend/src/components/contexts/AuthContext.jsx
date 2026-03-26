import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  async function loadProfile(u) {
    if (!u) {
      setProfile(null);
      setIsAdmin(false);
      setEmailVerified(false);
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
      .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles
    
    console.log("Profile query result:", prof);
    
    if (!prof.error && prof.data) {
      const current = prof.data;
      setProfile(current);

      // Update email verification status
      setEmailVerified(!!u.email_confirmed_at);

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

    // Handle profile not found or other errors
    if (prof.error) {
      console.warn("Profile query error:", prof.error);
      
      // Create a basic profile from user metadata if profile doesn't exist
      if (prof.error?.code === 'PGRST116') { // Profile not found
        const basicProfile = {
          id: u.id,
          role: md.role || "buyer",
          first_name: md.first_name || null,
          last_name: md.last_name || null,
          store_name: md.store_name || null,
          phone: md.phone || null,
          suspended: false,
          seller_approved: false,
        };
        
        console.log("Creating basic profile from metadata:", basicProfile);
        setProfile(basicProfile);
        setEmailVerified(!!u.email_confirmed_at);
        return basicProfile;
      }
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
      setEmailVerified(!!data.session?.user?.email_confirmed_at);
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
      setEmailVerified(!!u?.email_confirmed_at);
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
    if (!error) {
      setUser(data.user ?? null);
      setEmailVerified(!!data.user?.email_confirmed_at);
    }
    return data.user ?? null;
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return { error: "No email address found" };
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`
      }
    });
    
    return { error };
  };

  const value = useMemo(
    () => ({ session, user, profile, loading, isAdmin, emailVerified, refreshProfile, refreshUser, resendVerificationEmail }),
    [session, user, profile, loading, isAdmin, emailVerified]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
