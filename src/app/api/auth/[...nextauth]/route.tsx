import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";

// Force the route to run dynamically so Next.js doesn't cache the API response
export const dynamic = "force-dynamic";

// ─── SEC-04 FIX ────────────────────────────────────────────────────────────
// Fatal startup guard: if NEXTAUTH_SECRET is not set, the app refuses to start.
// Previously, the code fell back to a hardcoded string, meaning a misconfigured
// production deployment would silently run with a known, public secret —
// allowing anyone to forge valid JWTs and hijack any account.
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "FATAL: NEXTAUTH_SECRET environment variable is not set. " +
    "The application cannot start without a cryptographically secure secret. " +
    "Set NEXTAUTH_SECRET in your environment before deploying."
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Nexus Account",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      
      async authorize(credentials) {
        try {
          if (!credentials?.identifier || !credentials?.password) {
            return null;
          }
          
          const identifierStr = credentials.identifier.toLowerCase().trim();

          // Initialize Supabase inside the call to prevent early bundle crashes
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          // ─── SEC-07 FIX ──────────────────────────────────────────────────
          // Previously used select("*") which fetched every column including
          // password_hash, verification_token, and any future sensitive fields
          // into the JWT pipeline unnecessarily.
          // Now we select only the fields required for authentication.
          const { data: user, error } = await supabase
            .from("users")
            .select("id, email, username, password_hash, is_verified")
            .or(`email.eq.${identifierStr},username.eq.${identifierStr}`)
            .maybeSingle();

          if (error) {
            throw new Error("Database error");
          }

          if (!user) {
            // 🔥 SECURITY: Generic error to prevent user enumeration
            throw new Error("Invalid username, email, or password.");
          }

          // Blocks login if the user hasn't completed the email OTP verification
          if (user.is_verified === false) {
            throw new Error("Please verify your email address to log in.");
          }

          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          
          if (!isValid) {
            // 🔥 SECURITY: Matches the 'not found' error exactly to stop enumeration
            throw new Error("Invalid username, email, or password.");
          }

          return {
            id: String(user.id),
            email: user.email,
            name: user.username,
          };
        } catch (err: any) {
          throw new Error(err.message || "Login failed");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) session.user.id = token.id;
      return session;
    }
  },
  // ─── SEC-04 FIX ──────────────────────────────────────────────────────────
  // Hardcoded fallback string removed. The startup guard above guarantees
  // NEXTAUTH_SECRET is always defined before this point is reached.
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  // ─── SEC-03 FIX ──────────────────────────────────────────────────────────
  // debug: true was leaking JWT internals and full auth stack traces to the
  // console in production. Now only enabled in development environments.
  debug: process.env.NODE_ENV !== "production",
};

const handler = NextAuth(authOptions);
export const GET = handler;
export const POST = handler;