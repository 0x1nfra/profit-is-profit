-- =============================================
-- Profit is Profit (PisP) - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  username text
);

-- Wallets table
create table if not exists public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  wallet_type text not null check (wallet_type in ('trading', 'vault')),
  address text not null,
  balance_sol numeric not null default 0,
  balance_usd numeric not null default 0,
  current_tier integer,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trades table
create table if not exists public.trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  trading_wallet_id uuid references public.wallets(id),
  token_mint text not null,
  token_symbol text,
  total_entry_sol numeric not null,
  total_exit_sol numeric not null,
  net_profit_sol numeric not null,
  roi_percent numeric not null,
  tier_at_trade integer not null,
  losing_streak_at_trade integer not null default 0,
  base_cashout_percent numeric not null,
  roi_bonus_percent numeric not null default 0,
  streak_multiplier numeric not null default 1,
  goal_boost_multiplier numeric not null default 1,
  final_cashout_percent numeric not null,
  recommended_cashout_sol numeric not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'overridden')),
  actual_cashout_sol numeric,
  position_opened_at timestamptz,
  position_closed_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

-- Cashouts table
create table if not exists public.cashouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  trade_id uuid references public.trades(id),
  amount_sol numeric not null,
  amount_usd numeric not null,
  sol_price_at_cashout numeric not null,
  from_wallet_id uuid references public.wallets(id),
  to_wallet_id uuid references public.wallets(id),
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Goal settings table
create table if not exists public.goal_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  monthly_goal_usd numeric not null default 400,
  current_month_progress_usd numeric not null default 0,
  current_month text not null default to_char(now(), 'YYYY-MM'),
  boost_active boolean not null default false,
  boost_percent numeric not null default 0,
  boost_activated_at timestamptz,
  boost_expires_at timestamptz,
  last_sunday_check timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User state table
create table if not exists public.user_state (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  current_losing_streak integer not null default 0,
  last_trade_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_wallets_address on public.wallets(address);
create index if not exists idx_trades_user_id on public.trades(user_id);
create index if not exists idx_cashouts_user_id on public.cashouts(user_id);
create index if not exists idx_goal_settings_user_id on public.goal_settings(user_id);
create index if not exists idx_user_state_user_id on public.user_state(user_id);
