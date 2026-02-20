// =============================================
// Profit is Profit (P is P) - User Wallets API
// src/app/api/wallets/user/route.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

interface UserWalletsResponse {
  success: boolean;
  wallets?: Array<{
    id: string;
    address: string;
    wallet_type: 'trading' | 'vault';
  }>;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get connected address from query params
    const { searchParams } = new URL(request.url);
    const connectedAddress = searchParams.get('address');

    if (!connectedAddress) {
      const response: UserWalletsResponse = {
        success: false,
        error: 'Missing address query parameter',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Type assertion for supabaseAdmin
    const admin = supabaseAdmin as SupabaseClient<Database>;

    // Find user by connected address
    const walletQuery = await admin
      .from('wallets')
      .select('user_id')
      .eq('address', connectedAddress)
      .limit(1);

    const walletsData = walletQuery.data as Array<{ user_id: string }> | null;
    const walletsError = walletQuery.error;

    if (walletsError) {
      console.error('Error looking up user:', walletsError);
      const response: UserWalletsResponse = {
        success: false,
        error: 'Database error',
      };
      return NextResponse.json(response, { status: 500 });
    }

    if (!walletsData || walletsData.length === 0) {
      // No wallets found - user hasn't completed setup
      const response: UserWalletsResponse = {
        success: true,
        wallets: [],
      };
      return NextResponse.json(response, { status: 200 });
    }

    const userId = walletsData[0].user_id;

    // Fetch all wallets for this user
    const { data: userWallets, error: userWalletsError } = await admin
      .from('wallets')
      .select('id, address, wallet_type')
      .eq('user_id', userId);

    if (userWalletsError) {
      console.error('Error fetching user wallets:', userWalletsError);
      const response: UserWalletsResponse = {
        success: false,
        error: 'Failed to fetch wallets',
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: UserWalletsResponse = {
      success: true,
      wallets: userWallets as Array<{
        id: string;
        address: string;
        wallet_type: 'trading' | 'vault';
      }>,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('User wallets API error:', error);
    const response: UserWalletsResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
