// =============================================
// Profit is Profit (PisP) - Type Definitions
// src/types/index.ts
// =============================================

// =============================================
// ENUMS
// =============================================

export enum Tier {
  REBUILD = 1,
  RECOVERY = 2,
  GROWTH = 3,
  AGGRESSIVE = 4,
  MAXIMUM = 5,
}

export enum WalletType {
  TRADING = "trading",
  VAULT = "vault",
}

export enum TradeStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  OVERRIDDEN = "overridden",
}

export enum CashoutStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
}

// =============================================
// DATABASE MODELS
// =============================================

export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  email?: string | null;
  username?: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  wallet_type: WalletType;
  address: string;
  balance_sol: number;
  balance_usd: number;
  current_tier?: Tier | null;
  last_synced_at?: string | null;
  created_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  trading_wallet_id?: string | null;

  // Trade identification
  token_mint: string;
  token_symbol?: string | null;

  // Aggregated trade data
  total_entry_sol: number;
  total_exit_sol: number;
  net_profit_sol: number;
  roi_percent: number;

  // Tier & streak at trade time
  tier_at_trade: Tier;
  losing_streak_at_trade: number;

  // Cashout calculation
  base_cashout_percent: number;
  roi_bonus_percent: number;
  streak_multiplier: number;
  goal_boost_multiplier: number;
  final_cashout_percent: number;
  recommended_cashout_sol: number;

  // Status
  status: TradeStatus;
  actual_cashout_sol?: number | null;

  // Timestamps
  position_opened_at?: string | null;
  position_closed_at: string;
  created_at: string;
  confirmed_at?: string | null;
}

export interface Cashout {
  id: string;
  user_id: string;
  trade_id?: string | null;

  amount_sol: number;
  amount_usd: number;
  sol_price_at_cashout: number;

  from_wallet_id?: string | null;
  to_wallet_id?: string | null;

  status: CashoutStatus;
  confirmed_at?: string | null;
  created_at: string;
}

export interface GoalSettings {
  id: string;
  user_id: string;

  monthly_goal_usd: number;
  current_month_progress_usd: number;
  current_month: string;

  // Goal boost tracking
  boost_active: boolean;
  boost_percent: number;
  boost_activated_at?: string | null;
  boost_expires_at?: string | null;

  last_sunday_check?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserState {
  id: string;
  user_id: string;

  current_losing_streak: number;
  last_trade_at?: string | null;

  updated_at: string;
}

// =============================================
// TIER CONFIGURATION
// =============================================

export interface TierConfig {
  tier: Tier;
  name: string;
  minBalance: number;
  maxBalance: number | null;
  baseCashoutPercent: number;
  description: string;
  color: string;
}

// =============================================
// CASHOUT CALCULATION
// =============================================

export interface CashoutInput {
  tier: Tier;
  roi: number;
  losingStreak: number;
  goalBoost: number;
  netProfit: number;
}

export interface CashoutResult {
  baseRate: number;
  roiBonus: number;
  streakMultiplier: number;
  goalBoost: number;
  finalPercent: number;
  cashoutAmount: number;
}

// =============================================
// TRADE PARSING (Helius)
// =============================================

export interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  slot: number;

  // Token transfer info
  tokenTransfers?: TokenTransfer[];
  nativeTransfers?: NativeTransfer[];

  // Swap specific
  swap?: SwapInfo;
}

export interface EnhancedTransaction {
  description: string;
  type: "SWAP";
  source: string; // "JUPITER" | "RAYDIUM" | "ORCA" etc.
  fee: number; // lamports
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number; // Unix timestamp

  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number; // lamports
  }>;

  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard?: string;
  }>;

  events: {
    swap?: {
      nativeInput?: { account: string; amount: string };
      nativeOutput?: { account: string; amount: string };
      tokenInputs: Array<{
        userAccount: string;
        tokenAccount: string;
        mint: string;
        rawTokenAmount: { tokenAmount: string; decimals: number };
      }>;
      tokenOutputs: Array<{
        userAccount: string;
        tokenAccount: string;
        mint: string;
        rawTokenAmount: { tokenAmount: string; decimals: number };
      }>;
      tokenFees: Array<unknown>;
      nativeFees: Array<unknown>;
      innerSwaps: Array<unknown>;
    };
  };
}

export interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

export interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface SwapInfo {
  nativeInput?: {
    account: string;
    amount: string;
  };
  nativeOutput?: {
    account: string;
    amount: string;
  };
  tokenInputs?: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    amount: string;
  }>;
  tokenOutputs?: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    amount: string;
  }>;
}

export interface SwapAmounts {
  solSpent: number; // SOL spent buying tokens
  solReceived: number; // SOL received selling tokens
  tokenMint: string; // The non-SOL token involved
  fee: number; // Transaction fee in SOL
}

export interface ParsedTrade {
  tokenMint: string;
  tokenSymbol?: string;
  totalEntry: number;
  totalExit: number;
  netProfit: number;
  roi: number;
  roiMultiplier: number; // e.g., 2.5 for 150% ROI (1 + roi/100)
  totalFeesSol: number; // total transaction fees paid
  netProfitUsd?: number; // USD equivalent (optional, set during sync)
  positionClosed: boolean;
  positionOpenedAt?: Date;
  positionClosedAt: Date;
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  tokenSymbol?: string;
  name?: string;
  usdValue?: number;
}

export interface AggregatedTrade {
  tokenMint: string;
  tokenSymbol?: string;
  totalEntrySol: number;
  totalExitSol: number;
  netProfitSol: number;
  roi: number;
  totalFeesSol: number;
  transactions: EnhancedTransaction[];
  positionClosed: boolean;
  firstTransactionAt: Date;
  lastTransactionAt: Date;
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

// Wallet Setup
export interface WalletSetupRequest {
  tradingWalletAddress: string;
  vaultWalletAddress: string;
}

export interface WalletSetupResponse {
  success: boolean;
  wallets: {
    trading: Wallet;
    vault: Wallet;
  };
}

// Trade Refresh
export interface TradeRefreshRequest {
  walletAddress: string;
}

export interface TradeRefreshResponse {
  success: boolean;
  newTrades: Trade[];
  updatedBalances: {
    trading: number;
    vault: number;
  };
}

export interface SyncResult {
  success: boolean;
  newTrades: Trade[];
  updatedBalances: {
    trading: number;
    vault: number;
  };
  lastSyncTimestamp: string;
}

// Cashout Confirmation
export interface CashoutConfirmRequest {
  tradeId: string;
  actualAmount?: number; // If user overrides
}

export interface CashoutConfirmResponse {
  success: boolean;
  cashout: Cashout;
  updatedBalances: {
    trading: Wallet;
    vault: Wallet;
  };
}

// Goal Update
export interface GoalUpdateRequest {
  monthlyGoalUsd: number;
}

export interface GoalUpdateResponse {
  success: boolean;
  goalSettings: GoalSettings;
}

// Goal Boost
export interface GoalBoostRequest {
  accept: boolean;
}

export interface GoalBoostResponse {
  success: boolean;
  goalSettings: GoalSettings;
}

// Dashboard Data
export interface DashboardData {
  wallets: {
    trading: Wallet;
    vault: Wallet;
  };
  currentTier: Tier;
  tierConfig: TierConfig;
  recentTrades: Trade[];
  goalProgress: {
    monthlyGoal: number;
    currentProgress: number;
    progressPercent: number;
    weeklyPace: number;
    isOnTrack: boolean;
    boostSuggestion?: {
      gapAmount: number;
      suggestedBoostPercent: number;
    };
  };
  userState: UserState;
}

// =============================================
// FORM TYPES
// =============================================

export interface WalletSetupFormData {
  tradingWallet: string;
  vaultWallet: string;
}

export interface GoalSettingsFormData {
  monthlyGoal: number;
}

// =============================================
// UTILITY TYPES
// =============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Date range filter
export interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
}

// =============================================
// CONSTANTS TYPES
// =============================================

export interface TierBoundaries {
  [Tier.REBUILD]: { min: number; max: number };
  [Tier.RECOVERY]: { min: number; max: number };
  [Tier.GROWTH]: { min: number; max: number };
  [Tier.AGGRESSIVE]: { min: number; max: number };
  [Tier.MAXIMUM]: { min: number; max: number };
}

export interface BaseCashoutRates {
  [Tier.REBUILD]: number;
  [Tier.RECOVERY]: number;
  [Tier.GROWTH]: number;
  [Tier.AGGRESSIVE]: number;
  [Tier.MAXIMUM]: number;
}

// =============================================
// ERROR TYPES
// =============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class HeliusError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "HeliusError";
  }
}
