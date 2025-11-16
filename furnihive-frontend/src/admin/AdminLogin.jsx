import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../components/contexts/AuthContext.jsx";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingAdmin, setAwaitingAdmin] = useState(false);

  const clearedRef = useRef(false);
  useEffect(() => {
    // Always require fresh credentials: clear any existing session when visiting admin login
    if (clearedRef.current) return; // avoid double-run in React Strict Mode
    clearedRef.current = true;
    (async () => {
      await supabase.auth.signOut();
      setEmail("");
      setPassword("");
      setError("");
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) throw signErr;
      const uid = data.user?.id;
      if (!uid) throw new Error("Login failed.");
      const { data: adminRow } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (!adminRow) {
        await supabase.auth.signOut();
        throw new Error("This account is not an admin.");
      }
      // Wait for AuthContext to set isAdmin from auth listener before navigating
      setAwaitingAdmin(true);
    } catch (err) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (awaitingAdmin && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [awaitingAdmin, isAdmin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fffaf0] to-[#fff4e6]">
      <div className="w-full max-w-sm bg-white border border-[var(--line-amber)] rounded-2xl shadow-card p-8">
        <div className="text-center mb-6">
          <div className="h-12 w-12 mx-auto mb-2 grid place-items-center rounded-lg bg-[var(--orange-600)] text-white font-bold text-lg">
            F
          </div>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">
            FurniHive Admin
          </h1>
          <p className="text-sm text-[var(--brown-700)]/60">
            Sign in to manage your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--brown-700)]/70 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--line-amber)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--brown-700)]/70 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--line-amber)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            className="w-full h-10 rounded-lg bg-[var(--orange-600)] text-white font-medium hover:bg-[var(--orange-700)] transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="text-[12px] text-[var(--brown-700)]/60 text-center mt-5">
          © {new Date().getFullYear()} FurniHive. All rights reserved.
        </p>
      </div>
    </div>
  );
}
