import { auth } from "@/auth"
import { NextResponse } from "next/server"

// Define protected routes (prefixes)
const protectedRoutes = ['/dashboard']

export default auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth

  const isProtectedRoute = protectedRoutes.some((route) => 
    nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !isAuthenticated) {
    // Redirect unauthenticated users to login
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
})

// Specify paths where the middleware should run
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
