"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyUserEmail, resendVerificationCode } from "../actions/auth";

const FloatingOTPInput = ({ label, value, onChange, disabled, hasError, shakeTrigger, delay }: any) => (
  <div 
    className={`relative w-full opacity-0 animate-slide-up ${hasError && shakeTrigger ? "animate-shake" : ""}`}
    style={{ animationDelay: delay, animationFillMode: "forwards" }}
  >
    <input
      type="text"
      value={value}
      onChange={onChange}
      disabled={disabled}
      maxLength={6}
      placeholder=" "
      className={`peer w-full rounded-xl border bg-[#1a2229]/80 backdrop-blur-md px-4 pb-2 pt-6 text-center text-3xl tracking-[0.3em] font-bold text-white outline-none transition-all duration-300 focus:bg-[#1e2730] disabled:opacity-50 disabled:cursor-not-allowed ${
        hasError 
          ? "border-red-500/80 focus:border-red-500" 
          : "border-slate-700/50 focus:border-slate-500"
      }`}
    />
    <label className={`absolute left-4 top-4 z-10 origin-[0] -translate-y-3 scale-75 transform text-sm transition-all duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-3 peer-focus:scale-75 ${
      hasError ? "text-red-400" : "text-slate-400"
    }`}>
      {label}
    </label>
  </div>
);

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [cooldown, setCooldown] = useState(120);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (!email) {
      router.push("/register");
    }
  }, [email, router]);

  const triggerError = (msg: string) => {
    setError(msg);
    setShakeTrigger(true);
    setTimeout(() => setShakeTrigger(false), 500);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      triggerError("Code must be 6 digits.");
      return;
    }

    setLoading(true);
    if (!email) return;

    try {
      const result = await verifyUserEmail(email, otp);

      if (result.success) {
        // 🚀 FIX: Routes to the /home folder shown in your file tree
        router.push("/home");
      } else {
        triggerError(result.error || "Verification failed. Please try again.");
      }
    } catch (err) {
      triggerError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    
    setError("");
    setIsResending(true);

    try {
      const result = await resendVerificationCode(email);
      
      if (result.success) {
        setCooldown(120);
        setOtp(""); 
      } else {
        triggerError(result.error || "Failed to resend code.");
      }
    } catch (err) {
      triggerError("An unexpected error occurred while resending.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#080b0e] text-white font-sans selection:bg-slate-500/30 relative overflow-hidden">
      
      {/* Background Soft Glow - toned down heavily to match Instagram/modern app dark modes */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/20 blur-[120px] rounded-full opacity-30" />

      {/* Top Right Back/Close Button */}
      <button 
        onClick={() => router.back()} 
        className="absolute top-6 right-6 p-2 z-50 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-all active:scale-90"
        aria-label="Go back"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div className="flex flex-1 flex-col w-full max-w-[400px] mx-auto px-6 py-10 z-10 relative mt-12">
        
        {/* Header Section */}
        <div className="flex flex-col mb-8 opacity-0 animate-slide-up" style={{ animationDelay: "0ms" }}>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Enter confirmation code</h1>
          <p className="text-sm text-slate-400">
            Enter the 6-digit code we sent to <span className="text-white font-medium">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleVerify} className="w-full space-y-6" noValidate>
          
          <FloatingOTPInput 
            label="Confirmation Code" 
            value={otp} 
            onChange={(e: any) => { 
              const val = e.target.value.replace(/[^0-9]/g, '');
              setOtp(val); 
              if (error) setError(""); 
            }}
            disabled={loading}
            hasError={!!error}
            shakeTrigger={shakeTrigger}
            delay="50ms"
          />

          {error && (
            <p className="text-red-400 text-sm text-center animate-slide-up">
              {error}
            </p>
          )}

          <div className="pt-2 opacity-0 animate-slide-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-white text-black py-3.5 text-sm font-bold transition-all duration-200 hover:bg-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100"
            >
              {loading ? "Verifying..." : "Next"}
            </button>
          </div>
        </form>

        {/* Resend Section */}
        <div className="mt-8 text-center opacity-0 animate-slide-up" style={{ animationDelay: "150ms", animationFillMode: "forwards" }}>
          <button 
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className={`text-sm font-semibold transition-colors ${
              cooldown > 0 
                ? "text-slate-500 cursor-not-allowed" 
                : "text-white hover:text-slate-300 active:text-slate-400"
            }`}
          >
            {isResending ? "Sending..." : cooldown > 0 ? `Resend code in ${cooldown}s` : "I didn't get a code"}
          </button>
        </div>

      </div>
    </div>
  );
}