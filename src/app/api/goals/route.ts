// =============================================
// Goals API Route
// src/app/api/goals/route.ts
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { GoalUpdateRequest, GoalUpdateResponse, GoalSettings } from "@/types";
import { ApiError } from "@/types";
import { randomUUID } from "crypto";

// GET /api/goals - Get current goal settings
export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;

    // Check for wallet auth cookie
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

    // Get user by wallet address from query or use a default lookup
    // For now, get the most recent user (this should be improved with proper session management)
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "User not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    // Get goal settings
    const { data: goalSettings } = await supabase
      .from("goal_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!goalSettings) {
      // Return default goal settings
      const currentMonth = new Date().toISOString().slice(0, 7);
      const defaultSettings: GoalSettings = {
        id: randomUUID(),
        user_id: user.id,
        monthly_goal_usd: 400,
        current_month_progress_usd: 0,
        current_month: currentMonth,
        boost_active: false,
        boost_percent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        goalSettings: defaultSettings,
      });
    }

    return NextResponse.json({
      success: true,
      goalSettings,
    });
  } catch (error) {
    console.error("Get goals error:", error);

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

// PUT /api/goals - Update monthly goal
export async function PUT(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;

    // Check for wallet auth cookie
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

    const body: GoalUpdateRequest = await request.json();
    const { monthlyGoalUsd } = body;

    // Validate goal amount
    if (typeof monthlyGoalUsd !== "number" || monthlyGoalUsd <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Monthly goal must be a positive number", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    // Get user by wallet address from query or use a default lookup
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "User not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const userId = user.id;
    const now = new Date().toISOString();
    const currentMonth = now.slice(0, 10); // YYYY-MM-DD format for date type

    // Check if goal settings exist
    const { data: existingSettings } = await supabase
      .from("goal_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let goalSettings: GoalSettings;

    if (existingSettings) {
      // Update existing goal settings
      const { error: updateError } = await supabase
        .from("goal_settings")
        .update({
          monthly_goal_usd: monthlyGoalUsd,
          updated_at: now,
        })
        .eq("id", existingSettings.id);

      if (updateError) {
        throw new Error(`Failed to update goal settings: ${updateError.message}`);
      }

      goalSettings = {
        ...existingSettings,
        monthly_goal_usd: monthlyGoalUsd,
        updated_at: now,
      };
    } else {
      // Create new goal settings
      const newSettings = {
        id: randomUUID(),
        user_id: userId,
        monthly_goal_usd: monthlyGoalUsd,
        current_month_progress_usd: 0,
        current_month: currentMonth,
        boost_active: false,
        boost_percent: 0,
        created_at: now,
        updated_at: now,
      };

      const { error: insertError } = await supabase
        .from("goal_settings")
        .insert(newSettings);

      if (insertError) {
        throw new Error(`Failed to create goal settings: ${insertError.message}`);
      }

      goalSettings = newSettings as GoalSettings;
    }

    const response: GoalUpdateResponse = {
      success: true,
      goalSettings,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Update goals error:", error);

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
