"use client"; 
import { useSession, signOut } from "next-auth/react"; 
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {   
  const { status } = useSession();
  const router = useRouter();

  // Enforce authentication via client-side redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Display loading state during session validation
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (     
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">       
      {/* Glassmorphic Card */}       
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl text-center">                  
        {/* Success Icon */}         
        <div className="mb-6 flex justify-center">           
          <div className="h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">             
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">               
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />             
            </svg>           
          </div>         
        </div>                  
        
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Nexus</h1>         
        <p className="text-gray-300 mb-8">           
          Authentication successful. You are officially inside the app.         
        </p>         
        
        {/* NextAuth Sign Out Trigger */}         
        <button            
          onClick={() => signOut({ callbackUrl: '/login' })}           
          className="px-6 py-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-lg text-white font-semibold transition-all duration-300"         
        >           
          Sign Out         
        </button>       
      </div>     
    </div>   
  );
}