// =============================================
// Profit is Profit (PisP) - Database Types
// src/types/database.ts
// Auto-generated types for Supabase
// =============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string | null;
          username: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          username?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          username?: string | null;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          wallet_type: "trading" | "vault";
          address: string;
          balance_sol: number;
          balance_usd: number;
          current_tier: number | null;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_type: "trading" | "vault";
          address: string;
          balance_sol?: number;
          balance_usd?: number;
          current_tier?: number | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          wallet_type?: "trading" | "vault";
          address?: string;
          balance_sol?: number;
          balance_usd?: number;
          current_tier?: number | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          trading_wallet_id: string | null;
          token_mint: string;
          token_symbol: string | null;
          total_entry_sol: number;
          total_exit_sol: number;
          net_profit_sol: number;
          roi_percent: number;
          tier_at_trade: number;
          losing_streak_at_trade: number;
          base_cashout_percent: number;
          roi_bonus_percent: number;
          streak_multiplier: number;
          goal_boost_multiplier: number;
          final_cashout_percent: number;
          recommended_cashout_sol: number;
          status: "pending" | "confirmed" | "overridden";
          actual_cashout_sol: number | null;
          position_opened_at: string | null;
          position_closed_at: string;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          trading_wallet_id?: string | null;
          token_mint: string;
          token_symbol?: string | null;
          total_entry_sol: number;
          total_exit_sol: number;
          net_profit_sol: number;
          roi_percent: number;
          tier_at_trade: number;
          losing_streak_at_trade?: number;
          base_cashout_percent: number;
          roi_bonus_percent?: number;
          streak_multiplier?: number;
          goal_boost_multiplier?: number;
          final_cashout_percent: number;
          recommended_cashout_sol: number;
          status?: "pending" | "confirmed" | "overridden";
          actual_cashout_sol?: number | null;
          position_opened_at?: string | null;
          position_closed_at: string;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          trading_wallet_id?: string | null;
          token_mint?: string;
          token_symbol?: string | null;
          total_entry_sol?: number;
          total_exit_sol?: number;
          net_profit_sol?: number;
          roi_percent?: number;
          tier_at_trade?: number;
          losing_streak_at_trade?: number;
          base_cashout_percent?: number;
          roi_bonus_percent?: number;
          streak_multiplier?: number;
          goal_boost_multiplier?: number;
          final_cashout_percent?: number;
          recommended_cashout_sol?: number;
          status?: "pending" | "confirmed" | "overridden";
          actual_cashout_sol?: number | null;
          position_opened_at?: string | null;
          position_closed_at?: string;
          created_at?: string;
          confirmed_at?: string | null;
        };
      };
      cashouts: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string | null;
          amount_sol: number;
          amount_usd: number;
          sol_price_at_cashout: number;
          from_wallet_id: string | null;
          to_wallet_id: string | null;
          status: "pending" | "confirmed";
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trade_id?: string | null;
          amount_sol: number;
          amount_usd: number;
          sol_price_at_cashout: number;
          from_wallet_id?: string | null;
          to_wallet_id?: string | null;
          status?: "pending" | "confirmed";
          confirmed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trade_id?: string | null;
          amount_sol?: number;
          amount_usd?: number;
          sol_price_at_cashout?: number;
          from_wallet_id?: string | null;
          to_wallet_id?: string | null;
          status?: "pending" | "confirmed";
          confirmed_at?: string | null;
          created_at?: string;
        };
      };
      goal_settings: {
        Row: {
          id: string;
          user_id: string;
          monthly_goal_usd: number;
          current_month_progress_usd: number;
          current_month: string;
          boost_active: boolean;
          boost_percent: number;
          boost_activated_at: string | null;
          boost_expires_at: string | null;
          last_sunday_check: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          monthly_goal_usd?: number;
          current_month_progress_usd?: number;
          current_month?: string;
          boost_active?: boolean;
          boost_percent?: number;
          boost_activated_at?: string | null;
          boost_expires_at?: string | null;
          last_sunday_check?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          monthly_goal_usd?: number;
          current_month_progress_usd?: number;
          current_month?: string;
          boost_active?: boolean;
          boost_percent?: number;
          boost_activated_at?: string | null;
          boost_expires_at?: string | null;
          last_sunday_check?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_state: {
        Row: {
          id: string;
          user_id: string;
          current_losing_streak: number;
          last_trade_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_losing_streak?: number;
          last_trade_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_losing_streak?: number;
          last_trade_at?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
