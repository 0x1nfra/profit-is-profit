// =============================================
// Dashboard API Route
// src/app/api/dashboard/route.ts
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DashboardData, WalletType, Wallet } from "@/types";
import { calculateTier, getTierConfig } from "@/lib/tier-calculator";
import { DEFAULTS } from "@/lib/constants";

const WALLET_AUTH_COOKIE = "pisp-wallet-auth";

export async function GET(request: NextRequest) {
  try {
    // Check for wallet auth cookie
    const authCookie = request.cookies.get(WALLET_AUTH_COOKIE);
    if (!authCookie || authCookie.value !== "authenticated") {
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

    // Use wallet address as user_id
    const userId = walletAddress;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;

    // Fetch user wallets
     
    const { data: wallets, error: walletsError } = (await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)) as { data: Wallet[] | null; error: Error | null };

    if (walletsError) {
      throw walletsError;
    }

    const tradingWallet = wallets?.find(
      (w) => w.wallet_type === WalletType.TRADING
    );
    const vaultWallet = wallets?.find((w) => w.wallet_type === WalletType.VAULT);

    // If no wallets found, return setup incomplete
    if (!tradingWallet || !vaultWallet) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Setup incomplete", code: "SETUP_INCOMPLETE" },
        },
        { status: 400 }
      );
    }

    // Calculate current tier based on trading wallet balance
    const currentTier = calculateTier(tradingWallet.balance_sol);
    const tierConfig = getTierConfig(currentTier);

    // Fetch recent trades (last 5)
     
    const { data: recentTrades, error: tradesError } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("position_closed_at", { ascending: false })
      .limit(5);

    if (tradesError) {
      throw tradesError;
    }

    // Fetch goal settings
     
    const { data: goalSettings, error: goalError } = await supabase
      .from("goal_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (goalError && goalError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw goalError;
    }

    // Calculate goal progress
    const monthlyGoal =
      goalSettings?.monthly_goal_usd || DEFAULTS.MONTHLY_GOAL_USD;
    const currentProgress = goalSettings?.current_month_progress_usd || 0;
    const progressPercent = Math.min(
      100,
      Math.round((currentProgress / monthlyGoal) * 100)
    );

    // Determine if on track (based on current week of month)
    const now = new Date();
    const weekOfMonth = Math.ceil(now.getDate() / 7);
    const weeklyPace = monthlyGoal / 4;
    const isOnTrack = currentProgress >= weeklyPace * weekOfMonth;

    // Calculate boost suggestion if behind pace
    let boostSuggestion;
    if (!isOnTrack && progressPercent < 100) {
      const gapAmount = weeklyPace * weekOfMonth - currentProgress;
      // Determine boost percentage based on gap
      let suggestedBoostPercent = 5;
      if (gapAmount > 200) {
        suggestedBoostPercent = 20;
      } else if (gapAmount > 100) {
        suggestedBoostPercent = 15;
      } else if (gapAmount > 50) {
        suggestedBoostPercent = 10;
      }

      boostSuggestion = {
        gapAmount: Math.round(gapAmount),
        suggestedBoostPercent,
      };
    }

    // Fetch user state
     
    const { data: userState, error: stateError } = await supabase
      .from("user_state")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (stateError && stateError.code !== "PGRST116") {
      throw stateError;
    }

    const dashboardData: DashboardData = {
      wallets: {
        trading: tradingWallet,
        vault: vaultWallet,
      },
      currentTier,
      tierConfig,
      recentTrades: recentTrades || [],
      goalProgress: {
        monthlyGoal,
        currentProgress,
        progressPercent,
        weeklyPace,
        isOnTrack,
        boostSuggestion,
      },
      userState: userState || {
        id: "",
        user_id: userId,
        current_losing_streak: 0,
        last_trade_at: null,
        updated_at: new Date().toISOString(),
      },
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
