import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout.jsx";
import Label from "../../components/ui/Label.jsx";
import Input from "../../components/ui/Input.jsx";
import PasswordInput from "../../components/ui/PasswordInput.jsx";
import Button from "../../components/ui/Button.jsx";
import LogoHex from "../../components/LogoHex.jsx";
import { signup as signupApi } from "../../lib/auth.js";
import Modal from "../../components/ui/Modal.jsx";

/* ---------- Validation ---------- */
const baseSchema = z.object({
  role: z.enum(["buyer", "seller"]),
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  terms: z.boolean().refine(v => v === true, { message: "You must agree to continue" }),
});

const sellerExtras = z.object({
  storeName: z.string().min(2, "Store name required"),
  phone: z
    .string()
    .min(10, "Phone number required")
    .regex(/^(?:\+63|0)9\d{9}$/, "Use PH mobile format: +639XXXXXXXXX or 09XXXXXXXXX"),
});

const schema = baseSchema
  .and(
    z.discriminatedUnion("role", [
      z.object({ role: z.literal("buyer") }),
      // Keep option as ZodObject by merging seller extras instead of intersecting
      z.object({ role: z.literal("seller") }).merge(sellerExtras),
    ])
  )
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* ---------- Component ---------- */
export default function Signup() {
  const [role, setRole] = useState("buyer");
  const navigate = useNavigate();
  const [successOpen, setSuccessOpen] = useState(false);
  const [nextPath, setNextPath] = useState("/home");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "buyer",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
      // seller-only defaults
      storeName: "",
      phone: "",
    },
  });

  // keep hidden field in sync
  useEffect(() => setValue("role", role), [role, setValue]);

  const onSubmit = async (values) => {
    try {
      const { user, session } = await signupApi(values);
      setNextPath("/login");
      setSuccessOpen(true);
    } catch (e) {
      toast.error(e?.message || "Sign up failed");
    }
  };

  return (
    <>
    <AuthLayout>
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <LogoHex />
        <h1 className="mt-4 text-2xl font-semibold" style={{ color: "var(--brown-700)" }}>
          FurniHive
        </h1>
        <p className="mt-1 text-sm text-[var(--orange-600)]/90">
          Join the furniture marketplace community
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 w-full">
        <div className="tab-bg rounded-full p-1 flex gap-1">
          <Link
            to="/login"
            className="flex-1 rounded-full py-2 text-sm font-semibold text-[var(--brown-700)] text-center"
          >
            Login
          </Link>
          <button
            className="flex-1 rounded-full py-2 text-sm font-semibold bg-gradient-to-r from-[var(--orange-600)] to-[var(--amber-500)] text-white shadow"
            type="button"
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Sign Up Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {/* Role selector */}
        <div>
          <p className="text-sm font-medium text-[var(--brown-700)] mb-2">I want to:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
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
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                role === "seller"
                  ? "bg-[var(--orange-600)] text-white border-[var(--orange-600)]"
                  : "border-[var(--line-amber)] text-[var(--brown-700)] bg-white hover:bg-[var(--cream-50)]"
              }`}
            >
               Sell Furniture
            </button>
          </div>
          <input type="hidden" {...register("role")} value={role} readOnly />
          {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" placeholder="First Name" {...register("firstName")} />
            {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" placeholder="Last Name" {...register("lastName")} />
            {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="Enter your email" {...register("email")} />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        {/* Passwords */}
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" placeholder="Create a password" {...register("password")} />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput id="confirmPassword" placeholder="Confirm your password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Seller-only fields */}
        {role === "seller" && (
          <>
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input id="storeName" placeholder="Your furniture store name" {...register("storeName")} />
              {errors.storeName && <p className="mt-1 text-sm text-red-600">{errors.storeName.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+63 912 345 6789" {...register("phone")} />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
            </div>
          </>
        )}

        {/* Terms */}
        <div className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("terms")} className="h-4 w-4 rounded border-gray-300" />
          <span>
            I agree to the{" "}
            <Link to="#" className="text-[var(--orange-600)] hover:underline">Terms of Service</Link> and{" "}
            <Link to="#" className="text-[var(--orange-600)] hover:underline">Privacy Policy</Link>
          </span>
        </div>
        {errors.terms && <p className="text-sm text-red-600">{errors.terms.message}</p>}

        {/* Submit */}
        <Button variant="gradient" className="w-full">Create Account</Button>

        <p className="text-center text-sm text-[var(--brown-700)]/80 mt-4">
          Join thousands of furniture lovers in the Philippines <span className="align-super text-[10px]">PH</span>
        </p>
      </form>
    </AuthLayout>
    <Modal
      open={successOpen}
      onClose={() => {
        setSuccessOpen(false);
        navigate(nextPath, { replace: true });
      }}
    >
      <h2 className="text-lg font-semibold text-[var(--brown-700)]">Account created successfully</h2>
      <p className="mt-2 text-sm text-[var(--brown-700)]/80">Your account has been created.</p>
      <div className="mt-4 flex justify-end">
        <button
          className="rounded-lg bg-[var(--orange-600)] px-4 py-2 text-white hover:brightness-110"
          onClick={() => {
            setSuccessOpen(false);
            navigate(nextPath, { replace: true });
          }}
        >
          Continue
        </button>
      </div>
    </Modal>
    </>
  );
}
