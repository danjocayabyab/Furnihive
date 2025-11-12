import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // simple hardcoded admin check (you can replace with API later)
    if (email === "admin@furnihive.com" && password === "admin123") {
      localStorage.setItem("fh_token", "demo_admin_token");
      localStorage.setItem(
        "fh_user",
        JSON.stringify({ name: "Admin", role: "admin", email })
      );
      navigate("/admin");
    } else {
      setError("Invalid email or password.");
    }
  };

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
              placeholder="admin@furnihive.com"
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
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            className="w-full h-10 rounded-lg bg-[var(--orange-600)] text-white font-medium hover:bg-[var(--orange-700)] transition"
          >
            Sign In
          </button>
        </form>

        <p className="text-[12px] text-[var(--brown-700)]/60 text-center mt-5">
          © {new Date().getFullYear()} FurniHive. All rights reserved.
        </p>
      </div>
    </div>
  );
}
