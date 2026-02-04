// =============================================
// Trades API Route - Returns all trades for a user
// src/app/api/trades/route.ts
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { Trade } from "@/types";

const WALLET_AUTH_COOKIE = "pisp-wallet-auth";

export async function GET(request: NextRequest) {
  try {
    // Check for wallet auth cookie
    const authCookie = request.cookies.get(WALLET_AUTH_COOKIE);
    if (!authCookie || authCookie.value !== "true") {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }

    // Get wallet address from query parameters
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Wallet address required",
            code: "MISSING_WALLET_ADDRESS",
          },
        },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;

    // Look up user by wallet address to get UUID
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "User not found", code: "USER_NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const userId = user.id;

    // Fetch all trades for the user (no limit)
    const { data: trades, error: tradesError } = (await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("position_closed_at", { ascending: false })) as {
      data: Trade[] | null;
      error: Error | null;
    };

    if (tradesError) {
      throw tradesError;
    }

    return NextResponse.json({
      success: true,
      data: trades || [],
    });
  } catch (error) {
    console.error("Trades API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);

    return NextResponse.json(
      {
        success: false,
        error: { message: errorMessage, code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
