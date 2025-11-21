import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
} | null;

type AuthContextValue = {
  user: AuthUser;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError("");
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user && !cancelled) {
          const u = session.session.user;
          setUser({
            id: u.id,
            email: u.email || "",
            name: (u.user_metadata as any)?.first_name || null,
            role: (u.user_metadata as any)?.role || null,
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to restore session");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const u = data.user;
      if (u) {
        setUser({
          id: u.id,
          email: u.email || "",
          name: (u.user_metadata as any)?.first_name || null,
          role: (u.user_metadata as any)?.role || null,
        });
      }
    } catch (e: any) {
      setError(e?.message || "Login failed");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError("");
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (e: any) {
      setError(e?.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
