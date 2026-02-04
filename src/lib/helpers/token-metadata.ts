// =============================================
// Token Metadata Helper
// src/lib/helpers/token-metadata.ts
// =============================================

import { TokenInfo } from "@/types";

// Common token symbols mapping for well-known tokens
// This is a fallback for tokens not in the registry
const KNOWN_TOKENS: Record<string, { symbol: string; name: string }> = {
  "So11111111111111111111111111111111111111112": {
    symbol: "SOL",
    name: "Wrapped SOL",
  },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    symbol: "USDC",
    name: "USD Coin",
  },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
    symbol: "USDT",
    name: "USDT",
  },
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": {
    symbol: "BONK",
    name: "Bonk",
  },
};

// Token registry cache
let tokenRegistry: Map<string, TokenInfo> | null = null;

/**
 * Fetches the Solana token registry from the community-maintained list
 */
async function fetchTokenRegistry(): Promise<Map<string, TokenInfo>> {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json"
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch token registry");
    }
    
    const data = await response.json();
    const registry = new Map<string, TokenInfo>();
    
    for (const token of data.tokens) {
      registry.set(token.address, {
        symbol: token.symbol,
        name: token.name,
        mint: token.address,
      });
    }
    
    return registry;
  } catch (error) {
    console.error("Failed to load token registry:", error);
    return new Map();
  }
}

/**
 * Gets token info from the registry or known tokens fallback
 */
export async function getTokenInfo(mint: string): Promise<TokenInfo | null> {
  // Check known tokens first
  if (KNOWN_TOKENS[mint]) {
    return {
      mint,
      symbol: KNOWN_TOKENS[mint].symbol,
      name: KNOWN_TOKENS[mint].name,
    };
  }
  
  // Lazy load token registry
  if (!tokenRegistry) {
    tokenRegistry = await fetchTokenRegistry();
  }
  
  return tokenRegistry.get(mint) || null;
}

/**
 * Gets token symbol, with fallback to shortened mint address
 */
export async function getTokenSymbol(mint: string): Promise<string> {
  const info = await getTokenInfo(mint);
  if (info?.symbol) {
    return info.symbol;
  }
  
  // Fallback: return shortened mint address
  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}

/**
 * Batch get token symbols for multiple mints
 */
export async function getTokenSymbols(mints: string[]): Promise<Record<string, string>> {
  const symbols: Record<string, string> = {};
  
  await Promise.all(
    mints.map(async (mint) => {
      symbols[mint] = await getTokenSymbol(mint);
    })
  );
  
  return symbols;
}
