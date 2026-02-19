# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`
- Setup file: `vitest.setup.ts`

**Assertion Library:**
- Testing Library React 16.3.2 (component testing)
- Testing Library Jest-DOM 6.9.1 (DOM matchers)
- Vitest's native `expect()` for unit tests

**Run Commands:**
```bash
npm run test              # Run all tests once (vitest run)
npm run test:watch       # Run tests in watch mode (vitest)
npm run test:coverage    # Generate coverage report (vitest run --coverage)
```

## Test File Organization

**Location:**
- Co-located pattern: Tests live in `__tests__` subdirectories next to source files
- Example structure:
  - `src/components/auth/WalletConnectButton.tsx`
  - `src/components/auth/__tests__/WalletConnectButton.test.tsx`

**Naming:**
- Pattern: `[FileName].test.tsx` for component tests, `.test.ts` for utility tests
- Always use `.test.` not `.spec.` (Vitest config includes both, but convention is `.test.`)

**Directory pattern:**
```
src/
├── components/
│   ├── auth/
│   │   ├── WalletConnectButton.tsx
│   │   └── __tests__/
│   │       └── WalletConnectButton.test.tsx
│   ├── trade/
│   │   ├── TradeList.tsx
│   │   └── __tests__/
│   │       └── TradeList.test.tsx
│   └── layout/
│       ├── DashboardLayout.tsx
│       └── __tests__/
│           └── DashboardLayout.test.tsx
├── lib/
│   ├── cashout-calculator.ts
│   ├── trade-parser.ts
│   ├── stores/
│   │   ├── auth-store.ts
│   │   └── __tests__/
│   │       └── auth-store.test.ts
│   └── __tests__/
│       ├── trade-parser.test.ts
│       ├── cashout-calculator.test.ts
│       ├── trade-helpers.test.ts
│       └── helius-helpers.test.ts
```

**Covered test files:**
- `src/components/auth/__tests__/WalletConnectButton.test.tsx` (127 lines)
- `src/components/trade/__tests__/TradeList.test.tsx` (203 lines)
- `src/components/layout/__tests__/DashboardLayout.test.tsx`
- `src/components/setup/__tests__/SetupProgress.test.tsx`
- `src/components/setup/__tests__/GoalSetupForm.test.tsx`
- `src/components/wallet/__tests__/WalletCard.test.tsx`
- `src/components/wallet/__tests__/TierBadge.test.tsx`
- `src/components/goal/__tests__/GoalProgress.test.tsx`
- `src/lib/stores/__tests__/auth-store.test.ts` (343 lines)
- `src/lib/__tests__/trade-parser.test.ts` (430 lines)
- `src/lib/__tests__/cashout-calculator.test.ts` (315 lines)
- `src/lib/__tests__/trade-helpers.test.ts` (551 lines)
- `src/lib/__tests__/helius-helpers.test.ts` (288 lines)
- `src/lib/__tests__/error-classes.test.ts`
- `src/lib/__tests__/tier-calculator.test.ts`
- `src/lib/__tests__/tier-helpers.test.ts`
- `src/lib/__tests__/cashout-helpers.test.ts` (248 lines)
- `src/lib/__tests__/verify-calculations.ts`
- `src/lib/__tests__/utils.test.ts`

## Test Structure

**Suite Organization:**
```typescript
describe("ComponentName", () => {
  beforeEach(() => {
    // Reset state before each test
    useAuthStore.getState().reset();
  });

  it("should render connect button in idle state", () => {
    render(<WalletConnectButton />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("should handle async operations with waitFor", async () => {
    render(<WalletConnectButton />);
    fireEvent.click(screen.getByText("Connect Wallet"));

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
    });
  });
});
```

**Test description pattern:**
- Use "should" language: `it("should render...")`
- Be specific about what's being tested: `it("should show error state with retry button")`
- One assertion focus per test (though multiple assertions acceptable if testing one behavior)

**Patterns from codebase:**

### Component Tests (React Testing Library)

**Basic render test from `WalletConnectButton.test.tsx`:**
```typescript
it("should render connect button in idle state", () => {
  render(<WalletConnectButton />);
  expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
});
```

**State changes test from `WalletConnectButton.test.tsx`:**
```typescript
it("should show connecting state when connection is in progress", () => {
  useAuthStore.getState().setConnectionStatus("connecting");
  render(<WalletConnectButton />);
  expect(screen.getByText("Connecting...")).toBeInTheDocument();
});
```

**Props variation test from `TradeList.test.tsx`:**
```typescript
it("should apply different sizes correctly", () => {
  const { rerender } = render(<WalletConnectButton size="sm" />);
  expect(screen.getByText("Connect Wallet")).toBeInTheDocument();

  rerender(<WalletConnectButton size="md" />);
  expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
});
```

### Unit Tests

**Function behavior test from `trade-parser.test.ts`:**
```typescript
describe('parseTrades', () => {
  it('returns empty array for empty transactions', () => {
    const trades = parseTrades([], walletAddress)
    expect(trades).toEqual([])
  })

  it('throws ValidationError for invalid wallet address', () => {
    expect(() => {
      parseTrades([], 'invalid-address')
    }).toThrow(ValidationError)
  })
});
```

**Business logic test from `cashout-calculator.test.ts`:**
```typescript
describe('calculateCashout', () => {
  describe('functional-logic.md Section 3.5 Examples', () => {
    it('Example 1: Tier 3, ROI 65%, Streak 0 → 25%', () => {
      const result = calculateCashout({
        tier: Tier.GROWTH,
        roiPercent: 65,
        losingStreak: 0,
        netProfitSOL: 1,
      });
      expect(result.finalCashoutPercent).toBe(25);
      expect(result.cashoutAmountSOL).toBe(0.25);
    });
  });
});
```

## Mocking

**Framework:** vitest-mock-extended 3.1.0 for advanced mocking

**Next.js Router mocking in `vitest.setup.ts`:**
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
```

**Pattern for mocking functions in tests:**
```typescript
const onConnect = vi.fn();
const mockConnect = vi.fn().mockResolvedValue(undefined);

render(<WalletConnectButton onConnect={onConnect} />);
fireEvent.click(screen.getByText("Connect Wallet"));

await waitFor(() => {
  expect(mockConnect).toHaveBeenCalled();
});
```

**Mocking Zustand store actions:**
```typescript
beforeEach(() => {
  useAuthStore.getState().reset();
});

// In test:
useAuthStore.getState().setConnectionStatus("connecting");
```

**What to Mock:**
- External API calls (Helius, Supabase)
- Browser APIs (window.solana, localStorage)
- Next.js router navigation
- Async operations (use `.mockResolvedValue()` or `.mockRejectedValue()`)

**What NOT to Mock:**
- Business logic functions (test them directly)
- UI component behavior (test via rendered output)
- Zustand store (reset it, but don't mock the store itself)
- Utility functions like `cn()` (test actual output)

## Fixtures and Factories

**Test Data Factories:**

From `TradeList.test.tsx`:
```typescript
const createMockTrade = (
  id: string,
  isWin: boolean,
  status: TradeStatus = TradeStatus.PENDING
): Trade => ({
  id,
  user_id: "user-1",
  token_mint: "token-1",
  token_symbol: isWin ? "$ROCK" : "$PEPE",
  total_entry_sol: 2.0,
  total_exit_sol: isWin ? 4.5 : 1.5,
  net_profit_sol: isWin ? 2.5 : -0.5,
  // ... more fields
  position_closed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
});
```

**Usage:**
```typescript
it("should render win trade with token symbol", () => {
  const trades = [createMockTrade("1", true)];
  render(<TradeList trades={trades} />);
  expect(screen.getByText("$ROCK")).toBeInTheDocument();
});
```

From `trade-parser.test.ts`:
```typescript
const createMockTx = (overrides: Partial<HeliusTransaction> = {}): HeliusTransaction => ({
  signature: 'mock-sig-' + Math.random().toString(36).substring(7),
  timestamp: Date.now() / 1000,
  type: 'SWAP',
  source: 'JUPITER',
  fee: 0.000005,
  feePayer: walletAddress,
  slot: 123456789,
  ...overrides,
})

const createTokenTransfer = (overrides: Partial<TokenTransfer> = {}): TokenTransfer => ({
  fromUserAccount: otherAddress,
  toUserAccount: walletAddress,
  // ... default values
  ...overrides,
})
```

**Location:**
- Factories are defined at the top of test files within the describe block
- Constants are defined before the describe block
- Shared fixtures (if any) would live in a `fixtures/` directory adjacent to test

## Coverage

**Requirements:** No strict enforcement, but comprehensive coverage for:
- Business logic (cashout calculations, tier calculations, trade parsing)
- Component rendering (various props and states)
- Error handling (validation, edge cases)

**Excluded from coverage (`vitest.config.ts`):**
- `src/app/` - Next.js page components (integration tested via E2E)
- `src/components/ui/` - UI library components
- `**/*.d.ts` - Type definitions
- `**/*.config.*` - Configuration files
- `**/types/` - Type files

**View Coverage:**
```bash
npm run test:coverage
# Generates HTML report in coverage/ directory
```

**Coverage providers:** v8 (compiled)

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, business logic
- Approach: Direct function calls with mocked dependencies
- Examples: `trade-parser.test.ts`, `cashout-calculator.test.ts`, `tier-calculator.test.ts`
- Assertion: Direct output validation, error throwing

**Component Tests:**
- Scope: React component rendering and user interaction
- Approach: React Testing Library with user events
- Examples: `WalletConnectButton.test.tsx`, `TradeList.test.tsx`
- Assertion: DOM presence, visibility, state changes via rendered output

**Integration Tests:**
- Scope: Component + store interactions
- Approach: Render component with real Zustand stores (reset between tests)
- Examples: `WalletConnectButton.test.tsx` with auth store interactions
- Assertion: State synchronization, callback invocations

**E2E Tests:**
- Framework: Not implemented
- Plan: Use Playwright or Cypress if needed for full user journeys

## Common Patterns

**Async Testing:**

From `WalletConnectButton.test.tsx`:
```typescript
it("should call onConnect when connection succeeds", async () => {
  const onConnect = vi.fn();
  const walletAddress = "7xKxy123456789";

  const mockConnect = vi.fn().mockResolvedValue(undefined);
  useAuthStore.getState().connect = mockConnect;

  render(<WalletConnectButton onConnect={onConnect} />);
  fireEvent.click(screen.getByText("Connect Wallet"));

  await waitFor(() => {
    expect(mockConnect).toHaveBeenCalled();
  });
});
```

**Pattern:**
1. Mock the async function
2. Render component and trigger action
3. Use `await waitFor()` to wait for state changes
4. Assert expectations after async operation completes

**Error Testing:**

From `trade-parser.test.ts`:
```typescript
it('throws ValidationError for invalid wallet address', () => {
  expect(() => {
    parseTrades([], 'invalid-address')
  }).toThrow(ValidationError)
})
```

**Pattern:**
1. Wrap function call in `expect(() => { ... })`
2. Assert `.toThrow(ErrorClass)` or `.toThrow(/message/)`
3. For async errors: `await expect(promise).rejects.toThrow()`

**Empty State Testing:**

From `TradeList.test.tsx`:
```typescript
it("should render empty state when no trades", () => {
  render(<TradeList trades={[]} />);
  expect(screen.getByText("No Trades Yet")).toBeInTheDocument();
  expect(
    screen.getByText("Complete a trade to see cashout recommendations here.")
  ).toBeInTheDocument();
});
```

**Event Handler Testing:**

From `TradeList.test.tsx`:
```typescript
it("should call onConfirmCashout when button clicked", () => {
  const mockConfirm = vi.fn();
  const trades = [createMockTrade("trade-123", true, TradeStatus.PENDING)];
  render(<TradeList trades={trades} onConfirmCashout={mockConfirm} />);

  const button = screen.getByText("Confirm Cashout");
  fireEvent.click(button);

  expect(mockConfirm).toHaveBeenCalledWith("trade-123");
});
```

**Pattern:**
1. Create mock function with `vi.fn()`
2. Pass to component as prop
3. Find element and trigger event with `fireEvent` or user-event
4. Assert mock was called with expected arguments

**Conditional Rendering Testing:**

From `WalletConnectButton.test.tsx`:
```typescript
it("should apply fullWidth class when specified", () => {
  render(<WalletConnectButton fullWidth />);

  const button = screen.getByText("Connect Wallet").closest("button");
  expect(button?.className).toContain("w-full");
});
```

**Pattern:**
1. Render with specific props
2. Query the element
3. Assert class or attribute presence

## Coverage Exclusions and Gaps

**Known gaps (acceptable):**
- Page components (`src/app/`) are integration/E2E tested via deployment
- UI library components are from Radix UI and assumed working
- Mock data generation in tests uses randomization (not deterministic)

**Future improvements:**
- Add Playwright E2E tests for complete user flows
- Add performance/snapshot tests for complex calculations
- Add visual regression tests for component rendering

---

*Testing analysis: 2026-02-20*
