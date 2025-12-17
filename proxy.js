import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Edge-compatible configuration for middleware (without EmailProvider and MongoDB adapter)
// When using NextAuth.js in middleware, you need to use the edge-compatible configuration
// This is because the middleware runs in an edge environment, and the EmailProvider is not compatible with edge environments
// The MongoDB adapter is also not compatible with edge environments, so we need to use the edge-compatible configuration
const { auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // On initial sign in, user object is available
      if (user) {
        token.role = user.role || "user";
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role || "user";
      }
      return session;
    },
  },
})

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Protect admin routes - check if user has admin role
  if (pathname.startsWith("/admin")) {
    // If not authenticated, redirect to login
    if (!req.auth) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }
    
    // If authenticated but not admin, redirect to dashboard
    // Note: The role check here uses the JWT token role
    // For full security, the admin layout also performs a server-side check
    if (req.auth?.user?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
  
  // Continue with the request
  return NextResponse.next();
})

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
} 