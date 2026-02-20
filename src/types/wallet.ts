// =============================================
// Profit is Profit (P is P) - Wallet Auth Types
// src/types/wallet.ts
// =============================================

// =============================================
// AUTH VERIFICATION
// =============================================

export interface AuthVerifyRequest {
  publicKey: string;
  message: number[];
  signature: string;
}

export interface AuthVerifyResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

// =============================================
// WALLET BALANCE
// =============================================

export interface WalletBalance {
  sol: number;
  usd: number;
}
