import { withAuth } from "next-auth/middleware"; 

export default withAuth({   
  // This tells NextAuth exactly where to send guests when they try to trespass   
  pages: {     
    signIn: "/login",    
  },
}); // <-- YOU WERE MISSING THIS CLOSING BRACE & PARENTHESIS!

export const config = {   
  // Add every route that should be locked down here.    
  matcher: [     
    "/home",             // Lock the exact base path
    "/home/:path*",      // Lock all sub-pages
    "/profile",
    "/profile/:path*",     
    "/hubs",
    "/hubs/:path*",     
    "/events",
    "/events/:path*"   
  ], 
};