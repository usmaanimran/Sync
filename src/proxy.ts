import { withAuth } from "next-auth/middleware";

export default withAuth({
  // This tells NextAuth exactly where to send guests when they try to trespass
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Added 'verify-email' to the exclusion list so guests can view the OTP page
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register|verify-email).*)'],
};