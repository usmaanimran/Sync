"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordReset, resetPassword } from "../actions/auth";

// Reusing your sleek FloatingInput component style
const FloatingInput = ({ label, type, value, onChange, disabled, hasError, shakeTrigger, delay, rightElement }: any) => (
  <div 
    className={`relative w-full opacity-0 animate-slide-up ${hasError && shakeTrigger ? "animate-shake" : ""}`}
    style={{ animationDelay: delay, animationFillMode: "forwards" }}
  >
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder=" "
      className={`peer w-full rounded-xl border bg-[#1a2229]/80 backdrop-blur-md px-4 pb-2 pt-6 text-sm text-slate-100 outline-none transition-all duration-300 focus:bg-[#1e2730] disabled:opacity-50 ${
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
    {rightElement && <div className="absolute right-4 top-3.5 z-20">{rightElement}</div>}
  </div>
);

export default function PasswordResetPage() {
  const router = useRouter();

  // Flow State: 1 = Enter Email, 2 = Enter Code & New Password
  const [step, setStep] = useState(1);
  
  // Form State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // UI State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(false);

  const triggerError = (msg: string) => {
    setError(msg);
    setShakeTrigger(true);
    setTimeout(() => setShakeTrigger(false), 500);
  };

  const handleBack = () => {
    if (step === 2) {
      // If on the code step, just go back to the email input
      setStep(1);
      setError("");
    } else {
      // If already on the email step, go back to login
      router.push("/login");
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      triggerError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setStep(2); 
      } else {
        triggerError("Failed to process request.");
      }
    } catch (err) {
      triggerError("A system error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      triggerError("Authorization code must be 6 digits.");
      return;
    }
    if (password.length < 6) {
      triggerError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      triggerError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email, otp, password);
      
      if (result.success) {
        // Silently route them back to the login page with a success flag
        router.push("/login?reset=success");
      } else {
        triggerError(result.error || "Failed to reset password.");
      }
    } catch (err) {
      triggerError("A system error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#080b0e] text-white font-sans selection:bg-slate-500/30 relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/20 blur-[120px] rounded-full opacity-30" />

      {/* Intelligent Back Button */}
      <button 
        onClick={handleBack} 
        type="button"
        className="absolute top-6 left-6 p-2 z-50 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-all active:scale-90"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />

      <div className="flex flex-1 flex-col w-full max-w-[400px] mx-auto px-6 py-10 z-10 relative mt-12">
        <div className="flex flex-col mb-8 opacity-0 animate-slide-up">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            {step === 1 ? "Reset Password" : "Secure New Password"}
          </h1>
          <p className="text-sm text-slate-400">
            {step === 1 
              ? "Enter your email and we'll send you a confirmation code." 
              : `Enter the 6-digit code sent to ${email} and set your new password.`}
          </p>
        </div>

        {step === 1 ? (
          /* STEP 1: REQUEST CODE */
          <form onSubmit={handleRequestReset} className="w-full space-y-6" noValidate>
            <FloatingInput 
              label="Account Email" 
              type="email"
              value={email} 
              onChange={(e: any) => { setEmail(e.target.value); setError(""); }}
              disabled={loading}
              hasError={!!error}
              shakeTrigger={shakeTrigger}
              delay="50ms"
            />
            {error && <p className="text-red-400 text-sm text-center animate-slide-up">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full mt-2 rounded-xl bg-white text-black py-3.5 text-sm font-bold transition-all duration-200 hover:bg-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Checking..." : "Send Reset Code"}
            </button>
          </form>
        ) : (
          /* STEP 2: VERIFY CODE AND SET NEW PASSWORD */
          <form onSubmit={handleExecuteReset} className="w-full space-y-4" noValidate>
            <FloatingInput 
              label="6-Digit Code" 
              type="text"
              value={otp} 
              onChange={(e: any) => { 
                setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); 
                setError(""); 
              }}
              disabled={loading}
              hasError={!!error}
              shakeTrigger={shakeTrigger}
              delay="50ms"
            />
            <FloatingInput 
              label="New Password" 
              type={showPassword ? "text" : "password"}
              value={password} 
              onChange={(e: any) => { setPassword(e.target.value); setError(""); }}
              disabled={loading}
              hasError={!!error}
              shakeTrigger={shakeTrigger}
              delay="100ms"
              rightElement={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="mt-1 text-slate-400 hover:text-white transition-colors focus:outline-none">
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              }
            />
            <FloatingInput 
              label="Confirm New Password" 
              type={showPassword ? "text" : "password"}
              value={confirmPassword} 
              onChange={(e: any) => { setConfirmPassword(e.target.value); setError(""); }}
              disabled={loading}
              hasError={!!error}
              shakeTrigger={shakeTrigger}
              delay="150ms"
            />
            
            {error && <p className="text-red-400 text-sm text-center animate-slide-up mt-2">{error}</p>}
            
            <button
              type="submit"
              disabled={loading || otp.length !== 6 || password.length < 6}
              className="w-full mt-6 rounded-xl bg-white text-black py-3.5 text-sm font-bold transition-all duration-200 hover:bg-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Confirm Password Change"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}