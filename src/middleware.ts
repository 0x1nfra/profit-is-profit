// =============================================
// Middleware for Route Protection
// src/middleware.ts
// =============================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get wallet auth from cookies (set when wallet connects)
  const walletAuth = request.cookies.get("pisp-wallet-auth");
  
  // Check if user is authenticated (via wallet connection)
  const isAuthenticated = walletAuth?.value === "true";

  // Public routes - allow access without authentication
  if (pathname === "/") {
    // If user is already authenticated, go to dashboard (skip onboarding)
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Health check page is always accessible
  if (pathname === "/health-check") {
    return NextResponse.next();
  }

  // API routes - handle authentication at route level
  if (pathname.startsWith("/api/")) {
    // Allow API routes to handle their own auth
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Onboarding flow is disabled - all authenticated users go to dashboard
  // Skip setup page check - redirect /setup to /dashboard
  if (pathname === "/setup") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dashboard and other protected pages - allow access without setup completion
  if (pathname === "/dashboard" || pathname === "/trades" || pathname === "/goals") {
    return NextResponse.next();
  }

  // Allow all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/setup",
    "/dashboard",
    "/trades",
    "/goals",
    "/api/:path*",
  ],
};
