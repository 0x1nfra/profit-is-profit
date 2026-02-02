// =============================================
// Wallet Setup API Route
// src/app/api/wallets/setup/route.ts
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { WalletSetupRequest, WalletSetupResponse, WalletType, Wallet } from "@/types";
import { ApiError } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;

    // Check for wallet auth cookie (set by client when wallet connects)
    const walletAuthCookie = request.cookies.get("pisp-wallet-auth");
    
    if (!walletAuthCookie || walletAuthCookie.value !== "true") {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Unauthorized - Please connect your wallet first", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }

    // Parse request body to get wallet address (used as user ID for wallet-based auth)
    const body: WalletSetupRequest = await request.json();
    const { tradingWalletAddress, vaultWalletAddress } = body;
    
    // Use the trading wallet address as the user ID
    const userId = tradingWalletAddress;

    // Validate wallet addresses
    if (!tradingWalletAddress || !vaultWalletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Both wallet addresses are required", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    // Validate Solana address format (base58, 32-44 chars)
    const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/;
    if (!solanaAddressRegex.test(tradingWalletAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Invalid trading wallet address format", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    if (!solanaAddressRegex.test(vaultWalletAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Invalid vault wallet address format", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    // Ensure wallets are different
    if (tradingWalletAddress === vaultWalletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Trading and vault wallets must be different", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    // Check if user exists, create if not (wallet-based auth)
     
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      throw new Error(`Failed to check existing user: ${userError.message}`);
    }

    if (!existingUser) {
      // Create new user with wallet address as ID
       
      const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: null,
        username: null,
      });

      if (insertError) {
        throw new Error(`Failed to create user: ${insertError.message}`);
      }
    }

    // Check if wallets already exist for this user
     
    const { data: existingWallets } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId) as { data: Wallet[] | null };

    const now = new Date().toISOString();

    // Prepare wallet records
    const tradingWallet = {
      user_id: userId,
      wallet_type: "trading" as const,
      address: tradingWalletAddress,
      balance_sol: 0,
      balance_usd: 0,
      created_at: now,
      updated_at: now,
    };

    const vaultWallet = {
      user_id: userId,
      wallet_type: "vault" as const,
      address: vaultWalletAddress,
      balance_sol: 0,
      balance_usd: 0,
      created_at: now,
      updated_at: now,
    };

    let tradingResult: Wallet;
    let vaultResult: Wallet;

    if (existingWallets && existingWallets.length > 0) {
      // Update existing wallets
      const existingTrading = existingWallets.find(
        (w) => w.wallet_type === WalletType.TRADING
      );
      const existingVault = existingWallets.find(
        (w) => w.wallet_type === WalletType.VAULT
      );

      if (existingTrading) {
         
        const { data } = await supabase
          .from("wallets")
           
          .update({ address: tradingWalletAddress, updated_at: now })
          .eq("id", existingTrading.id)
          .select()
          .single() as { data: Wallet };
        tradingResult = data;
      } else {
         
        const { data } = await supabase
          .from("wallets")
           
          .insert(tradingWallet)
          .select()
          .single() as { data: Wallet };
        tradingResult = data;
      }

      if (existingVault) {
         
        const { data } = await supabase
          .from("wallets")
           
          .update({ address: vaultWalletAddress, updated_at: now })
          .eq("id", existingVault.id)
          .select()
          .single() as { data: Wallet };
        vaultResult = data;
      } else {
         
        const { data } = await supabase
          .from("wallets")
           
          .insert(vaultWallet)
          .select()
          .single() as { data: Wallet };
        vaultResult = data;
      }
    } else {
      // Insert new wallets
       
      const { data: tradingData } = await supabase
        .from("wallets")
         
        .insert(tradingWallet)
        .select()
        .single() as { data: Wallet };
      tradingResult = tradingData;

       
      const { data: vaultData } = await supabase
        .from("wallets")
         
        .insert(vaultWallet)
        .select()
        .single() as { data: Wallet };
      vaultResult = vaultData;
    }

    if (!tradingResult || !vaultResult) {
      throw new Error("Failed to save wallets");
    }

    // Initialize user state if it doesn't exist
     
    const { data: existingUserState } = await supabase
      .from("user_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle() as { data: { id: string } | null };

    if (!existingUserState) {
       
      await supabase.from("user_state").insert({
        user_id: userId,
        current_losing_streak: 0,
        updated_at: now,
      });
    }

    // Initialize goal settings with default if it doesn't exist
     
    const { data: existingGoalSettings } = await supabase
      .from("goal_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle() as { data: { id: string } | null };

    if (!existingGoalSettings) {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
       
      await supabase.from("goal_settings").insert({
        user_id: userId,
        monthly_goal_usd: 400,
        current_month_progress_usd: 0,
        current_month: currentMonth,
        boost_active: false,
        boost_percent: 0,
        created_at: now,
        updated_at: now,
      });
    }

    const response: WalletSetupResponse = {
      success: true,
      wallets: {
        trading: tradingResult,
        vault: vaultResult,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Wallet setup error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.message, code: error.code },
        },
        { status: error.statusCode }
      );
    }

    // TEMPORARY: Include error details for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        success: false,
        error: { message: errorMessage, code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
