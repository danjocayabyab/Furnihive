import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal.jsx";
import Label from "../ui/Label.jsx";
import Input from "../ui/Input.jsx";
import PasswordInput from "../ui/PasswordInput.jsx";
import Button from "../ui/Button.jsx";
import { login, signup as signupApi } from "../../lib/auth.js";
import toast from "react-hot-toast";

export default function AuthModal({ open, mode: initialMode = "login", onClose, onAuthed }) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState("buyer");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetState = () => {
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    try {
      setLoading(true);
      const { user } = await login({ email, password });
      toast.success(`Welcome back, ${user.name}!`);
      if (onAuthed) {
        onAuthed(user);
      } else {
        const r = user.role || "buyer";
        navigate(r === "seller" ? "/seller" : "/", { replace: true });
      }
      handleClose();
    } catch (err) {
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const firstName = String(form.get("firstName") || "").trim();
    const lastName = String(form.get("lastName") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const storeName = String(form.get("storeName") || "").trim();
    const phone = String(form.get("phone") || "").trim();

    if (!firstName || !lastName) {
      toast.error("First name and last name are required");
      return;
    }
    if (!email) {
      toast.error("Email is required");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (role === "seller") {
      if (!storeName) {
        toast.error("Store name is required for sellers");
        return;
      }
      const phRegex = /^(?:\+63|0)9\d{9}$/;
      if (!phRegex.test(phone)) {
        toast.error("Use PH mobile format: +639XXXXXXXXX or 09XXXXXXXXX");
        return;
      }
    }

    const payload = {
      role,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      terms: true,
      storeName: role === "seller" ? storeName : "",
      phone: role === "seller" ? phone : "",
    };

    try {
      setLoading(true);
      await signupApi(payload);
      toast.success("Account created successfully. Please log in to continue.");
      handleClose();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--brown-700)]">
          {mode === "login" ? "Login to FurniHive" : "Create your FurniHive account"}
        </h2>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-full py-2 font-semibold ${
            mode === "login"
              ? "bg-[var(--orange-600)] text-white"
              : "bg-[var(--cream-50)] text-[var(--brown-700)]"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-full py-2 font-semibold ${
            mode === "signup"
              ? "bg-[var(--orange-600)] text-white"
              : "bg-[var(--cream-50)] text-[var(--brown-700)]"
          }`}
        >
          Sign Up
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" placeholder="Enter your email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" name="password" placeholder="Enter your password" />
          </div>
          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Please wait..." : "Login"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <p className="text-sm font-medium text-[var(--brown-700)] mb-2">I want to:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  role === "buyer"
                    ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)]"
                    : "border-[var(--line-amber)] text-[var(--brown-700)] bg-white hover:bg-[var(--cream-50)]"
                }`}
              >
                Buy Furniture
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  role === "seller"
                    ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)]"
                    : "border-[var(--line-amber)] text-[var(--brown-700)] bg-white hover:bg-[var(--cream-50)]"
                }`}
              >
                Sell Furniture
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" placeholder="First Name" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" placeholder="Last Name" />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" placeholder="Enter your email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" name="password" placeholder="Create a password" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
            />
          </div>

          {role === "seller" && (
            <>
              <div>
                <Label htmlFor="storeName">Store Name</Label>
                <Input id="storeName" name="storeName" placeholder="Your furniture store name" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" placeholder="+63 912 345 6789" />
              </div>
            </>
          )}

          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
