"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyUserEmail, resendVerificationCode } from "../actions/auth";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "your email";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 120-second countdown timer logic
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Robust OTP input handler (handles typing, backspace, and auto-focus)
  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/[^0-9]/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Take last char if they type fast
    setOtp(newOtp);
    setError("");

    // Move forward
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move backward on backspace if current field is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting a 6-digit code directly
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      if (pastedData.length === 6) {
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      // Execute the real database verification action
      const result = await verifyUserEmail(email, code);
      
      if (result.success) {
        // Redirect to profile page upon successful validation
        router.push("/profile"); 
      } else {
        setError(result.error || "Invalid verification code. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;
    setTimeLeft(120);
    setError("");

    try {
      // Trigger the real server action to send a new email
      const result = await resendVerificationCode(email);
      if (!result.success) {
         setError(result.error || "Failed to resend code.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080b0e] text-white font-sans selection:bg-[#4fa8ff]/30 relative overflow-hidden px-6">
      
      {/* Background Glow matching Register Page */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#4fa8ff]/10 blur-[120px] rounded-full opacity-50" />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div className="w-full max-w-[400px] z-10 opacity-0 animate-slide-up">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 mb-6 rounded-2xl bg-[#1a2229]/80 border border-slate-700/50 shadow-[0_0_20px_rgba(79,168,255,0.15)] flex items-center justify-center transform transition-transform hover:scale-110 backdrop-blur-md">
            <svg className="h-6 w-6 text-[#4fa8ff]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Check your email</h1>
          <p className="text-sm text-slate-400">
            We sent a 6-digit code to <br/>
            <span className="font-semibold text-slate-200">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="w-full space-y-8">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                // @ts-ignore - attaching ref for focus management
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`w-12 h-14 rounded-xl border bg-[#1a2229]/80 backdrop-blur-md text-center text-xl font-bold text-white outline-none transition-all duration-300 focus:bg-[#1e2730] ${
                  error 
                    ? "border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)] focus:shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
                    : "border-slate-700/50 focus:border-[#4fa8ff]/60 focus:shadow-[0_0_20px_rgba(79,168,255,0.15)]"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center drop-shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-slide-up -mt-4">
              {error}
            </p>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isVerifying}
              className="group relative w-full overflow-hidden rounded-xl bg-white text-black py-4 text-sm font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:hover:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              {isVerifying ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/80 border-t-transparent" />
                  Verifying...
                </div>
              ) : (
                "Verify Account"
              )}
            </button>

            <div className="text-center text-sm text-slate-400">
              {timeLeft > 0 ? (
                <p>Resend code in <span className="font-semibold text-[#4fa8ff]">{formatTime(timeLeft)}</span></p>
              ) : (
                <p>
                  Didn't receive the code?{" "}
                  <button 
                    type="button" 
                    onClick={handleResend}
                    className="font-semibold text-white hover:text-[#4fa8ff] transition-colors underline decoration-slate-600 underline-offset-4 hover:decoration-[#4fa8ff]"
                  >
                    Resend now
                  </button>
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#080b0e]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4fa8ff] border-t-transparent" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}