// =============================================
// Profit is Profit (P is P) - Auth Sign Out API
// src/app/api/auth/signout/route.ts
// =============================================

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true }, { status: 200 });

    // Clear auth cookies
    response.cookies.delete('pisp-auth');
    response.cookies.delete('pisp-setup-complete');

    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
