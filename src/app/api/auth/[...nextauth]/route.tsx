import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

/** Ensure Next.js does not statically cache the authentication endpoints */
export const dynamic = "force-dynamic";

// Validate critical environment variables before application startup
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
          
          const identifierStr = credentials.identifier.replace(/[,()"]/g, "").toLowerCase().trim();

          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const { data: user, error } = await supabase
            .from("users")
            .select("id, email, username, password_hash, is_verified")
            .or(`email.eq."${identifierStr}",username.eq."${identifierStr}"`)
            .maybeSingle();

          if (error) {
            throw new Error("Database error");
          }

          if (!user) {
            throw new Error("Invalid username, email, or password.");
          }

          if (user.is_verified === false) {
            throw new Error("Please verify your email address to log in.");
          }

          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          
          if (!isValid) {
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
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  debug: process.env.NODE_ENV !== "production",
};

const handler = NextAuth(authOptions);
export const GET = handler;
export const POST = handler;