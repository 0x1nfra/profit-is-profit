// =============================================
// Profit is Profit (PisP) - Helius Helpers
// src/lib/helpers/helius-helpers.ts
// =============================================

import { HeliusError, ValidationError } from "@/types";
import { HELIUS_CONFIG } from "../constants";

// =============================================
// SOLANA ADDRESS VALIDATION
// =============================================

/**
 * Validates if a string is a valid Solana address (Base58 encoded, 32-44 characters)
 *
 * @param address - The address to validate
 * @returns True if valid Solana address, false otherwise
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Solana addresses are Base58 encoded and typically 32-44 characters
  if (address.length < 32 || address.length > 44) {
    return false;
  }

  // Base58 alphabet (no 0, O, I, l)
  const base58Regex = /^[A-HJ-NP-Za-km-z1-9]+$/;

  return base58Regex.test(address);
}

/**
 * Validates a Solana address and throws ValidationError if invalid
 *
 * @param address - The address to validate
 * @throws ValidationError if address is invalid
 */
export function validateSolanaAddress(address: string): void {
  if (!isValidSolanaAddress(address)) {
    throw new ValidationError(
      `Invalid Solana address: ${address}`,
      "walletAddress",
    );
  }
}

// =============================================
// ERROR HANDLING
// =============================================

/**
 * Formats an unknown error into a standardized HeliusError
 *
 * @param error - The error to format
 * @param context - Optional context for the error
 * @returns A standardized HeliusError
 */
export function formatHeliusError(error: unknown, context?: string): HeliusError {
  let message = "Unknown Helius API error";
  let statusCode: number | undefined;

  if (error instanceof HeliusError) {
    return error;
  }

  if (error instanceof Error) {
    message = error.message;
  }

  if (error && typeof error === "object") {
    // Check for HTTP response status
    if ("status" in error && typeof error.status === "number") {
      statusCode = error.status;
    }

    if ("statusCode" in error && typeof error.statusCode === "number") {
      statusCode = error.statusCode;
    }

    // Check for response message
    if ("message" in error && typeof error.message === "string") {
      message = error.message;
    }

    // Check for response data
    if ("data" in error && error.data && typeof error.data === "object") {
      const data = error.data as Record<string, unknown>;
      if ("error" in data && typeof data.error === "string") {
        message = data.error;
      }
    }
  }

  const finalMessage = context ? `${context}: ${message}` : message;

  return new HeliusError(finalMessage, statusCode);
}

// =============================================
// RETRY LOGIC
// =============================================

/**
 * Sleeps for a specified number of milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with jitter
 *
 * @param attempt - The current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const baseDelay = HELIUS_CONFIG.RETRY_DELAY_MS;
  const maxDelay = HELIUS_CONFIG.MAX_RETRY_DELAY_MS;

  // Exponential backoff: 2^attempt * baseDelay
  const exponentialDelay = Math.pow(2, attempt) * baseDelay;

  // Add jitter (random variation) to prevent thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay;

  // Cap at maximum delay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Retries a function with exponential backoff
 *
 * @param fn - The function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param shouldRetry - Optional function to determine if error is retryable
 * @returns The result of the function
 * @throws The last error encountered if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = HELIUS_CONFIG.MAX_RETRIES,
  shouldRetry?: (error: unknown) => boolean,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt);

        console.warn(
          `Helius request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
          error instanceof Error ? error.message : error,
        );

        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw formatHeliusError(
    lastError,
    `Failed after ${maxRetries + 1} attempts`,
  );
}

/**
 * Default retry condition for Helius API errors
 * Retries on 5xx errors and network errors
 *
 * @param error - The error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error && typeof error === "object") {
    // Check for HTTP 5xx status codes
    if ("status" in error && typeof error.status === "number") {
      return error.status >= 500 && error.status < 600;
    }

    if ("statusCode" in error && typeof error.statusCode === "number") {
      return error.statusCode >= 500 && error.statusCode < 600;
    }

    // Retry on network errors (no status)
    if (
      "code" in error &&
      typeof error.code === "string" &&
      ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED"].includes(
        error.code,
      )
    ) {
      return true;
    }
  }

  return false;
}

// =============================================
// LOGGING HELPERS
// =============================================

/**
 * Logs a Helius API request (without sensitive data)
 *
 * @param method - HTTP method
 * @param endpoint - API endpoint
 * @param params - Request parameters (sanitized)
 */
export function logHeliusRequest(
  method: string,
  endpoint: string,
  params?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Helius] ${method} ${endpoint}`, params || "");
  }
}

/**
 * Logs a Helius API response (truncated for large payloads)
 *
 * @param endpoint - API endpoint
 * @param status - HTTP status code
 * @param dataLength - Length of response data
 */
export function logHeliusResponse(
  endpoint: string,
  status: number,
  dataLength?: number,
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Helius] Response: ${endpoint} - Status: ${status}${dataLength !== undefined ? ` (${dataLength} items)` : ""}`,
    );
  }
}
