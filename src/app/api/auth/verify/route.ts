// =============================================
// Profit is Profit (P is P) - Auth Verify API
// src/app/api/auth/verify/route.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

interface AuthVerifyRequest {
  publicKey: string;
  message: number[];
  signature: string;
}

interface AuthVerifyResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AuthVerifyRequest = await request.json();
    const { publicKey, message, signature } = body;

    // Validate required fields
    if (!publicKey || !message || !signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' } as AuthVerifyResponse,
        { status: 400 }
      );
    }

    // Decode public key from base58
    let publicKeyBytes: Uint8Array;
    try {
      publicKeyBytes = bs58.decode(publicKey);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid public key format' } as AuthVerifyResponse,
        { status: 400 }
      );
    }

    // Decode signature from base58
    let signatureBytes: Uint8Array;
    try {
      signatureBytes = bs58.decode(signature);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid signature format' } as AuthVerifyResponse,
        { status: 400 }
      );
    }

    // Verify wallet signature (nacl Ed25519)
    const messageBytes = new Uint8Array(message);
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' } as AuthVerifyResponse,
        { status: 401 }
      );
    }

    // Sign a Convex JWT — wallet public key is the user identity
    const privateKeyPem = process.env.JWT_PRIVATE_KEY!;
    const privateKey = await importPKCS8(privateKeyPem, 'RS256');
    const siteUrl = process.env.CONVEX_SITE_URL!;

    const convexToken = await new SignJWT({ sub: publicKey })
      .setProtectedHeader({ alg: 'RS256', kid: 'pisp-key-1' })
      .setIssuedAt()
      .setIssuer(siteUrl)
      .setAudience('profit-is-profit')
      .setExpirationTime('7d')
      .sign(privateKey);

    // Cookie settings
    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    };

    const response = NextResponse.json(
      { success: true } as AuthVerifyResponse,
      { status: 200 }
    );

    // pisp-auth: httpOnly — middleware reads this to check auth state
    response.cookies.set('pisp-auth', convexToken, {
      ...cookieOptions,
      httpOnly: true,
    });

    // pisp-convex-token: NOT httpOnly — ConvexProviderWithAuth reads this client-side
    response.cookies.set('pisp-convex-token', convexToken, {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (error) {
    console.error('Auth verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as AuthVerifyResponse,
      { status: 500 }
    );
  }
}
