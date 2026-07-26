"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser, isUsernameAvailable } from "../actions/auth";

const FloatingInput = ({ label, type, value, onChange, onBlur, hasError, shakeTrigger, rightElement, delay }: any) => (
  <div 
    className={`relative w-full opacity-0 animate-slide-up ${hasError && shakeTrigger ? "animate-shake" : ""}`}
    style={{ animationDelay: delay, animationFillMode: "forwards" }}
  >
    <input
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder=" "
      className={`peer w-full rounded-xl border bg-[#1a2229]/80 backdrop-blur-md px-4 pb-2 pt-6 text-sm text-slate-100 outline-none transition-all duration-300 focus:bg-[#1e2730] ${
        hasError 
          ? "border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)] focus:shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
          : "border-slate-700/50 focus:border-[#4fa8ff]/60 focus:shadow-[0_0_20px_rgba(79,168,255,0.15)]"
      }`}
    />
    <label className={`absolute left-4 top-4 z-10 origin-[0] -translate-y-3 scale-75 transform text-sm transition-all duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-3 peer-focus:scale-75 ${
      hasError ? "text-red-400" : "text-slate-400 peer-focus:text-[#4fa8ff]"
    }`}>
      {label}
    </label>
    {rightElement && <div className="absolute right-4 top-3.5 z-20">{rightElement}</div>}
  </div>
);

export default function RegisterPage() {
  const router = useRouter();
  
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [shakeTrigger, setShakeTrigger] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [serverError, setServerError] = useState("");

  // DB Check must be async to await the server action resolution
  const checkUsernameDatabase = async (usernameToCheck: string) => {
    if (usernameToCheck.length > 1) {
      setIsCheckingUsername(true);
      setUsernameAvailable(null);
      
      try {
        const available = await isUsernameAvailable(usernameToCheck);
        setUsernameAvailable(available);
      } catch (error) {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    } else {
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const newErrors: Record<string, boolean> = {};

    if (!emailOrMobile.trim()) newErrors.emailOrMobile = true;
    if (password.length < 6) newErrors.password = true;
    if (!birthday) newErrors.birthday = true;
    if (!fullName.trim()) newErrors.fullName = true;
    if (!username.trim() || usernameAvailable === false) newErrors.username = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      return;
    }

    setErrors({});
    
    const formData = new FormData();
    formData.append("email", emailOrMobile);
    formData.append("password", password);
    formData.append("fullName", fullName);
    formData.append("username", username);
    formData.append("birthday", birthday);

    try {
      const result = await registerUser(formData);
      if (result.success) {
        router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
      }
    } catch (err: any) {
      setServerError(err.message || "Registration failed. This Email or Username is already taken.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#080b0e] text-white font-sans selection:bg-[#4fa8ff]/30 relative overflow-hidden">
      
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4fa8ff]/10 blur-[120px] rounded-full opacity-50" />

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

      <div className="flex flex-1 flex-col w-full max-w-[400px] mx-auto px-6 py-10 z-10 relative">
        
        <div className="flex flex-col mb-10 opacity-0 animate-slide-up" style={{ animationDelay: "0ms" }}>
          <button onClick={() => router.back()} type="button" className="mb-6 w-fit p-2 -ml-2 rounded-full hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white active:scale-90">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="h-10 w-10 mb-6 rounded-xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 shadow-[0_0_25px_rgba(217,70,239,0.4)] flex items-center justify-center transform transition-transform hover:rotate-12 hover:scale-110">
            <span className="font-bold text-sm tracking-tighter text-white">NX</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create Account</h1>
          <p className="text-sm text-slate-400">Join the active grid. Drop beacons, form squads.</p>
        </div>

        <form onSubmit={handleRegister} className="w-full space-y-4" noValidate>
          
          <FloatingInput 
            label="Email" 
            type="email" 
            value={emailOrMobile} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
              setEmailOrMobile(e.target.value); 
              setErrors(prev => ({...prev, emailOrMobile: false})); 
            }}
            hasError={errors.emailOrMobile}
            shakeTrigger={shakeTrigger}
            delay="50ms"
          />

          <FloatingInput 
            label="Full Name" 
            type="text" 
            value={fullName} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
              setFullName(e.target.value); 
              setErrors(prev => ({...prev, fullName: false})); 
            }}
            hasError={errors.fullName}
            shakeTrigger={shakeTrigger}
            delay="100ms"
          />

          <FloatingInput 
            label="Username" 
            type="text" 
            value={username} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
              // Enforce lowercase and strip all whitespace during typing
              const sanitizedInput = e.target.value.toLowerCase().replace(/\s/g, '');
              setUsername(sanitizedInput); 
              setErrors(prev => ({...prev, username: false}));
              setUsernameAvailable(null); 
            }}
            // Execute DB validation on input blur to prevent excessive API calls
            onBlur={() => checkUsernameDatabase(username)} 
            hasError={errors.username}
            shakeTrigger={shakeTrigger}
            delay="150ms"
            rightElement={
              isCheckingUsername ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-slate-200" />
              ) : usernameAvailable === true ? (
                <svg className="h-5 w-5 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-slide-up" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              ) : usernameAvailable === false ? (
                <svg className="h-5 w-5 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)] animate-slide-up" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : null
            }
          />

          <FloatingInput 
            label="Password" 
            type={showPassword ? "text" : "password"}
            value={password} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
              setPassword(e.target.value); 
              setErrors(prev => ({...prev, password: false})); 
            }}
            hasError={errors.password}
            shakeTrigger={shakeTrigger}
            delay="200ms"
            rightElement={
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="mt-1 flex items-center justify-center text-slate-400 hover:text-white transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            }
          />

          <div 
            className={`relative w-full opacity-0 animate-slide-up ${errors.birthday && shakeTrigger ? "animate-shake" : ""}`}
            style={{ animationDelay: "250ms", animationFillMode: "forwards" }}
          >
            <input
              type="date"
              value={birthday}
              onChange={(e) => { 
                setBirthday(e.target.value); 
                setErrors(prev => ({...prev, birthday: false})); 
              }}
              className={`peer w-full rounded-xl border bg-[#1a2229]/80 backdrop-blur-md px-4 pb-2 pt-6 text-sm text-slate-100 outline-none transition-all duration-300 focus:bg-[#1e2730] [&::-webkit-calendar-picker-indicator]:invert ${
                errors.birthday 
                  ? "border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)] focus:shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
                  : "border-slate-700/50 focus:border-[#4fa8ff]/60 focus:shadow-[0_0_20px_rgba(79,168,255,0.15)]"
              }`}
            />
            <label className={`absolute left-4 top-2 text-[11px] font-medium transition-colors ${errors.birthday ? "text-red-400" : "text-slate-400"}`}>
              Date of Birth
            </label>
          </div>

          {serverError && (
            <p className="text-red-400 text-xs text-center drop-shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-slide-up">
              {serverError}
            </p>
          )}

          <div className="pt-6 opacity-0 animate-slide-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
            <button
              type="submit"
              className="group relative w-full overflow-hidden rounded-xl bg-white text-black py-4 text-sm font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes shimmer {
                  100% { transform: translateX(100%); }
                }
              `}} />
              Continue to Nexus
            </button>
            <p className="mt-5 text-center text-[11px] text-slate-500 font-medium leading-relaxed px-4">
              By continuing, you agree to the Terms of Service.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}