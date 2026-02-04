// =============================================
// Token Registry Service
// src/lib/services/token-registry-service.ts
// =============================================

import { TokenMetadata } from "@/types";
import { supabaseAdmin } from "../supabase";
import {
  fetchTokenMetadata,
  fetchSingleTokenMetadata,
  getCachedTokenMetadata,
} from "../dexscreener-client";

// Known tokens fallback
const KNOWN_TOKENS: Record<string, { symbol: string; name: string }> = {
  So11111111111111111111111111111111111111112: {
    symbol: "SOL",
    name: "Wrapped SOL",
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    name: "USD Coin",
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: "USDT",
    name: "USDT",
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    symbol: "BONK",
    name: "Bonk",
  },
};

/**
 * Gets token metadata from database or fetches from DexScreener
 * This is the main function to use for lazy-loading token metadata
 *
 * @param tokenAddress - Token mint address
 * @returns Token metadata or null if not found
 */
export async function getTokenMetadata(
  tokenAddress: string
): Promise<TokenMetadata | null> {
  // Check known tokens first
  if (KNOWN_TOKENS[tokenAddress]) {
    return {
      address: tokenAddress,
      symbol: KNOWN_TOKENS[tokenAddress].symbol,
      name: KNOWN_TOKENS[tokenAddress].name,
    };
  }

  // Check in-memory cache
  const cached = getCachedTokenMetadata(tokenAddress);
  if (cached) {
    return cached;
  }

  // Check database (if table exists)
  try {
    const dbMetadata = await getTokenFromDatabase(tokenAddress);
    if (dbMetadata) {
      return dbMetadata;
    }
  } catch {
    // Table might not exist yet, continue to DexScreener
  }

  // Fetch from DexScreener
  const dexMetadata = await fetchSingleTokenMetadata(tokenAddress);
  if (dexMetadata) {
    // Try to save to database for future use (if table exists)
    try {
      await saveTokenToDatabase(dexMetadata);
    } catch {
      // Ignore DB errors - we still have the metadata
    }
    return dexMetadata;
  }

  return null;
}

/**
 * Gets token symbol with fallback to shortened address
 */
export async function getTokenSymbol(tokenAddress: string): Promise<string> {
  const metadata = await getTokenMetadata(tokenAddress);
  if (metadata?.symbol) {
    return metadata.symbol;
  }

  // Fallback: return shortened mint address
  return `${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-4)}`;
}

/**
 * Batch get token metadata for multiple addresses
 * Efficiently fetches from DB and DexScreener
 */
export async function getTokenMetadataBatch(
  tokenAddresses: string[]
): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();
  const addressesToFetch: string[] = [];

  // Check known tokens and cache first
  for (const address of tokenAddresses) {
    if (KNOWN_TOKENS[address]) {
      results.set(address, {
        address,
        symbol: KNOWN_TOKENS[address].symbol,
        name: KNOWN_TOKENS[address].name,
      });
    } else {
      const cached = getCachedTokenMetadata(address);
      if (cached) {
        results.set(address, cached);
      } else {
        addressesToFetch.push(address);
      }
    }
  }

  if (addressesToFetch.length === 0) {
    return results;
  }

  // Check database for remaining addresses (if table exists)
  try {
    const dbResults = await getTokensFromDatabase(addressesToFetch);
    for (const [address, metadata] of dbResults) {
      results.set(address, metadata);
    }
  } catch {
    // Table might not exist yet, continue to DexScreener
  }

  // Filter out addresses we found in DB
  const remainingAddresses = addressesToFetch.filter(
    (addr) => !results.has(addr)
  );

  if (remainingAddresses.length === 0) {
    return results;
  }

  // Fetch from DexScreener
  const dexResults = await fetchTokenMetadata(remainingAddresses);
  for (const [address, metadata] of dexResults) {
    results.set(address, metadata);
    // Try to save to database (if table exists)
    try {
      await saveTokenToDatabase(metadata);
    } catch {
      // Ignore DB errors
    }
  }

  return results;
}

/**
 * Gets token metadata from database
 */
async function getTokenFromDatabase(
  tokenAddress: string
): Promise<TokenMetadata | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("token_registry")
      .select("*")
      .eq("address", tokenAddress)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenData = data as any;
    return {
      address: tokenData.address,
      symbol: tokenData.symbol,
      name: tokenData.name,
    };
  } catch (error) {
    console.error("[TokenRegistry] Failed to get token from DB:", error);
    return null;
  }
}

/**
 * Gets multiple tokens from database
 */
async function getTokensFromDatabase(
  tokenAddresses: string[]
): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();

  try {
    const { data, error } = await supabaseAdmin
      .from("token_registry")
      .select("*")
      .in("address", tokenAddresses);

    if (error || !data) {
      return results;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of data as any[]) {
      results.set(item.address, {
        address: item.address,
        symbol: item.symbol,
        name: item.name,
      });
    }
  } catch (error) {
    console.error("[TokenRegistry] Failed to get tokens from DB:", error);
  }

  return results;
}

/**
 * Saves token metadata to database
 */
async function saveTokenToDatabase(metadata: TokenMetadata): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin.from("token_registry") as any)
      .upsert({
        address: metadata.address,
        symbol: metadata.symbol,
        name: metadata.name,
        updated_at: new Date().toISOString(),
      })
      .eq("address", metadata.address);

    if (error) {
      console.error("[TokenRegistry] Failed to save token to DB:", error);
    }
  } catch (error) {
    console.error("[TokenRegistry] Failed to save token to DB:", error);
  }
}
