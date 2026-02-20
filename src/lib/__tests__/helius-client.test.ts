// =============================================
// Helius Client Tests
// src/lib/__tests__/helius-client.test.ts
// =============================================

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { EnhancedTransaction } from "@/types";
import { HeliusError } from "@/types";
import { getSwapHistory, backfillSwapHistory } from "../helius-client";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock Helius API key
process.env.HELIUS_API_KEY = "test-api-key";

// Valid Solana address for testing
const TEST_WALLET = "9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g";

// Sample EnhancedTransaction fixture
const createEnhancedTransaction = (
  signature: string,
  timestamp: number,
): EnhancedTransaction => ({
  description: "Swap 1 SOL for 1000 TOKEN",
  type: "SWAP",
  source: "JUPITER",
  fee: 5000, // lamports
  feePayer: TEST_WALLET,
  signature,
  slot: 123456,
  timestamp,
  nativeTransfers: [
    {
      fromUserAccount: TEST_WALLET,
      toUserAccount: "4Q6WW2ouZ6V3iaNm56MTd5n2tnTm4C5fiH8miFHnAFHo",
      amount: 1000000000, // 1 SOL in lamports
    },
  ],
  tokenTransfers: [
    {
      fromUserAccount: "4Q6WW2ouZ6V3iaNm56MTd5n2tnTm4C5fiH8miFHnAFHo",
      toUserAccount: TEST_WALLET,
      fromTokenAccount: "token_dex",
      toTokenAccount: "token_wallet",
      tokenAmount: 1000,
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
  ],
  events: {
    swap: {
      nativeInput: {
        account: TEST_WALLET,
        amount: "1000000000",
      },
      tokenOutputs: [
        {
          userAccount: TEST_WALLET,
          tokenAccount: "token_wallet",
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          rawTokenAmount: {
            tokenAmount: "1000",
            decimals: 6,
          },
        },
      ],
      tokenInputs: [],
      tokenFees: [],
      nativeFees: [],
      innerSwaps: [],
    },
  },
});

describe("getSwapHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("fetches swap transactions via Enhanced API with type=SWAP filter", async () => {
    const mockResponse = [
      createEnhancedTransaction("sig1", 1234567890),
      createEnhancedTransaction("sig2", 1234567900),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await getSwapHistory(TEST_WALLET);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `https://api-mainnet.helius-rpc.com/v0/addresses/${TEST_WALLET}/transactions`,
      ),
      expect.objectContaining({
        method: "GET",
      }),
    );

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain("type=SWAP");
    expect(fetchUrl).toContain("api-key=test-api-key");
    expect(fetchUrl).toContain("limit=100");

    expect(result).toEqual(mockResponse);
  });

  it("returns array of EnhancedTransaction[]", async () => {
    const mockResponse = [createEnhancedTransaction("sig1", 1234567890)];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await getSwapHistory(TEST_WALLET);

    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("events");
    expect(result[0]).toHaveProperty("type", "SWAP");
    expect(result[0].events.swap).toBeDefined();
  });

  it("supports before parameter for pagination", async () => {
    const mockResponse = [createEnhancedTransaction("sig3", 1234567800)];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    await getSwapHistory(TEST_WALLET, { before: "sig2" });

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain("before-signature=sig2");
  });

  it("throws HeliusError on non-200 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    await expect(getSwapHistory(TEST_WALLET)).rejects.toThrow(HeliusError);
  });

  it("respects rate limiter", async () => {
    const mockResponse = [createEnhancedTransaction("sig1", 1234567890)];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const start = Date.now();
    await getSwapHistory(TEST_WALLET);
    await getSwapHistory(TEST_WALLET);
    const elapsed = Date.now() - start;

    // Should wait at least 100ms between requests (10 req/s = 100ms interval)
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});

describe("backfillSwapHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pages through up to 500 transactions using before-signature cursor", async () => {
    // Mock 3 pages of 100 transactions each
    const page1 = Array.from({ length: 100 }, (_, i) =>
      createEnhancedTransaction(`sig_page1_${i}`, 1000000 + i),
    );
    const page2 = Array.from({ length: 100 }, (_, i) =>
      createEnhancedTransaction(`sig_page2_${i}`, 2000000 + i),
    );
    const page3 = Array.from({ length: 100 }, (_, i) =>
      createEnhancedTransaction(`sig_page3_${i}`, 3000000 + i),
    );
    const page4 = Array.from({ length: 100 }, (_, i) =>
      createEnhancedTransaction(`sig_page4_${i}`, 4000000 + i),
    );
    const page5 = Array.from({ length: 100 }, (_, i) =>
      createEnhancedTransaction(`sig_page5_${i}`, 5000000 + i),
    );

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page1,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page2,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page3,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page4,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page5,
      });

    const promise = backfillSwapHistory(TEST_WALLET, 500);

    // Advance timers for rate limiting (200ms between pages)
    await vi.advanceTimersByTimeAsync(100); // Initial request
    await vi.advanceTimersByTimeAsync(200); // Page 2
    await vi.advanceTimersByTimeAsync(200); // Page 3
    await vi.advanceTimersByTimeAsync(200); // Page 4
    await vi.advanceTimersByTimeAsync(200); // Page 5

    const result = await promise;

    expect(result).toHaveLength(500);
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it(
    "stops when an empty batch is returned",
    async () => {
      const page1 = Array.from({ length: 100 }, (_, i) =>
        createEnhancedTransaction(`sig_${i}`, 1000000 + i),
      );
      const page2: EnhancedTransaction[] = [];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page2,
        });

      const promise = backfillSwapHistory(TEST_WALLET);

      // Advance all pending timers
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toHaveLength(100);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    },
    10000,
  );

  it(
    "stops when max transactions reached",
    async () => {
      const page1 = Array.from({ length: 100 }, (_, i) =>
        createEnhancedTransaction(`sig_page1_${i}`, 1000000 + i),
      );
      const page2 = Array.from({ length: 100 }, (_, i) =>
        createEnhancedTransaction(`sig_page2_${i}`, 2000000 + i),
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page2,
        });

      const promise = backfillSwapHistory(TEST_WALLET, 150);

      await vi.runAllTimersAsync();
      const result = await promise;

      // Should stop at 200 (fetched 2 full pages before hitting limit)
      expect(result.length).toBeLessThanOrEqual(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    },
    10000,
  );

  it(
    "waits 200ms between pages (rate limit protection)",
    async () => {
      const page1 = Array.from({ length: 100 }, (_, i) =>
        createEnhancedTransaction(`sig_page1_${i}`, 1000000 + i),
      );
      const page2: EnhancedTransaction[] = [];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page2,
        });

      const promise = backfillSwapHistory(TEST_WALLET);

      // Run all timers and wait for completion
      await vi.runAllTimersAsync();
      const result = await promise;

      // Verify it completed successfully (stopped at empty page)
      expect(result).toHaveLength(100);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    },
    10000,
  );

  it(
    "returns concatenated results from all pages",
    async () => {
      const page1 = [createEnhancedTransaction("sig1", 1000000)];
      const page2 = [createEnhancedTransaction("sig2", 2000000)];
      const page3: EnhancedTransaction[] = [];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page2,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => page3,
        });

      const promise = backfillSwapHistory(TEST_WALLET);

      // Run all timers and wait for completion
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveLength(2);
      expect(result[0].signature).toBe("sig1");
      expect(result[1].signature).toBe("sig2");
    },
    10000,
  );
});
