// =============================================
// Profit is Profit (PisP) - Trade Refresh API
// src/app/api/trades/refresh/route.ts
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { TradeRefreshRequest, TradeRefreshResponse } from "@/types";
import { ApiError, ValidationError } from "@/types";
import { syncTrades } from "@/lib/services/trade-service";
import { isValidSolanaAddress } from "@/lib/helpers/helius-helpers";
import type { Database } from "@/types/database";

// =============================================
// POST /api/trades/refresh
// =============================================

/**
 * POST handler for refreshing trades from Helius
 * Syncs new transactions, parses them into trades, and updates the database
 *
 * Request Body:
 * - walletAddress: string (required) - The trading wallet address to sync
 *
 * Response:
 * - success: boolean
 * - newTrades: Trade[] - Array of newly created trades
 * - updatedBalances: { trading: number, vault: number }
 *
 * Error Responses:
 * - 400: Invalid wallet address or missing parameters
 * - 401: User not authenticated
 * - 404: Wallet not found
 * - 429: Rate limited by Helius API
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<TradeRefreshResponse | { error: string; code?: string }>> {
  try {
    // Parse request body
    let body: TradeRefreshRequest;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body", code: "INVALID_JSON" },
        { status: 400 },
      );
    }

    const { walletAddress } = body;

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required", code: "MISSING_ADDRESS" },
        { status: 400 },
      );
    }

    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid Solana address format", code: "INVALID_ADDRESS" },
        { status: 400 },
      );
    }

    // Check for wallet auth cookie
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("pisp-wallet-auth");
    
    if (!authCookie || authCookie.value !== "true") {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Look up user by wallet address to get UUID
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .maybeSingle() as { data: { id: string } | null };

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    const userId = user.id;

    // Sync trades
    const result = await syncTrades(walletAddress, userId);

    // Return success response
    const response: TradeRefreshResponse = {
      success: true,
      newTrades: result.newTrades,
      updatedBalances: result.updatedBalances,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Trade refresh API error:", error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}


