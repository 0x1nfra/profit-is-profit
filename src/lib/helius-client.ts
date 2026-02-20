// =============================================
// Profit is Profit (PisP) - Helius API Client
// src/lib/helius-client.ts
// =============================================

import type { HeliusTransaction, TokenBalance } from "@/types";
import { HeliusError, ValidationError } from "@/types";
import { HELIUS_CONFIG } from "./constants";
import {
  formatHeliusError,
  isRetryableError,
  logHeliusRequest,
  logHeliusResponse,
  retryWithBackoff,
  validateSolanaAddress,
} from "./helpers/helius-helpers";

// =============================================
// RATE LIMITER
// =============================================

class RateLimiter {
  private lastRequestTime: number = 0;
  private minIntervalMs: number;

  constructor(requestsPerSecond: number) {
    this.minIntervalMs = 1000 / requestsPerSecond;
  }

  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

// Global rate limiter instance (10 requests per second)
const rateLimiter = new RateLimiter(HELIUS_CONFIG.RATE_LIMIT);

// =============================================
// HELIUS CLIENT
// =============================================

/**
 * Gets the Helius API key from environment variables
 *
 * @returns The API key
 * @throws ValidationError if API key is not configured
 */
function getHeliusApiKey(): string {
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    throw new ValidationError(
      "HELIUS_API_KEY environment variable is not set",
      "apiKey",
    );
  }

  return apiKey;
}

/**
 * Makes a rate-limited request to the Helius API
 *
 * @param endpoint - API endpoint path
 * @param method - HTTP method
 * @param body - Request body for POST requests
 * @returns Promise resolving to the response data
 * @throws HeliusError on API errors
 */
async function makeHeliusRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "POST",
  body?: Record<string, unknown>,
): Promise<T> {
  // Wait for rate limit
  await rateLimiter.waitForRateLimit();

  const apiKey = getHeliusApiKey();
  const url = `${HELIUS_CONFIG.API_BASE_URL}/?api-key=${apiKey}`;

  logHeliusRequest(method, endpoint, body);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    HELIUS_CONFIG.REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    logHeliusResponse(endpoint, response.status);

    if (!response.ok) {
      // Handle rate limiting (429)
      if (response.status === 429) {
        throw new HeliusError(
          "Rate limit exceeded. Please try again later.",
          429,
        );
      }

      // Handle other HTTP errors
      const errorText = await response.text();
      throw new HeliusError(
        `Helius API error: ${response.status} - ${errorText}`,
        response.status,
      );
    }

    const data = await response.json();

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof HeliusError) {
      throw error;
    }

    // Handle timeout
    if (error instanceof Error && error.name === "AbortError") {
      throw new HeliusError(
        `Request timeout after ${HELIUS_CONFIG.REQUEST_TIMEOUT_MS}ms`,
        408,
      );
    }

    throw formatHeliusError(error);
  }
}

// =============================================
// ENHANCED API FUNCTIONS
// =============================================

/**
 * Fetches swap transaction history for a Solana address using Enhanced Transactions API
 *
 * @param address - The wallet address to fetch swap transactions for
 * @param options - Optional parameters (before signature for pagination)
 * @returns Array of Enhanced transactions with type=SWAP
 * @throws ValidationError if address is invalid
 * @throws HeliusError on API errors
 */
export async function getSwapHistory(
  address: string,
  options?: { before?: string },
): Promise<import("@/types").EnhancedTransaction[]> {
  // Validate address
  validateSolanaAddress(address);

  const apiKey = getHeliusApiKey();

  // Build Enhanced API URL
  let url = `${HELIUS_CONFIG.ENHANCED_API_BASE_URL}/v0/addresses/${address}/transactions?api-key=${apiKey}&type=SWAP&limit=${HELIUS_CONFIG.DEFAULT_SWAP_LIMIT}`;

  if (options?.before) {
    url += `&before-signature=${options.before}`;
  }

  // Wait for rate limit
  await rateLimiter.waitForRateLimit();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    HELIUS_CONFIG.REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Handle rate limiting (429)
      if (response.status === 429) {
        throw new HeliusError(
          "Rate limit exceeded. Please try again later.",
          429,
        );
      }

      // Handle other HTTP errors
      const errorText = await response.text();
      throw new HeliusError(
        `Helius API error: ${response.status} - ${errorText}`,
        response.status,
      );
    }

    const data = await response.json();

    return data as import("@/types").EnhancedTransaction[];
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof HeliusError) {
      throw error;
    }

    // Handle timeout
    if (error instanceof Error && error.name === "AbortError") {
      throw new HeliusError(
        `Request timeout after ${HELIUS_CONFIG.REQUEST_TIMEOUT_MS}ms`,
        408,
      );
    }

    throw formatHeliusError(error);
  }
}

/**
 * Backfills swap transaction history by paging through all available transactions
 * Uses cursor-based pagination with before-signature parameter
 *
 * @param address - The wallet address to fetch swap transactions for
 * @param maxTransactions - Maximum number of transactions to fetch (default 500)
 * @returns Array of all fetched Enhanced transactions
 * @throws ValidationError if address is invalid
 * @throws HeliusError on API errors
 */
export async function backfillSwapHistory(
  address: string,
  maxTransactions: number = HELIUS_CONFIG.MAX_BACKFILL_TRANSACTIONS,
): Promise<import("@/types").EnhancedTransaction[]> {
  // Validate address
  validateSolanaAddress(address);

  const allTransactions: import("@/types").EnhancedTransaction[] = [];
  let cursor: string | undefined = undefined;

  while (allTransactions.length < maxTransactions) {
    // Fetch next batch
    const batch = await getSwapHistory(address, { before: cursor });

    // Stop if empty batch
    if (batch.length === 0) {
      break;
    }

    // Add to accumulator
    allTransactions.push(...batch);

    // Stop if we've reached the limit
    if (allTransactions.length >= maxTransactions) {
      break;
    }

    // Use last signature as cursor for next page
    cursor = batch[batch.length - 1].signature;

    // Wait between pages to respect rate limits
    await new Promise((resolve) =>
      setTimeout(resolve, HELIUS_CONFIG.BACKFILL_RATE_LIMIT_MS),
    );
  }

  return allTransactions;
}

// =============================================
// PUBLIC API FUNCTIONS
// =============================================

/**
 * Fetches transaction history for a Solana address
 *
 * @param address - The wallet address to fetch transactions for
 * @param options - Optional parameters (limit, before)
 * @returns Array of Helius transactions
 * @throws ValidationError if address is invalid
 * @throws HeliusError on API errors
 */
export async function getTransactionHistory(
  address: string,
  options?: { limit?: number; before?: string },
): Promise<HeliusTransaction[]> {
  // Validate address
  validateSolanaAddress(address);

  const limit = Math.min(
    options?.limit ?? HELIUS_CONFIG.DEFAULT_TX_LIMIT,
    HELIUS_CONFIG.MAX_TX_LIMIT,
  );

  const requestBody: Record<string, unknown> = {
    id: "pisp-history",
    jsonrpc: "2.0",
    method: "getSignaturesForAddress",
    params: [
      address,
      {
        limit,
        before: options?.before,
      },
    ],
  };

  try {
    const response = await retryWithBackoff<{
      result?: Array<{ signature: string; slot: number }>;
    }>(
      () =>
        makeHeliusRequest("getSignaturesForAddress", "POST", requestBody),
      HELIUS_CONFIG.MAX_RETRIES,
      isRetryableError,
    );

    const signatures = response.result ?? [];

    // Now fetch transaction details for each signature
    const transactions: HeliusTransaction[] = [];

    for (const sigInfo of signatures) {
      const txBody: Record<string, unknown> = {
        id: "pisp-tx",
        jsonrpc: "2.0",
        method: "getTransaction",
        params: [
          sigInfo.signature,
          {
            encoding: "jsonParsed",
            maxSupportedTransactionVersion: 0,
          },
        ],
      };

      const tx = await retryWithBackoff(
        () =>
          makeHeliusRequest<HeliusTransaction>(
            "getTransaction",
            "POST",
            txBody,
          ),
        HELIUS_CONFIG.MAX_RETRIES,
        isRetryableError,
      );

      if (tx) {
        transactions.push(tx);
      }
    }

    return transactions;
  } catch (error) {
    if (error instanceof HeliusError || error instanceof ValidationError) {
      throw error;
    }

    throw formatHeliusError(error, "Failed to fetch transaction history");
  }
}

/**
 * Fetches current token balances for a Solana address
 *
 * @param address - The wallet address to fetch balances for
 * @returns Array of token balances
 * @throws ValidationError if address is invalid
 * @throws HeliusError on API errors
 */
export async function getTokenBalances(address: string): Promise<TokenBalance[]> {
  // Validate address
  validateSolanaAddress(address);

  const requestBody: Record<string, unknown> = {
    id: "pisp-balances",
    jsonrpc: "2.0",
    method: "getTokenAccountsByOwner",
    params: [
      address,
      {
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      },
      {
        encoding: "jsonParsed",
      },
    ],
  };

  try {
    const response = await retryWithBackoff<{
      result?: {
        value: Array<{
          account: {
            data: {
              parsed: {
                info: {
                  mint: string;
                  tokenAmount: {
                    amount: string;
                    decimals: number;
                    uiAmount: number;
                  };
                };
              };
            };
          };
        }>;
      };
    }>(
      () => makeHeliusRequest("getTokenAccountsByOwner", "POST", requestBody),
      HELIUS_CONFIG.MAX_RETRIES,
      isRetryableError,
    );

    if (!response.result?.value) {
      return [];
    }

    const balances: TokenBalance[] = response.result.value.map((item) => ({
      mint: item.account.data.parsed.info.mint,
      amount: item.account.data.parsed.info.tokenAmount.uiAmount,
      decimals: item.account.data.parsed.info.tokenAmount.decimals,
    }));

    return balances;
  } catch (error) {
    if (error instanceof HeliusError || error instanceof ValidationError) {
      throw error;
    }

    throw formatHeliusError(error, "Failed to fetch token balances");
  }
}

/**
 * Fetches native SOL balance for a Solana address
 *
 * @param address - The wallet address to fetch SOL balance for
 * @returns SOL balance as a number
 * @throws ValidationError if address is invalid
 * @throws HeliusError on API errors
 */
export async function getSolBalance(address: string): Promise<number> {
  // Validate address
  validateSolanaAddress(address);

  const requestBody: Record<string, unknown> = {
    id: "pisp-sol",
    jsonrpc: "2.0",
    method: "getBalance",
    params: [address],
  };

  try {
    const response = await retryWithBackoff<{
      result?: {
        value: number;
      };
    }>(
      () => makeHeliusRequest("getBalance", "POST", requestBody),
      HELIUS_CONFIG.MAX_RETRIES,
      isRetryableError,
    );

    if (response.result?.value === undefined) {
      throw new HeliusError("Invalid response from Helius API: missing balance");
    }

    // Convert lamports to SOL (1 SOL = 10^9 lamports)
    return response.result.value / 1e9;
  } catch (error) {
    if (error instanceof HeliusError || error instanceof ValidationError) {
      throw error;
    }

    throw formatHeliusError(error, "Failed to fetch SOL balance");
  }
}

// =============================================
// TYPE GUARDS
// =============================================

/**
 * Type guard to check if a value is a valid HeliusTransaction
 *
 * @param value - The value to check
 * @returns True if value is a HeliusTransaction
 */
export function isHeliusTransaction(value: unknown): value is HeliusTransaction {
  return (
    typeof value === "object" &&
    value !== null &&
    "signature" in value &&
    typeof (value as HeliusTransaction).signature === "string" &&
    "timestamp" in value &&
    typeof (value as HeliusTransaction).timestamp === "number"
  );
}
