"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // We initialize the client inside a useState hook to ensure that cache data 
  // isn't accidentally shared across users if server-side rendering is triggered.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keeps data fresh in the device RAM for 60 seconds.
            // When a user swaps between the Hub and the Clan system within this window,
            // it will load instantly in 0ms without hitting Supabase.
            staleTime: 60 * 1000, 
            // Prevents database spam if the user minimizes and reopens the browser
            refetchOnWindowFocus: false, 
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}