# Phase 2: Trade Detection & Sync - Research

**Researched:** 2026-02-21
**Domain:** Helius Enhanced Transactions API, Solana DEX swap parsing, P&L calculation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
#### Trade closure logic
- **Closure detection:** Claude's discretion -- determine the best threshold for considering a position closed (balance = 0 with dust tolerance, or high % sold)
- **Re-entry handling:** Claude's discretion -- decide whether same-token re-entries are separate trades or merged positions based on what works best for downstream cashout calculations
- **Historical backfill:** Yes -- fetch past trades on first sync, not just new trades. Claude decides the backfill window (balance data volume vs usefulness)

#### Sync trigger & feedback
- **Trigger:** Auto-sync on dashboard page load + manual refresh button
- **Progress indicator:** Claude's discretion on level of detail (spinner vs step-by-step)
- **Results notification:** Toast notification -- "Found 3 new closed trades" (or similar)
- **Empty sync:** Always notify -- toast like "No new closed trades found" so user knows sync worked

#### P&L calculation rules
- **Currency display:** SOL + USD for all P&L values
- **USD conversion:** Claude's discretion on whether to use historical or current SOL price
- **Fees:** Include transaction fees in P&L -- show true net profit/loss
- **ROI format:** Show both percentage AND multiplier -- e.g., "+150% (2.5x)"

#### Edge case handling
- **Rug pulls:** Claude's discretion -- decide whether to flag separately or track as normal loss
- **Airdrops:** Claude's discretion -- decide whether to ignore or track with 0 cost basis
- **API failures:** Auto-retry silently, then show error with retry button if all retries fail
- **wSOL handling:** Claude's discretion -- decide based on how DEX swap mechanics actually work on Solana

### Claude's Discretion
- Trade closure threshold (dust amount, percentage-based)
- Re-entry as separate trades vs merged positions
- Historical backfill depth
- Sync progress indicator detail level
- USD price source (historical vs current)
- Rug pull classification
- Airdrop handling
- wSOL swap treatment

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRADE-01 | System fetches transaction history from Helius Wallet API | Helius Enhanced Transactions API v0 endpoint with SWAP type filter; existing `helius-client.ts` needs refactoring from raw RPC to Enhanced API |
| TRADE-02 | System groups swap transactions by token mint into bundled trades | Existing `trade-parser.ts` already groups by mint via `extractUniqueTokenMints` + `aggregateTokenTransactions`; Enhanced API provides pre-parsed swap events with clean token/SOL amounts |
| TRADE-03 | System detects position closure when token balance = 0 | Existing `detectPositionClosure` + `getTokenBalances` (via `getTokenAccountsByOwner` RPC); dust threshold at 0.000001 already in constants |
| TRADE-04 | System calculates net profit (total exit SOL - total entry SOL) per closed trade | Existing `calculateNetProfit` in trade-helpers.ts works; Enhanced API swap events provide exact SOL amounts in/out including fees |
| TRADE-05 | System calculates ROI percentage per trade | Existing `calculateTradeROI` in trade-helpers.ts; add multiplier format (2.5x) alongside percentage |
| TRADE-06 | System handles dust amounts (< 0.000001 tokens treated as 0) | Existing `handleDustAmounts` + `normalizeAmount` with `CALCULATION.DUST_THRESHOLD = 0.000001` |
| TRADE-07 | System processes multiple token closures in a single refresh | Existing `parseTrades` handles multiple mints; `syncTrades` iterates and deduplicates via `findExistingTrade` |
</phase_requirements>

## Summary

Phase 2 connects the Helius blockchain data to the existing trade parsing and P&L calculation logic. The codebase already has substantial infrastructure: a Helius client with rate limiting and retry logic, a trade parser that groups transactions by token mint, position closure detection, dust handling, and a trade service that orchestrates sync and persists to Supabase. There are 229 tests (228 passing, 1 pre-existing failure in `aggregateTokenTransactions`).

The critical finding is that the current `helius-client.ts` uses raw Solana RPC methods (`getSignaturesForAddress` + `getTransaction`) routed through Helius, which requires N+1 calls and returns unparsed transaction data. The Helius Enhanced Transactions API (`/v0/addresses/{address}/transactions`) provides pre-parsed, human-readable swap data in a single call with type filtering (`?type=SWAP`), eliminating complex raw transaction parsing. This is the approach the requirements intended (referencing "Helius Wallet API"). Switching to the Enhanced API is the single most impactful change for this phase.

The second key area is adding SOL-to-USD conversion. CoinGecko's free API (30 calls/min, 10K/month) provides current SOL/USD price via `/api/v3/simple/price?ids=solana&vs_currencies=usd`. For an MVP with manual sync, current price at sync time (not historical) is sufficient and dramatically simpler.

**Primary recommendation:** Refactor `helius-client.ts` to use the Helius Enhanced Transactions API with `type=SWAP` filter, update `trade-parser.ts` to consume the richer swap event data (especially `events.swap.nativeInput/nativeOutput`), and add a simple CoinGecko price service for USD conversion.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.4 | API routes for trade sync endpoint | Already in use for `/api/trades/refresh` |
| @supabase/supabase-js | ^2.91.0 | Database persistence for trades | Already in use for trade storage |
| zustand | ^5.0.10 | Client state for sync status | Already in use for wallet store |
| sonner | ^2.0.7 | Toast notifications for sync results | Already in use, imported in dashboard |
| zod | ^4.3.5 | Request/response validation | Already in use |
| vitest | ^4.0.18 | Testing trade parsing logic | Already in use, 229 tests |

### Supporting (new additions needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | CoinGecko price fetch | Use native `fetch` -- no SDK needed for one endpoint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| helius-sdk npm package | Direct fetch to Enhanced API | SDK adds dependency for 2 endpoints; direct fetch is simpler, already the pattern used |
| Jupiter Price API | CoinGecko simple/price | Jupiter focuses on token prices, CoinGecko better for SOL/USD; Jupiter may return null for some tokens |
| Historical SOL price per trade | Current SOL price at sync time | Historical requires storing price per transaction timestamp; current is sufficient for MVP cashout decisions |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Changes to Existing Structure
```
src/
├── lib/
│   ├── helius-client.ts          # REFACTOR: Switch from raw RPC to Enhanced Transactions API
│   ├── trade-parser.ts           # UPDATE: Consume Enhanced API swap events
│   ├── constants.ts              # UPDATE: Add price API config, wSOL mint constant
│   ├── services/
│   │   ├── trade-service.ts      # UPDATE: Add backfill logic, position closure via balances
│   │   └── price-service.ts      # NEW: SOL/USD price fetching with cache
│   ├── helpers/
│   │   ├── trade-helpers.ts      # UPDATE: Add fee extraction, wSOL filtering
│   │   └── helius-helpers.ts     # KEEP: Rate limiting, retry, validation all reusable
│   └── stores/
│       └── wallet-store.ts       # KEEP as-is (may add sync state later)
├── app/
│   ├── api/
│   │   └── trades/
│   │       └── refresh/
│   │           └── route.ts      # UPDATE: Return richer response with toast-ready data
│   └── dashboard/
│       └── page.tsx              # UPDATE: Add sync trigger on load + refresh button
└── types/
    └── index.ts                  # UPDATE: Enhanced API response types, price types
```

### Pattern 1: Helius Enhanced Transactions API for Swap History
**What:** Replace raw RPC calls with a single GET to `/v0/addresses/{address}/transactions?type=SWAP`
**When to use:** Fetching all swap history for a trading wallet
**Why:** Eliminates N+1 query pattern (getSignatures + N x getTransaction), returns pre-parsed swap events with clean SOL/token amounts, supports pagination via `before-signature`
**Example:**
```typescript
// Source: https://www.helius.dev/docs/api-reference/enhanced-transactions/gettransactionsbyaddress
const API_KEY = process.env.HELIUS_API_KEY;
const BASE_URL = "https://api-mainnet.helius-rpc.com";

async function getSwapHistory(
  address: string,
  options?: { limit?: number; before?: string }
): Promise<EnhancedTransaction[]> {
  const params = new URLSearchParams({
    "api-key": API_KEY,
    type: "SWAP",
    limit: String(options?.limit ?? 100),
  });
  if (options?.before) {
    params.set("before-signature", options.before);
  }

  const url = `${BASE_URL}/v0/addresses/${address}/transactions?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new HeliusError(`Helius API error: ${response.status}`, response.status);
  }

  return response.json();
}
```

### Pattern 2: Swap Event Parsing for P&L
**What:** Use the `events.swap` field from Enhanced API to extract exact SOL in/out
**When to use:** Calculating entry/exit SOL amounts per trade
**Why:** `events.swap.nativeInput` gives exact SOL spent (buying tokens), `events.swap.nativeOutput` gives exact SOL received (selling tokens) -- no need to manually aggregate native transfers
**Example:**
```typescript
// Source: Helius Enhanced Transaction response schema
function extractSwapAmounts(tx: EnhancedTransaction, walletAddress: string): {
  solSpent: number;
  solReceived: number;
  tokenMint: string;
  fee: number;
} {
  const swap = tx.events?.swap;
  if (!swap) return { solSpent: 0, solReceived: 0, tokenMint: "", fee: 0 };

  // SOL spent to buy tokens (nativeInput from user's account)
  const solSpent = swap.nativeInput?.account === walletAddress
    ? Number(swap.nativeInput.amount) / 1e9
    : 0;

  // SOL received from selling tokens (nativeOutput to user's account)
  const solReceived = swap.nativeOutput?.account === walletAddress
    ? Number(swap.nativeOutput.amount) / 1e9
    : 0;

  // Token mint from inputs or outputs
  const tokenMint = swap.tokenOutputs?.[0]?.mint
    || swap.tokenInputs?.[0]?.mint
    || "";

  // Transaction fee in SOL
  const fee = tx.fee / 1e9;

  return { solSpent, solReceived, tokenMint, fee };
}
```

### Pattern 3: Pagination for Historical Backfill
**What:** Use `before-signature` cursor to page through all swap history
**When to use:** First-time sync (backfill) when user has no prior sync timestamp
**Example:**
```typescript
async function backfillSwapHistory(
  address: string,
  maxTransactions: number = 500
): Promise<EnhancedTransaction[]> {
  const allTxs: EnhancedTransaction[] = [];
  let beforeSig: string | undefined;

  while (allTxs.length < maxTransactions) {
    const batch = await getSwapHistory(address, {
      limit: 100,
      before: beforeSig,
    });

    if (batch.length === 0) break; // No more transactions

    allTxs.push(...batch);
    beforeSig = batch[batch.length - 1].signature;

    // Rate limit protection
    await new Promise(r => setTimeout(r, 200));
  }

  return allTxs;
}
```

### Pattern 4: SOL Price Service with Cache
**What:** Simple price fetch with in-memory cache to avoid hitting rate limits
**When to use:** Every sync to convert SOL P&L to USD
**Example:**
```typescript
// CoinGecko free API: 30 calls/min, 10K/month
const PRICE_CACHE_MS = 60_000; // Cache for 1 minute
let cachedPrice: { price: number; fetchedAt: number } | null = null;

export async function getSolUsdPrice(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < PRICE_CACHE_MS) {
    return cachedPrice.price;
  }

  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
  );
  const data = await response.json();
  const price = data.solana.usd;

  cachedPrice = { price, fetchedAt: Date.now() };
  return price;
}
```

### Anti-Patterns to Avoid
- **Fetching all transaction types then filtering client-side:** Use `?type=SWAP` query parameter to filter at the API level. Fetching all types wastes credits and bandwidth.
- **Parsing raw transaction instructions manually:** The Enhanced API already does this. Never hand-parse Solana program instructions when Helius provides structured swap events.
- **Storing SOL price per-transaction for historical accuracy in MVP:** Over-engineering. Current price at sync time is sufficient for the cashout decision ("should I move SOL to vault?"). Historical price adds complexity with minimal value for the core use case.
- **Using `helius-sdk` npm package for 2 endpoints:** Adds a dependency with its own version churn. Direct `fetch` calls match the existing codebase pattern and are simpler to maintain.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parsing raw Solana swap transactions | Custom instruction decoder | Helius Enhanced API `events.swap` | 500+ DEX program variants; Helius handles Jupiter, Raydium, Orca, Meteora, Phoenix, Lifinity, Drift, etc. |
| Rate limiting for Helius API | New rate limiter | Existing `RateLimiter` class in helius-client.ts | Already built and tested with 10 req/s |
| Exponential backoff retry | Custom retry logic | Existing `retryWithBackoff` in helius-helpers.ts | Already handles 429, 5xx, network errors |
| SOL/USD price feed | Custom price aggregator | CoinGecko `/simple/price` with 1-min cache | Single free API call, no SDK needed |
| Transaction deduplication | Custom dedup logic | Existing `findExistingTrade` in trade-service.ts | Already checks (user_id, token_mint, position_closed_at) |
| Dust amount handling | Custom threshold logic | Existing `handleDustAmounts` with `DUST_THRESHOLD = 0.000001` | Already tested with 229 tests |

**Key insight:** The existing codebase has the right abstractions (trade parser, trade service, helpers). The main work is switching the data source from raw RPC to Enhanced API and wiring up the missing pieces (balance check for closure, price service for USD, backfill pagination).

## Common Pitfalls

### Pitfall 1: wSOL Appearing as Separate Token in Swap Events
**What goes wrong:** Wrapped SOL (wSOL, mint `So11111111111111111111111111111111111111112`) appears in `tokenTransfers` alongside native SOL in `nativeTransfers`. If not filtered, the parser counts wSOL transfers as a separate "token trade" with its own P&L.
**Why it happens:** Solana DEXes wrap SOL into wSOL (SPL token) before executing swaps. Jupiter auto-wraps/unwraps behind the scenes. The blockchain records both the wrap/unwrap and the swap.
**How to avoid:** Filter out wSOL mint (`So11111111111111111111111111111111111111112`) from token mint extraction. When grouping trades by token, skip wSOL. The Enhanced API `events.swap.nativeInput/nativeOutput` already accounts for the SOL side correctly.
**Warning signs:** Trades showing up with token mint `So1111...` or trades with 0 profit that look like SOL-to-SOL swaps.

**Recommendation:** Add `WSOL_MINT = "So11111111111111111111111111111111111111112"` to constants and filter it from `extractUniqueTokenMints`.

### Pitfall 2: Double-Counting SOL When Using Both nativeTransfers and events.swap
**What goes wrong:** The existing parser uses `extractNativeTransfers` to sum all native SOL movements. The Enhanced API also provides `events.swap.nativeInput/nativeOutput` with the same data. Using both results in double-counting.
**Why it happens:** `nativeTransfers` includes ALL native SOL movements (swap amounts + fees + rent). `events.swap.nativeInput/nativeOutput` isolates just the swap-related SOL. They overlap.
**How to avoid:** Use `events.swap.nativeInput/nativeOutput` as the primary source for swap SOL amounts. Use `tx.fee` separately for fee accounting. Do NOT also sum `nativeTransfers`.
**Warning signs:** Entry/exit SOL amounts that are 2x expected values.

**Recommendation:** When refactoring the parser, switch entirely to `events.swap` for SOL amounts. Keep `nativeTransfers` extraction only as a fallback for transactions without swap events.

### Pitfall 3: Pagination Cursor Must Use Last Signature, Not Timestamp
**What goes wrong:** Developer tries to paginate by timestamp or slot, but the API uses signature-based cursors.
**Why it happens:** The Enhanced API's `before-signature` parameter is the only pagination mechanism for `/v0/addresses/{address}/transactions`.
**How to avoid:** Always store the last signature from each batch and pass it as `before-signature` for the next page.
**Warning signs:** Missing transactions or infinite loops during backfill.

### Pitfall 4: Same Token Re-Entry Creates Ambiguous Trade Boundaries
**What goes wrong:** User buys TokenX, sells it all (closed), then buys TokenX again. The parser merges all transactions into one trade, producing incorrect P&L.
**Why it happens:** Current `aggregateTokenTransactions` groups ALL transactions for a mint without time boundaries.
**How to avoid:** Detect position boundaries by tracking running token balance. When balance hits 0 (or dust), that closes a trade. Subsequent buys of the same mint start a new trade.
**Warning signs:** Trades with very high entry amounts that combine multiple separate positions.

**Recommendation:** Treat re-entries as separate trades. Track running balance per mint; when balance reaches 0 (accounting for dust), mark trade as closed. Next buy of same mint starts fresh. This aligns with how downstream cashout calculations work (each closed trade gets its own cashout recommendation).

### Pitfall 5: CoinGecko Rate Limit Exhaustion
**What goes wrong:** Multiple users syncing simultaneously exhaust the 30 calls/min free tier.
**Why it happens:** Without caching, every sync triggers a new price fetch.
**How to avoid:** Cache SOL/USD price server-side for 60 seconds. All syncs within that window share the same price. For the MVP user base, this is more than sufficient.
**Warning signs:** 429 errors from CoinGecko API.

### Pitfall 6: Transaction Fee Not Subtracted from P&L
**What goes wrong:** P&L shows higher profit than the user actually received because transaction fees (0.000005 SOL + priority fees) are not deducted.
**Why it happens:** The Enhanced API provides `fee` field in lamports, but it's easy to forget to include it.
**How to avoid:** For each swap transaction, subtract `tx.fee / 1e9` from the net P&L. Sum all fees across a trade's transactions for total fees paid.
**Warning signs:** P&L that doesn't match what the user sees in their wallet.

**Recommendation:** Add `total_fees_sol` field to the trade record. Subtract from net profit: `netProfit = totalExit - totalEntry - totalFees`.

## Discretion Recommendations

Based on research, these are recommendations for areas marked as Claude's discretion:

### Trade Closure Threshold
**Recommendation:** Keep existing approach -- balance = 0 OR balance < `DUST_THRESHOLD` (0.000001). This is already implemented and tested in `detectPositionClosure`. No percentage-based threshold needed; meme coin traders typically sell 100% or not at all.

### Re-Entry Handling
**Recommendation:** Treat as separate trades. When running token balance hits 0 (after dust normalization), close the trade. Next purchase of the same token starts a new trade. Rationale: each trade gets its own cashout recommendation in Phase 3, and merging positions across time gaps produces misleading ROI.

### Historical Backfill Depth
**Recommendation:** 500 transactions (5 pages of 100). This covers approximately 1-2 months of active meme coin trading. The Enhanced API with `?type=SWAP` filter means these are all swap transactions (no transfers, staking, etc. diluting the count). First sync fetches up to 500; subsequent syncs fetch only new transactions since `last_synced_at`.

### Sync Progress Indicator
**Recommendation:** Simple spinner with status text. Three states: "Syncing trades..." (during fetch), "Processing..." (during parse/save), then toast with result count. Full step-by-step progress is over-engineering for a sync that completes in 2-5 seconds.

### USD Price Source
**Recommendation:** Current SOL/USD price at sync time via CoinGecko. Historical prices per-transaction add complexity (need price oracle with historical data, different API, storage) with minimal value -- the user cares about "how much USD is this profit worth NOW" for cashout decisions, not what it was worth when the trade happened.

### Rug Pull Classification
**Recommendation:** Track as normal loss with -100% ROI. A rug pull is functionally identical to a complete loss from the P&L perspective. Flagging separately requires token metadata analysis (liquidity removal detection) which is out of scope. The 0 exit SOL + dust balance already correctly captures the financial outcome.

### Airdrop Handling
**Recommendation:** Ignore airdrops. The `?type=SWAP` filter on the Enhanced API naturally excludes airdrop transactions (which are `TRANSFER` type). If a user later sells an airdropped token, it appears as a sell with 0 entry cost (no matching buy), resulting in 100% profit and infinite ROI. Cap ROI display at a reasonable maximum (e.g., 9999%) for these edge cases. This correctly reflects that the user received pure profit.

### wSOL Swap Treatment
**Recommendation:** Filter wSOL mint from trade grouping. The wSOL mint (`So11111111111111111111111111111111111111112`) is an intermediary in DEX swaps, not a trading position. The Enhanced API's `events.swap.nativeInput/nativeOutput` correctly captures SOL amounts regardless of wSOL wrapping. Simply add wSOL to a blocklist in `extractUniqueTokenMints`.

## Code Examples

### Enhanced Transaction Response Shape (SWAP type)
```typescript
// Source: https://www.helius.dev/docs/api-reference/enhanced-transactions/gettransactionsbyaddress
// Actual response from GET /v0/addresses/{address}/transactions?type=SWAP

interface EnhancedTransaction {
  description: string;         // "User swapped 1.5 SOL for 225.5 USDC on Jupiter"
  type: "SWAP";
  source: string;              // "JUPITER" | "RAYDIUM" | "ORCA" | etc.
  fee: number;                 // Transaction fee in lamports
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;           // Unix timestamp

  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;            // In lamports
  }>;

  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
  }>;

  events: {
    swap?: {
      nativeInput?: { account: string; amount: string };   // SOL spent (lamports)
      nativeOutput?: { account: string; amount: string };  // SOL received (lamports)
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
```

### Idempotent Sync with Backfill
```typescript
// Pattern for first-sync backfill vs incremental sync
async function syncTrades(walletAddress: string, userId: string): Promise<SyncResult> {
  const wallet = await getWalletByAddress(walletAddress, userId);
  const lastSync = wallet?.last_synced_at;

  let allSwaps: EnhancedTransaction[];

  if (!lastSync) {
    // First sync: backfill up to 500 transactions
    allSwaps = await backfillSwapHistory(walletAddress, 500);
  } else {
    // Incremental: fetch recent swaps only (100 max)
    allSwaps = await getSwapHistory(walletAddress, { limit: 100 });
    // Filter to only transactions after last sync
    const lastSyncTs = new Date(lastSync).getTime() / 1000;
    allSwaps = allSwaps.filter(tx => tx.timestamp > lastSyncTs);
  }

  // Parse, detect closures, save...
}
```

### Position Closure with Balance Check
```typescript
// After parsing swaps, check current balances for closure detection
async function detectClosures(
  trades: AggregatedTrade[],
  walletAddress: string
): Promise<AggregatedTrade[]> {
  const balances = await getTokenBalances(walletAddress);

  return trades.map(trade => ({
    ...trade,
    positionClosed: detectPositionClosure(balances, trade.tokenMint),
  }));
}
```

### Toast Notification Pattern
```typescript
// Using sonner (already installed)
import { toast } from "sonner";

function notifySyncResult(newTrades: Trade[]): void {
  const closedCount = newTrades.filter(t => t.net_profit_sol !== undefined).length;

  if (closedCount > 0) {
    const totalProfit = newTrades.reduce((sum, t) => sum + t.net_profit_sol, 0);
    const profitSign = totalProfit >= 0 ? "+" : "";
    toast.success(
      `Found ${closedCount} new closed trade${closedCount > 1 ? "s" : ""} (${profitSign}${totalProfit.toFixed(4)} SOL)`
    );
  } else {
    toast.info("No new closed trades found");
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| getSignaturesForAddress + N x getTransaction | Enhanced API `/v0/addresses/{address}/transactions` | Available since Helius v0 | Single call replaces N+1 pattern; pre-parsed swap data |
| Enhanced API v0 only | `getTransactionsForAddress` JSON-RPC method | 2025 | 2-10x faster, cursor pagination, but requires RPC call format |
| Manual wSOL detection | Helius `events.swap.nativeInput/nativeOutput` | Available in Enhanced API | Correctly abstracts away wSOL wrapping for SOL amount extraction |

**Current codebase status:**
- `helius-client.ts` uses raw RPC methods (getSignaturesForAddress + getTransaction) -- needs refactoring to Enhanced API
- `trade-parser.ts` parses from raw transaction format -- needs updating for Enhanced API response shape
- `trade-service.ts` has TODO comments for balance-based closure detection and incremental sync -- these need implementing
- 1 failing test in `aggregateTokenTransactions` (totalExitSol returns 0 instead of 2) -- pre-existing bug to fix

## Open Questions

1. **Enhanced API vs getTransactionsForAddress RPC**
   - What we know: Both work. Enhanced API is REST GET, simpler. getTransactionsForAddress is newer JSON-RPC, claimed 2-10x faster with cursor pagination.
   - What's unclear: Whether the newer RPC method returns the same `events.swap` structure. Documentation is less detailed.
   - Recommendation: Use Enhanced REST API (`/v0/addresses/{address}/transactions`). It's well-documented, matches the existing `fetch` pattern, and the response schema is fully verified. The newer RPC method can be a future optimization if needed.

2. **Token Symbol Resolution**
   - What we know: The Enhanced API `tokenTransfers` include `mint` but not `symbol`. Current code has `tokenSymbol: undefined` with a TODO comment.
   - What's unclear: Whether to use Helius Token Metadata API or another source for symbol lookup.
   - Recommendation: Defer token symbol/name resolution to Phase 3 (dashboard display). For Phase 2, store `token_mint` only. Symbol lookup is a display concern, not a P&L calculation concern.

3. **Helius API Credit Cost**
   - What we know: Enhanced API costs 100 credits per request. Free tier is limited.
   - What's unclear: Exact credit budget for the user's Helius plan.
   - Recommendation: Design for efficiency (type=SWAP filter, pagination limits) but this is a deployment concern, not a code concern.

## Sources

### Primary (HIGH confidence)
- Helius Enhanced Transactions API docs: https://www.helius.dev/docs/api-reference/enhanced-transactions/gettransactionsbyaddress -- endpoint URL, parameters, response schema verified
- Helius Enhanced Transactions LLMs reference: https://www.helius.dev/docs/api-reference/enhanced-transactions/llms.txt -- full swap event structure verified
- Helius blog on getTransactionsForAddress: https://www.helius.dev/blog/introducing-gettransactionsforaddress -- newer endpoint details

### Secondary (MEDIUM confidence)
- CoinGecko API pricing: https://www.coingecko.com/en/api/pricing -- free tier at 30 calls/min, 10K/month confirmed
- CoinGecko rate limits: https://support.coingecko.com/hc/en-us/articles/4538771776153 -- rate limit details
- Jupiter wSOL docs: https://dev.jup.ag/guides/general/wrapped-sol -- wSOL wrapping/unwrapping behavior confirmed (redirected to Zendesk, core info from search results)

### Tertiary (LOW confidence)
- wSOL mint address `So11111111111111111111111111111111111111112`: Widely referenced across Solana documentation; verified as the standard wrapped SOL mint, but should be confirmed against on-chain data during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use; no new dependencies needed
- Architecture: HIGH -- existing code structure is sound; changes are targeted refactors, not rewrites
- Helius Enhanced API: HIGH -- official docs verified, response schemas documented with examples
- wSOL handling: MEDIUM -- behavior well-understood from multiple sources, but exact transaction parsing needs validation with real swap data
- CoinGecko pricing: MEDIUM -- free tier limits verified, but actual request format should be tested
- Pitfalls: HIGH -- identified from codebase analysis (existing TODOs, failing test) and API documentation

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (Helius API is stable; CoinGecko free tier may change)
