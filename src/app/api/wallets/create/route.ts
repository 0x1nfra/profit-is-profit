// =============================================
// Profit is Profit (P is P) - Wallet Create API
// src/app/api/wallets/create/route.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isAddress } from '@solana/addresses';

interface WalletCreateRequest {
  tradingWallet: string;
  vaultWallet: string;
}

interface WalletCreateResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: WalletCreateRequest = await request.json();
    const { tradingWallet, vaultWallet } = body;

    // Validate required fields
    if (!tradingWallet || !vaultWallet) {
      const response: WalletCreateResponse = {
        success: false,
        error: 'Missing required fields: tradingWallet and vaultWallet are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Server-side validation: both must be valid Solana addresses
    if (!isAddress(tradingWallet)) {
      const response: WalletCreateResponse = {
        success: false,
        error: 'Invalid trading wallet address',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!isAddress(vaultWallet)) {
      const response: WalletCreateResponse = {
        success: false,
        error: 'Invalid vault wallet address',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate addresses are different
    if (tradingWallet === vaultWallet) {
      const response: WalletCreateResponse = {
        success: false,
        error: 'Trading and vault wallets must be different',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Type assertion for supabaseAdmin
    const admin = supabaseAdmin as SupabaseClient<Database>;

    // Get current user by looking up connected wallet address (trading wallet)
    // The user connects with their trading wallet for auth
    const walletQuery = await admin
      .from('wallets')
      .select('user_id')
      .eq('address', tradingWallet)
      .limit(1);

    const existingWallets = walletQuery.data as Array<{ user_id: string }> | null;
    const walletError = walletQuery.error;

    if (walletError) {
      console.error('Error looking up user:', walletError);
      const response: WalletCreateResponse = {
        success: false,
        error: 'Database error',
      };
      return NextResponse.json(response, { status: 500 });
    }

    let userId: string;

    if (existingWallets && existingWallets.length > 0) {
      // User exists
      userId = existingWallets[0].user_id;

      // Check if they already have wallet setup (duplicate setup attempt)
      const existingSetup = await admin
        .from('wallets')
        .select('id, wallet_type')
        .eq('user_id', userId);

      if (existingSetup.data && existingSetup.data.length > 0) {
        // User already has wallets - update instead of insert
        // For MVP, we'll delete existing and create new ones (simpler)
        const deleteResult = await admin
          .from('wallets')
          .delete()
          .eq('user_id', userId);

        if (deleteResult.error) {
          console.error('Error deleting old wallets:', deleteResult.error);
          const response: WalletCreateResponse = {
            success: false,
            error: 'Failed to update wallets',
          };
          return NextResponse.json(response, { status: 500 });
        }
      }
    } else {
      // No existing wallet record - create new user first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userQuery = await (admin as any)
        .from('users')
        .insert({
          email: null,
          username: null,
        })
        .select('id')
        .single();

      const newUser = userQuery.data as { id: string } | null;
      const userError = userQuery.error;

      if (userError || !newUser) {
        console.error('Error creating user:', userError);
        const response: WalletCreateResponse = {
          success: false,
          error: 'Failed to create user',
        };
        return NextResponse.json(response, { status: 500 });
      }

      userId = newUser.id;
    }

    // Insert wallet records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertResult = await (admin as any)
      .from('wallets')
      .insert([
        {
          user_id: userId,
          wallet_type: 'trading',
          address: tradingWallet,
          balance_sol: 0,
          balance_usd: 0,
        },
        {
          user_id: userId,
          wallet_type: 'vault',
          address: vaultWallet,
          balance_sol: 0,
          balance_usd: 0,
        },
      ]);

    if (insertResult.error) {
      console.error('Error inserting wallets:', insertResult.error);
      const response: WalletCreateResponse = {
        success: false,
        error: 'Failed to save wallets',
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Success
    const response: WalletCreateResponse = {
      success: true,
    };

    // Set setup-complete cookie for middleware
    const nextResponse = NextResponse.json(response, { status: 201 });

    nextResponse.cookies.set('pisp-setup-complete', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return nextResponse;
  } catch (error) {
    console.error('Wallet create error:', error);
    const response: WalletCreateResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
