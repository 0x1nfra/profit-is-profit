// =============================================
// Profit is Profit (P is P) - Route Protection Middleware
// src/middleware.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for route protection based on authentication and setup status
 *
 * Rules:
 * - Landing page `/`: If authenticated + setup complete → redirect to /dashboard
 * - Setup page `/setup`: If NOT authenticated → redirect to /
 * - Dashboard `/dashboard`: If NOT authenticated → redirect to /, if authenticated but NO setup → redirect to /setup
 * - API routes: Pass through (handle their own auth)
 *
 * Auth Detection:
 * - Check for `pisp-auth` cookie (set by /api/auth/verify after signature verification)
 * - Check for `pisp-setup-complete` cookie (set by /api/wallets/create after setup)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth state from cookies
  const authCookie = request.cookies.get('pisp-auth');
  const setupCookie = request.cookies.get('pisp-setup-complete');

  const isAuthenticated = !!authCookie?.value;
  const isSetupComplete = setupCookie?.value === 'true';

  // Route protection logic
  switch (pathname) {
    case '/':
      // Landing page: If authenticated + setup complete → go to dashboard
      if (isAuthenticated && isSetupComplete) {
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
      // Dashboard: If authenticated but NO setup → go to setup
      if (isAuthenticated && !isSetupComplete) {
        return NextResponse.redirect(new URL('/setup', request.url));
      }
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
