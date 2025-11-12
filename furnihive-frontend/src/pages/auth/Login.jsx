// src/pages/auth/Login.jsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import Label from "../../components/ui/Label.jsx";
import Input from "../../components/ui/Input.jsx";
import PasswordInput from "../../components/ui/PasswordInput.jsx";
import Button from "../../components/ui/Button.jsx";
import LogoHex from "../../components/LogoHex.jsx";
import { login } from "../../lib/auth.js";

const schema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("buyer");

  const { register, handleSubmit, formState: { errors } } =
    useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values) => {
    try {
      const { user } = await login({ ...values, roleHint: role });
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === "seller" ? "/seller" : "/home", { replace: true });
    } catch (e) {
      toast.error(e?.message || "Login failed");
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        <LogoHex />
        <h1 className="mt-4 text-2xl font-semibold" style={{ color: "var(--brown-700)" }}>
          FurniHive
        </h1>
        <p className="mt-1 text-sm text-[var(--orange-600)]/90">Welcome back</p>
      </div>

      {/* Role selector */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setRole("buyer")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            role === "buyer"
              ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)]"
              : "border-[var(--line-amber)] text-[var(--brown-700)] bg-white hover:bg-[var(--cream-50)]"
          }`}
        >
           Buy furniture
        </button>
        <button
          type="button"
          onClick={() => setRole("seller")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            role === "seller"
              ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)]"
              : "border-[var(--line-amber)] text-[var(--brown-700)] bg-white hover:bg-[var(--cream-50)]"
          }`}
        >
           Sell furniture
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="Enter your email" {...register("email")} />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" placeholder="Enter your password" {...register("password")} />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <Button variant="gradient" className="w-full">Login</Button>

        <div className="text-center text-sm">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-[var(--orange-600)] hover:underline">Sign up</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
