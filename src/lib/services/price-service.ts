// =============================================
// Profit is Profit (PisP) - Price Service
// src/lib/services/price-service.ts
// =============================================

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const PRICE_CACHE_MS = 60_000; // 60 seconds
const FALLBACK_PRICE = 150; // Fallback if API fails (per Phase 1 decision)

let cachedPrice: { price: number; fetchedAt: number } | null = null;

/**
 * Fetches the current SOL/USD price from CoinGecko
 * Uses 60-second cache to minimize API calls
 * Falls back to $150 if API fails
 *
 * @returns SOL price in USD
 */
export async function getSolUsdPrice(): Promise<number> {
  // Return cached if fresh
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < PRICE_CACHE_MS) {
    return cachedPrice.price;
  }

  try {
    const response = await fetch(COINGECKO_URL);
    if (!response.ok) throw new Error(`CoinGecko: ${response.status}`);
    const data = await response.json();
    const price = data?.solana?.usd;
    if (typeof price !== "number" || price <= 0)
      throw new Error("Invalid price data");

    cachedPrice = { price, fetchedAt: Date.now() };
    return price;
  } catch (error) {
    console.warn("CoinGecko price fetch failed, using fallback:", error);
    // Return cached even if stale, or fallback
    return cachedPrice?.price ?? FALLBACK_PRICE;
  }
}
