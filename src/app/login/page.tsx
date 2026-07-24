"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  
  // Form fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  
  // UI and feedback states
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // State for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Check URL query params on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      // Shortened text for a tighter pill
      setSuccessMsg("Password was reset. Welcome back.");
      window.history.replaceState(null, "", "/login");

      // Auto-dismiss the toast after 2.5 seconds
      const timer = setTimeout(() => {
        setSuccessMsg("");
      }, 2500);

      // Cleanup function to prevent memory leaks
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setServerError(""); 
    const newErrors: Record<string, boolean> = {};

    // 1. Validation check
    if (!identifier.trim()) newErrors.identifier = true;
    if (!password) newErrors.password = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      return;
    }

    setErrors({});
    setLoading(true);
    
    try {
      // 2. Trigger NextAuth credentials verification
      const result = await signIn("credentials", {
        redirect: false, 
        identifier: identifier.trim(), 
        password: password
      });

      // 3. Handle Auth response pipeline
      if (result?.error) {
        // Generic error message to prevent user enumeration
        setServerError("Invalid username, email, or password."); 
        setShakeTrigger(true);
        setTimeout(() => setShakeTrigger(false), 500);
      } else if (result?.ok) {
        // Clear any lingering error parameters from browser history
        window.history.replaceState(null, "", "/login");
        
        // Push validated token profile into the home feed
        router.push("/profile"); 
      }
    } catch (err) {
      setServerError("An unexpected connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#121a21] px-4 py-6 text-white font-sans overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pageEnter {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
       @keyframes toastDrop {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-toast-drop {
          animation: toastDrop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-page-enter {
          animation: pageEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        .animate-toast-drop {
          animation: toastDrop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* --- SLEEK FLOATING TOAST NOTIFICATION --- */}
      {successMsg && (
        <div className="fixed top-10 inset-x-0 mx-auto w-max z-[100] flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-[#1e2b36]/90 backdrop-blur-xl px-4 py-2.5 shadow-[0_8px_30px_rgba(16,185,129,0.15)] animate-toast-drop">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="whitespace-nowrap text-[13px] font-medium tracking-wide text-slate-100">
            {successMsg}
          </span>
        </div>
      )}
      {/* ----------------------------------------- */}

      <div className="flex flex-1 flex-col items-center justify-center w-full max-w-sm mx-auto animate-page-enter">
        
        <div className="mb-16 text-[13px] text-slate-300 opacity-0 animate-slide-up" style={{ animationDelay: "0ms" }}>
          English (US)
        </div>

        <div className="mb-12 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 shadow-[0_0_20px_rgba(217,70,239,0.2)] opacity-0 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <span className="font-bold text-xl tracking-tighter text-white">NX</span>
        </div>

        <form onSubmit={handleCredentialsLogin} className="w-full space-y-3.5" noValidate>
          {/* Identifier field */}
          <div className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <input
              type="text"
              disabled={loading}
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setErrors({...errors, identifier: false}); }}
              placeholder="Username, email"
              className={`w-full rounded-xl border bg-[#1e2b36] px-4 py-3.5 text-sm text-slate-200 placeholder-slate-400 outline-none transition-all duration-300 ${
                errors.identifier ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.15)]" : "border-slate-700 focus:border-slate-500"
              } ${(errors.identifier || serverError) && shakeTrigger ? "animate-shake" : ""} disabled:opacity-50`}
            />
          </div>

          {/* Password field with Eye Toggle */}
          <div className="relative opacity-0 animate-slide-up" style={{ animationDelay: "150ms" }}>
            <input
              type={showPassword ? "text" : "password"}
              disabled={loading}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({...errors, password: false}); }}
              placeholder="Password"
              className={`w-full rounded-xl border bg-[#1e2b36] px-4 py-3.5 pr-12 text-sm text-slate-200 placeholder-slate-400 outline-none transition-all duration-300 ${
                errors.password ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.15)]" : "border-slate-700 focus:border-slate-500"
              } ${(errors.password || serverError) && shakeTrigger ? "animate-shake" : ""} disabled:opacity-50`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                // Eye Slash Icon
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                // Normal Eye Icon
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Server Error Log */}
          {serverError && (
            <div className="opacity-0 animate-slide-up" style={{ animationDelay: "175ms" }}>
              <p className="text-red-400 text-sm text-center font-medium drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                {serverError}
              </p>
            </div>
          )}

          {/* Submission Action */}
          <div className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-[#0064e0] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0058c7] active:scale-[0.98] shadow-lg shadow-[#0064e0]/20 disabled:bg-[#0064e0]/50 disabled:scale-100"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </div>
        </form>

        <Link 
          href="/forgot-password"
          className="mt-5 text-[13px] font-medium text-slate-300 hover:text-white transition-colors opacity-0 animate-slide-up block text-center" 
          style={{ animationDelay: "250ms" }}
        >
          Forgot password?
        </Link>
        
        <div className="mt-8 flex w-full items-center gap-3 opacity-0 animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="h-[1px] flex-1 bg-slate-700/50"></div>
          <span className="text-xs font-medium text-slate-400">OR</span>
          <div className="h-[1px] flex-1 bg-slate-700/50"></div>
        </div>
        
        {/* OAuth Integration */}
        <div className="w-full opacity-0 animate-slide-up" style={{ animationDelay: "350ms" }}>
          <button
            onClick={() => !loading && signIn("google")}
            type="button"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-transparent py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

      </div>

      <div className="flex w-full max-w-sm flex-col items-center mx-auto pb-2 opacity-0 animate-slide-up" style={{ animationDelay: "400ms" }}>
        <Link 
          href="/register"
          className="flex justify-center w-full rounded-full border border-[#0064e0] py-2.5 text-sm font-semibold text-[#4fa8ff] transition-all hover:bg-[#0064e0]/10 active:scale-[0.98]"
        >
          Create new account
        </Link>
        
        <div className="mt-5 flex items-center justify-center gap-1.5 text-sm text-slate-400">
          <span className="font-bold text-lg leading-none">∞</span>
          <span className="font-medium">Nexus</span>
        </div>
      </div>
      
    </div>
  );
}