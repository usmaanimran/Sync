import { withAuth } from "next-auth/middleware"; 

export default withAuth({
     // This tells NextAuth exactly where to send guests when they try to trespass
     pages: {
         signIn: "/login",
      },
});  

export const config = {   
  // Add every route that should be locked down here.    
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register).*)'],

};