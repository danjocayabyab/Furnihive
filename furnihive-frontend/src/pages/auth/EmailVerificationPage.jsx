import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import LogoHex from "../../components/LogoHex.jsx";
import Button from "../../components/ui/Button.jsx";

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState("loading"); // loading, success, error, already_verified
  const [message, setMessage] = useState("");
  const [isProcessed, setIsProcessed] = useState(false);

  useEffect(() => {
    // Prevent multiple processing
    if (isProcessed) return;
    
    const verifyEmail = async () => {
      try {
        console.log("Current URL:", window.location.href);
        console.log("Hash fragment:", window.location.hash);
        console.log("Search params:", searchParams.toString());
        
        // Store tokens immediately before React Router can strip them
        const initialHash = window.location.hash;
        const initialSearch = window.location.search;
        
        // Check URL parameters first (for Supabase redirects)
        const urlToken = searchParams.get("token");
        const urlType = searchParams.get("type");
        const urlError = searchParams.get("error");
        const urlErrorDescription = searchParams.get("error_description");
        
        // Check hash fragments (direct email links)
        const hashParams = new URLSearchParams(initialHash.substring(1));
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");
        const hashError = hashParams.get("error");
        const hashErrorDescription = hashParams.get("error_description");
        
        console.log("URL params:", { token: urlToken, type: urlType, error: urlError });
        console.log("Hash params:", { accessToken: hashAccessToken, refreshToken: hashRefreshToken, type: hashType });
        
        // Handle errors from either source
        if (urlError || hashError) {
          const error = urlError || hashError;
          const errorDesc = urlErrorDescription || hashErrorDescription;
          setStatus("error");
          if (error === 'access_denied' && errorDesc?.includes('expired')) {
            setMessage("Verification link has expired. Please request a new verification email.");
          } else {
            setMessage(`Verification failed: ${errorDesc || error}`);
          }
          setIsProcessed(true);
          return;
        }
        
        // Handle Supabase redirect with token parameter
        if (urlToken) {
          console.log("Processing Supabase redirect with token:", urlToken);
          
          // For Supabase redirects, we need to verify the token
          const { data, error } = await supabase.auth.verifyOtp({
            token: urlToken,
            type: urlType || 'signup'
          });
          
          console.log("OTP verification result:", { data, error });
          
          if (error) {
            setStatus("error");
            setMessage(`Verification failed: ${error.message}`);
            setIsProcessed(true);
            return;
          }
          
          if (data.session?.user?.email_confirmed_at) {
            setStatus("success");
            setMessage("Your email has been successfully verified!");
            await refreshUser();
            setIsProcessed(true);
            return;
          }
        }
        
        // Handle direct email links with access tokens
        if (hashAccessToken && hashRefreshToken) {
          console.log("Processing direct email link with tokens");
          
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });

          console.log("Session set result:", { data, error });

          if (error) {
            setStatus("error");
            setMessage(`Verification failed: ${error.message}`);
            setIsProcessed(true);
            return;
          }

          if (data.session?.user?.email_confirmed_at) {
            setStatus("success");
            setMessage("Your email has been successfully verified!");
            await refreshUser();
            setIsProcessed(true);
            return;
          } else {
            setStatus("error");
            setMessage("Email verification failed. The session was created but email confirmation status is not set.");
            setIsProcessed(true);
            return;
          }
        }
        
        // Check if this is a direct access without any verification data
        if (!urlToken && !hashAccessToken && !urlError && !hashError) {
          setStatus("error");
          setMessage("No verification link detected. Please check your email for the verification link or request a new one.");
          setIsProcessed(true);
          return;
        }
        
        setStatus("error");
        setMessage("Email verification failed. Please try again or request a new verification email.");
        setIsProcessed(true);
        
      } catch (error) {
        console.error("Verification process error:", error);
        setStatus("error");
        setMessage(`An error occurred during verification: ${error.message}`);
        setIsProcessed(true);
      }
    };

    verifyEmail();
  }, [searchParams, refreshUser, location, isProcessed]);

  const handleResendVerification = async () => {
    try {
      // Get the email from the current user if available, or prompt for it
      let email = '';
      
      // Try to get email from current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        email = session.user.email;
      } else {
        // Fallback: prompt user for email
        email = prompt('Please enter your email address:');
        if (!email) return;
      }
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });
      
      if (error) {
        toast.error(`Failed to resend: ${error.message}`);
      } else {
        toast.success(`Verification email sent to ${email}! Please check your inbox.`);
      }
    } catch (error) {
      toast.error("Failed to resend verification email");
    }
  };

  const handleContinue = () => {
    navigate("/login", { replace: true });
  };

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        <LogoHex />
        <h1 className="mt-4 text-2xl font-semibold" style={{ color: "var(--brown-700)" }}>
          FurniHive
        </h1>
      </div>

      <div className="mt-8 w-full max-w-md mx-auto">
        {status === "loading" && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--orange-600)]"></div>
            <p className="mt-4 text-sm text-[var(--brown-700)]/80">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--brown-700)]">Email Verified!</h2>
            <p className="mt-2 text-sm text-[var(--brown-700)]/80">{message}</p>
            <Button variant="gradient" className="mt-6 w-full" onClick={handleContinue}>
              Continue to Login
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--brown-700)]">Verification Failed</h2>
            <p className="mt-2 text-sm text-[var(--brown-700)]/80">{message}</p>
            <div className="mt-6 space-y-3">
              <Button variant="outline" className="w-full" onClick={handleResendVerification}>
                Resend Verification Email
              </Button>
              <Button variant="gradient" className="w-full" onClick={() => navigate("/login")}>
                Back to Login
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
