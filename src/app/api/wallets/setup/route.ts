// =============================================
// Wallet Setup API Route
// src/app/api/wallets/setup/route.ts
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { WalletSetupRequest, WalletSetupResponse, WalletType, Wallet } from "@/types";
import { ApiError } from "@/types";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Use admin client to bypass RLS for server-side user/wallet creation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;

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

    // Parse request body to get wallet address
    const body: WalletSetupRequest = await request.json();
    const { tradingWalletAddress, vaultWalletAddress } = body;

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

    // Check if user exists by wallet address, create if not
     
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", tradingWalletAddress)
      .maybeSingle();

    if (userError) {
      throw new Error(`Failed to check existing user: ${userError.message}`);
    }

    let userId: string;

    if (!existingUser) {
      // Generate UUID for new user
      userId = randomUUID();
      
      // Create new user with UUID and wallet address
      const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        wallet_address: tradingWalletAddress,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: null,
        username: null,
      });

      if (insertError) {
        throw new Error(`Failed to create user: ${insertError.message}`);
      }
    } else {
      userId = existingUser.id;
    }

    // Check if wallets already exist for this user
     
    const { data: existingWallets } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId) as { data: Wallet[] | null };

    const now = new Date().toISOString();

    // Prepare wallet records
    const tradingWallet: Wallet = {
      id: randomUUID(),
      user_id: userId,
      wallet_type: WalletType.TRADING,
      address: tradingWalletAddress,
      balance_sol: 0,
      balance_usd: 0,
      created_at: now,
    };

    const vaultWallet: Wallet = {
      id: randomUUID(),
      user_id: userId,
      wallet_type: WalletType.VAULT,
      address: vaultWalletAddress,
      balance_sol: 0,
      balance_usd: 0,
      created_at: now,
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
        // Just update the address - skip updated_at to avoid schema cache issues
        const { error: updateError } = await supabase
          .from("wallets")
          .update({ address: tradingWalletAddress })
          .eq("id", existingTrading.id);
        if (updateError) throw new Error(`Failed to update trading wallet: ${updateError.message}`);
        tradingResult = { ...existingTrading, address: tradingWalletAddress };
      } else {
        const { error: insertError } = await supabase
          .from("wallets")
          .insert(tradingWallet);
        if (insertError) throw new Error(`Failed to insert trading wallet: ${insertError.message}`);
        tradingResult = tradingWallet;
      }

      if (existingVault) {
        // Just update the address - skip updated_at to avoid schema cache issues
        const { error: updateError } = await supabase
          .from("wallets")
          .update({ address: vaultWalletAddress })
          .eq("id", existingVault.id);
        if (updateError) throw new Error(`Failed to update vault wallet: ${updateError.message}`);
        vaultResult = { ...existingVault, address: vaultWalletAddress };
      } else {
        const { error: insertError } = await supabase
          .from("wallets")
          .insert(vaultWallet);
        if (insertError) throw new Error(`Failed to insert vault wallet: ${insertError.message}`);
        vaultResult = vaultWallet;
      }
    } else {
      // Insert new wallets
      const { error: tradingError } = await supabase
        .from("wallets")
        .insert(tradingWallet);
      if (tradingError) throw new Error(`Failed to insert trading wallet: ${tradingError.message}`);
      tradingResult = tradingWallet;

      const { error: vaultError } = await supabase
        .from("wallets")
        .insert(vaultWallet);
      if (vaultError) throw new Error(`Failed to insert vault wallet: ${vaultError.message}`);
      vaultResult = vaultWallet;
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

    return NextResponse.json(
      {
        success: false,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
