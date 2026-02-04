// =============================================
// DexScreener API Client
// src/lib/dexscreener-client.ts
// =============================================

import { TokenMetadata } from "@/types";

const DEXSCREENER_BASE_URL = "https://api.dexscreener.com";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_PER_MINUTE = 60;

// In-memory cache
interface CacheEntry {
  data: TokenMetadata;
  timestamp: number;
}

const tokenCache = new Map<string, CacheEntry>();

// Rate limiting
let requestCount = 0;
let lastResetTime = Date.now();

function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - lastResetTime >= 60000) {
    // Reset every minute
    requestCount = 0;
    lastResetTime = now;
  }
  return requestCount < RATE_LIMIT_PER_MINUTE;
}

function incrementRequestCount() {
  requestCount++;
}

/**
 * Fetches token metadata from DexScreener API
 * Supports batch requests for multiple tokens
 *
 * @param tokenAddresses - Array of token mint addresses
 * @returns Map of token address to metadata
 */
export async function fetchTokenMetadata(
  tokenAddresses: string[]
): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();
  const addressesToFetch: string[] = [];

  // Check cache first
  for (const address of tokenAddresses) {
    const cached = tokenCache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      results.set(address, cached.data);
    } else {
      addressesToFetch.push(address);
    }
  }

  if (addressesToFetch.length === 0) {
    return results;
  }

  // Check rate limit
  if (!checkRateLimit()) {
    console.warn("[DexScreener] Rate limit reached, using cached/fallback data");
    // Return what we have from cache
    for (const address of addressesToFetch) {
      const cached = tokenCache.get(address);
      if (cached) {
        results.set(address, cached.data);
      }
    }
    return results;
  }

  try {
    // DexScreener supports up to 30 addresses per request
    const batchSize = 30;
    for (let i = 0; i < addressesToFetch.length; i += batchSize) {
      const batch = addressesToFetch.slice(i, i + batchSize);
      const addressesParam = batch.join(",");

      const url = `${DEXSCREENER_BASE_URL}/tokens/v1/solana/${addressesParam}`;

      incrementRequestCount();

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `[DexScreener] API error: ${response.status} for ${addressesParam}`
        );
        continue;
      }

      const data = await response.json();

      // Parse response - it returns an array of pairs
      // We need to extract unique tokens from the pairs
      const tokenMap = new Map<string, TokenMetadata>();

      for (const pair of data) {
        if (pair.baseToken) {
          const { address, name, symbol } = pair.baseToken;
          if (batch.includes(address) && !tokenMap.has(address)) {
            tokenMap.set(address, {
              address,
              name,
              symbol,
            });
          }
        }
        if (pair.quoteToken) {
          const { address, name, symbol } = pair.quoteToken;
          if (batch.includes(address) && !tokenMap.has(address)) {
            tokenMap.set(address, {
              address,
              name,
              symbol,
            });
          }
        }
      }

      // Add found tokens to cache and results
      for (const address of batch) {
        const metadata = tokenMap.get(address);
        if (metadata) {
          tokenCache.set(address, {
            data: metadata,
            timestamp: Date.now(),
          });
          results.set(address, metadata);
        }
      }
    }
  } catch (error) {
    console.error("[DexScreener] Failed to fetch token metadata:", error);
  }

  return results;
}

/**
 * Fetches metadata for a single token
 */
export async function fetchSingleTokenMetadata(
  tokenAddress: string
): Promise<TokenMetadata | null> {
  const results = await fetchTokenMetadata([tokenAddress]);
  return results.get(tokenAddress) || null;
}

/**
 * Gets cached token metadata without API call
 */
export function getCachedTokenMetadata(
  tokenAddress: string
): TokenMetadata | null {
  const cached = tokenCache.get(tokenAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

/**
 * Clears the in-memory cache
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Gets cache statistics
 */
export function getCacheStats(): {
  size: number;
  oldestEntry: number | null;
} {
  let oldest = Infinity;
  for (const entry of tokenCache.values()) {
    if (entry.timestamp < oldest) {
      oldest = entry.timestamp;
    }
  }
  return {
    size: tokenCache.size,
    oldestEntry: oldest === Infinity ? null : oldest,
  };
}
