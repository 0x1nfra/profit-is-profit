// =============================================
// Profit is Profit (P is P) - Supabase Client
// src/lib/supabase.ts
// =============================================

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file.",
  );
}

// =============================================
// CLIENT-SIDE SUPABASE CLIENT
// =============================================

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// =============================================
// SERVER-SIDE SUPABASE CLIENT (for API routes)
// =============================================

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return user;
}

/**
 * Get user ID from session (for API routes)
 */
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

// =============================================
// TYPE-SAFE QUERY HELPERS
// =============================================

/**
 * Type-safe query builder for users table
 */
export const usersQuery = () => supabase.from("users");

/**
 * Type-safe query builder for wallets table
 */
export const walletsQuery = () => supabase.from("wallets");

/**
 * Type-safe query builder for trades table
 */
export const tradesQuery = () => supabase.from("trades");

/**
 * Type-safe query builder for cashouts table
 */
export const cashoutsQuery = () => supabase.from("cashouts");

/**
 * Type-safe query builder for goal_settings table
 */
export const goalSettingsQuery = () => supabase.from("goal_settings");

/**
 * Type-safe query builder for user_state table
 */
export const userStateQuery = () => supabase.from("user_state");

// =============================================
// ERROR HANDLING
// =============================================

export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "SupabaseError";
  }
}

/**
 * Handle Supabase errors consistently
 */
export function handleSupabaseError(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    const supabaseError = error as {
      message: string;
      code?: string;
      details?: unknown;
    };
    throw new SupabaseError(
      supabaseError.message,
      supabaseError.code,
      supabaseError.details,
    );
  }

  throw new Error("An unknown database error occurred");
}

// =============================================
// REALTIME SUBSCRIPTIONS (Optional for future use)
// =============================================

/**
 * Subscribe to wallet balance changes
 */
export function subscribeToWalletChanges(
  userId: string,
  callback: (wallet: any) => void,
) {
  return supabase
    .channel(`wallets:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "wallets",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe();
}

/**
 * Subscribe to new trades
 */
export function subscribeToNewTrades(
  userId: string,
  callback: (trade: any) => void,
) {
  return supabase
    .channel(`trades:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "trades",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe();
}
