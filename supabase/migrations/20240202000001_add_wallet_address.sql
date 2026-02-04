-- =============================================
-- Migration: Add wallet_address column to users table
-- =============================================

-- Add wallet_address column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address 
ON users(wallet_address);

-- Update RLS policies to allow wallet-based lookups
-- Note: Adjust policies based on your security requirements
