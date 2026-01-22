-- =============================================
-- Profit is Profit (P is P) - Database Schema
-- Initial Migration
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE,
  username TEXT UNIQUE
);

-- =============================================
-- WALLETS TABLE
-- =============================================
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('trading', 'vault')),
  address TEXT NOT NULL,
  balance_sol DECIMAL(18,9) DEFAULT 0,
  balance_usd DECIMAL(18,2) DEFAULT 0,
  current_tier INTEGER CHECK (current_tier >= 1 AND current_tier <= 5),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, wallet_type)
);

-- =============================================
-- TRADES TABLE
-- =============================================
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trading_wallet_id UUID REFERENCES wallets(id),
  
  -- Trade identification
  token_mint TEXT NOT NULL,
  token_symbol TEXT,
  
  -- Aggregated trade data
  total_entry_sol DECIMAL(18,9) NOT NULL,
  total_exit_sol DECIMAL(18,9) NOT NULL,
  net_profit_sol DECIMAL(18,9) NOT NULL,
  roi_percent DECIMAL(10,2) NOT NULL,
  
  -- Tier & streak at trade time
  tier_at_trade INTEGER NOT NULL CHECK (tier_at_trade >= 1 AND tier_at_trade <= 5),
  losing_streak_at_trade INTEGER NOT NULL DEFAULT 0,
  
  -- Cashout calculation
  base_cashout_percent DECIMAL(5,2) NOT NULL,
  roi_bonus_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  streak_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  goal_boost_multiplier DECIMAL(3,2) DEFAULT 1.0,
  final_cashout_percent DECIMAL(5,2) NOT NULL,
  recommended_cashout_sol DECIMAL(18,9) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'overridden')),
  actual_cashout_sol DECIMAL(18,9),
  
  -- Timestamps
  position_opened_at TIMESTAMPTZ,
  position_closed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- =============================================
-- CASHOUTS TABLE
-- =============================================
CREATE TABLE cashouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id),
  
  amount_sol DECIMAL(18,9) NOT NULL,
  amount_usd DECIMAL(18,2) NOT NULL,
  sol_price_at_cashout DECIMAL(18,2) NOT NULL,
  
  from_wallet_id UUID REFERENCES wallets(id),
  to_wallet_id UUID REFERENCES wallets(id),
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GOAL_SETTINGS TABLE
-- =============================================
CREATE TABLE goal_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  monthly_goal_usd DECIMAL(18,2) DEFAULT 400.00,
  current_month_progress_usd DECIMAL(18,2) DEFAULT 0,
  current_month DATE DEFAULT DATE_TRUNC('month', NOW()),
  
  -- Goal boost tracking
  boost_active BOOLEAN DEFAULT FALSE,
  boost_percent DECIMAL(5,2) DEFAULT 0,
  boost_activated_at TIMESTAMPTZ,
  boost_expires_at TIMESTAMPTZ,
  
  last_sunday_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER_STATE TABLE
-- =============================================
CREATE TABLE user_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  current_losing_streak INTEGER DEFAULT 0,
  last_trade_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Wallets
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_address ON wallets(address);

-- Trades
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_token_mint ON trades(token_mint);

-- Cashouts
CREATE INDEX idx_cashouts_user_id ON cashouts(user_id);
CREATE INDEX idx_cashouts_trade_id ON cashouts(trade_id);
CREATE INDEX idx_cashouts_created_at ON cashouts(created_at DESC);

-- Goal Settings
CREATE INDEX idx_goal_settings_user_id ON goal_settings(user_id);

-- User State
CREATE INDEX idx_user_state_user_id ON user_state(user_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for goal_settings table
CREATE TRIGGER update_goal_settings_updated_at 
  BEFORE UPDATE ON goal_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_state table
CREATE TRIGGER update_user_state_updated_at 
  BEFORE UPDATE ON user_state 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- Wallets policies
CREATE POLICY "Users can view their own wallets" 
  ON wallets FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallets" 
  ON wallets FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallets" 
  ON wallets FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own wallets" 
  ON wallets FOR DELETE 
  USING (user_id = auth.uid());

-- Trades policies
CREATE POLICY "Users can view their own trades" 
  ON trades FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own trades" 
  ON trades FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own trades" 
  ON trades FOR UPDATE 
  USING (user_id = auth.uid());

-- Cashouts policies
CREATE POLICY "Users can view their own cashouts" 
  ON cashouts FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own cashouts" 
  ON cashouts FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own cashouts" 
  ON cashouts FOR UPDATE 
  USING (user_id = auth.uid());

-- Goal settings policies
CREATE POLICY "Users can view their own goal settings" 
  ON goal_settings FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own goal settings" 
  ON goal_settings FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own goal settings" 
  ON goal_settings FOR UPDATE 
  USING (user_id = auth.uid());

-- User state policies
CREATE POLICY "Users can view their own state" 
  ON user_state FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own state" 
  ON user_state FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own state" 
  ON user_state FOR UPDATE 
  USING (user_id = auth.uid());

-- =============================================
-- SEED DATA (Optional - for testing)
-- =============================================

-- Create a test user (comment out in production)
-- INSERT INTO users (id, email, username) 
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'test@profitisprofit.app',
--   'testuser'
-- );

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify all tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;

-- Verify indexes
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public';