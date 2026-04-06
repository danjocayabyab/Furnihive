import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import LogoHex from "../../components/LogoHex.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Label from "../../components/ui/Label.jsx";

export default function VerificationSentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });
      
      if (error) {
        toast.error(error.message || "Failed to resend verification email");
      } else {
        toast.success("Verification email sent! Please check your inbox.");
      }
    } catch (error) {
      toast.error("Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/login");
  };

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        <LogoHex />
        <h1 className="mt-4 text-2xl font-semibold" style={{ color: "var(--brown-700)" }}>
          FurniHive
        </h1>
      </div>

      <div className="mt-8 w-full max-w-md mx-auto text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h2 className="mt-4 text-lg font-semibold text-[var(--brown-700)]">Check Your Email</h2>
        <p className="mt-2 text-sm text-[var(--brown-700)]/80">
          We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </p>
        <p className="mt-1 text-xs text-[var(--brown-700)]/60">
          If you don't see the email, check your spam folder.
        </p>

        <div className="mt-6 space-y-4">
          <div className="text-left">
            <Label htmlFor="email">Didn't receive the email?</Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={handleResendEmail}
                disabled={loading}
                className="whitespace-nowrap"
              >
                {loading ? "Sending..." : "Resend"}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--line-amber)]">
            <Button variant="gradient" className="w-full" onClick={handleGoToLogin}>
              Continue to Login
            </Button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
