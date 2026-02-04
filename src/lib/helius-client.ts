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
// PUBLIC API FUNCTIONS
// =============================================

/**
 * Fetches transaction history for a Solana address using Helius Enhanced API
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

  try {
    // Use Helius Enhanced API for enriched transaction data
    const apiKey = getHeliusApiKey();
    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=${limit}${options?.before ? `&before=${options.before}` : ''}`;

    await rateLimiter.waitForRateLimit();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new HeliusError("Rate limit exceeded. Please try again later.", 429);
      }
      const errorText = await response.text();
      throw new HeliusError(
        `Helius API error: ${response.status} - ${errorText}`,
        response.status,
      );
    }

    const transactions = (await response.json()) as HeliusTransaction[];
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
