// =============================================
// Profit is Profit (P is P) - Auth Verify API
// src/app/api/auth/verify/route.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { AuthVerifyRequest, AuthVerifyResponse } from '@/types/wallet';
import type { Database } from '@/types/database';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: AuthVerifyRequest = await request.json();
    const { publicKey, message, signature } = body;

    // Validate required fields
    if (!publicKey || !message || !signature) {
      const response: AuthVerifyResponse = {
        success: false,
        error: 'Missing required fields: publicKey, message, and signature are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Decode public key from base58
    let publicKeyBytes: Uint8Array;
    try {
      publicKeyBytes = bs58.decode(publicKey);
    } catch (error) {
      const response: AuthVerifyResponse = {
        success: false,
        error: 'Invalid public key format',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Decode signature from base58
    let signatureBytes: Uint8Array;
    try {
      signatureBytes = bs58.decode(signature);
    } catch (error) {
      const response: AuthVerifyResponse = {
        success: false,
        error: 'Invalid signature format',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Convert message array to Uint8Array
    const messageBytes = new Uint8Array(message);

    // Verify the signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      const response: AuthVerifyResponse = {
        success: false,
        error: 'Invalid signature',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Signature is valid - find or create user
    // Type assertion needed because supabaseAdmin has conditional typing
    const admin = supabaseAdmin as SupabaseClient<Database>;

    // First, check if a wallet with this address exists
    const walletQuery = await admin
      .from('wallets')
      .select('user_id')
      .eq('address', publicKey)
      .limit(1);

    const existingWallets = walletQuery.data as Array<{ user_id: string }> | null;
    const walletError = walletQuery.error;

    if (walletError) {
      console.error('Error checking wallet:', walletError);
      const response: AuthVerifyResponse = {
        success: false,
        error: 'Database error',
      };
      return NextResponse.json(response, { status: 500 });
    }

    let userId: string;

    if (existingWallets && existingWallets.length > 0) {
      // User already exists with this wallet
      userId = existingWallets[0].user_id;
    } else {
      // Create new user
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
        const response: AuthVerifyResponse = {
          success: false,
          error: 'Failed to create user',
        };
        return NextResponse.json(response, { status: 500 });
      }

      userId = newUser.id;
    }

    // Return success with user ID
    const response: AuthVerifyResponse = {
      success: true,
      userId,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Auth verify error:', error);
    const response: AuthVerifyResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
