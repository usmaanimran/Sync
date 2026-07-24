"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// 1. THIS IS THE INNER COMPONENT
// It handles the search params and your actual verification logic.
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  
  // Example: grabbing a token or email from the URL (e.g., ?token=123)
  const token = searchParams.get("token");

  // TODO: Put your existing verification logic or API calls here
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1>Verifying your email...</h1>
      {/* Paste your existing form or UI here */}
      <p>Processing token: {token}</p> 
    </div>
  );
}

// 2. THIS IS THE MAIN PAGE COMPONENT
// It does nothing but wrap the inner component in the required Suspense boundary.
export default function VerifyEmailPage() {
  return (
    // The fallback is what Vercel will render during the build step, 
    // and what users see for a split second while the URL is parsed.
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}