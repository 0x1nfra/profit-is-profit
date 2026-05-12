// =============================================
// Profit is Profit (P is P) - Route Protection Middleware
// src/middleware.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for route protection based on authentication state.
 *
 * Rules:
 * - Landing page `/`: If authenticated → redirect to /dashboard
 * - Setup page `/setup`: If NOT authenticated → redirect to /
 * - Dashboard `/dashboard`: If NOT authenticated → redirect to /
 * - Setup detection is handled client-side: dashboard useQuery(wallets) redirects
 *   to /setup when wallets array is empty.
 * - API routes: Pass through (handle their own auth)
 *
 * Auth Detection:
 * - Check for `pisp-auth` cookie (httpOnly, set by /api/auth/verify after signature verification)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth state from cookies
  const authCookie = request.cookies.get('pisp-auth');
  const isAuthenticated = !!authCookie?.value;

  // Route protection logic
  switch (pathname) {
    case '/':
      // Landing page: If authenticated → go to dashboard
      // (Dashboard handles setup redirect if wallets are empty)
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      break;

    case '/setup':
      // Setup page: If NOT authenticated → go to landing
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      break;

    case '/dashboard':
      // Dashboard: If NOT authenticated → go to landing
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      // Setup detection is client-side — no cookie check here
      break;

    default:
      // All other routes pass through
      break;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/setup/:path*',
    '/dashboard/:path*',
  ],
};
