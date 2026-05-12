# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
profit-is-profit/
├── src/
│   ├── app/                       # Next.js App Router pages and API routes
│   │   ├── page.tsx              # Landing page (home) with wallet connection
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global Tailwind styles
│   │   ├── dashboard/            # Dashboard page (protected, requires auth)
│   │   │   └── page.tsx
│   │   ├── trades/               # Trade history page (protected)
│   │   │   └── page.tsx
│   │   ├── goals/                # Goals page (protected)
│   │   │   └── page.tsx
│   │   ├── setup/                # Wallet setup page (disabled - redirects to dashboard)
│   │   │   └── page.tsx
│   │   ├── health-check/         # Health check endpoint (public)
│   │   │   └── page.tsx
│   │   └── api/                  # Server-side API routes
│   │       ├── dashboard/        # GET - Fetch dashboard data
│   │       ├── trades/           # GET - Fetch user trades
│   │       │   └── refresh/      # POST - Sync trades from blockchain
│   │       ├── goals/            # GET/POST - Goal management
│   │       └── wallets/
│   │           └── setup/        # POST - Create user and wallets
│   │
│   ├── components/               # Reusable React components
│   │   ├── ui/                   # Radix UI wrapper components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── table.tsx
│   │   │   ├── form.tsx
│   │   │   └── skeleton.tsx      # Loading placeholders
│   │   ├── auth/                 # Authentication components
│   │   │   ├── WalletConnectButton.tsx  # Wallet connection UI
│   │   │   └── __tests__/        # Component tests
│   │   ├── trade/                # Trade-related components
│   │   │   ├── TradeList.tsx     # Display list of trades
│   │   │   └── __tests__/
│   │   ├── wallet/               # Wallet display components
│   │   │   ├── WalletCard.tsx    # Single wallet display
│   │   │   ├── TierBadge.tsx     # Tier indicator
│   │   │   └── __tests__/
│   │   ├── goal/                 # Goal tracking components
│   │   │   ├── GoalProgress.tsx  # Goal progress indicator
│   │   │   └── __tests__/
│   │   ├── setup/                # Onboarding components
│   │   │   ├── WalletSetupForm.tsx
│   │   │   ├── GoalSetupForm.tsx
│   │   │   ├── SetupProgress.tsx
│   │   │   └── __tests__/
│   │   └── layout/               # Layout/shell components
│   │       ├── DashboardLayout.tsx  # Sidebar, header, nav
│   │       └── __tests__/
│   │
│   ├── lib/                      # Core business logic and utilities
│   │   ├── stores/               # Zustand state management
│   │   │   ├── auth-store.ts     # Wallet auth state (wallet address, connection status, error)
│   │   │   └── __tests__/
│   │   ├── services/             # Service layer orchestrating operations
│   │   │   ├── trade-service.ts  # Trade sync, database save, balance updates
│   │   │   └── token-registry-service.ts  # Token metadata fetching
│   │   ├── helpers/              # Pure utility functions
│   │   │   ├── trade-helpers.ts  # Transaction grouping, amount calculations
│   │   │   ├── cashout-helpers.ts  # Cashout percentage calculations
│   │   │   ├── helius-helpers.ts  # Solana address validation, API error handling
│   │   │   ├── tier-helpers.ts   # Tier-related calculations
│   │   │   ├── token-metadata.ts # Token symbol/decimals lookup
│   │   │   └── __tests__/        # Helper function tests
│   │   ├── helius-client.ts      # Solana blockchain API client
│   │   ├── trade-parser.ts       # Parse transactions into trades
│   │   ├── tier-calculator.ts    # Calculate user tier from performance
│   │   ├── cashout-calculator.ts # Calculate cashout percentages
│   │   ├── supabase.ts           # Client-side Supabase initialization
│   │   ├── supabase-server.ts    # Server-side admin Supabase client
│   │   ├── constants.ts          # Global constants (Helius API key, rate limits, etc.)
│   │   ├── utils.ts              # Generic utilities (cn classname merging)
│   │   └── __tests__/            # Library-level tests
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useRequireAuth.ts     # Protect pages requiring authentication
│   │   ├── useRequireSetup.ts    # Protect pages requiring wallet setup
│   │   └── __tests__/
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Domain models (User, Wallet, Trade, Goal, etc.)
│   │   ├── database.ts           # Supabase schema types (auto-generated)
│   │   └── [other types].ts
│   │
│   ├── middleware.ts             # Next.js request middleware for route protection
│   └── migrations/               # Database migration files
│
├── vitest.config.ts              # Vitest test runner configuration
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint linting rules
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
└── .env                          # Environment variables (not committed - secrets)
```

## Directory Purposes

**src/app:**
- Purpose: Page components and API routes using Next.js 16 App Router
- Contains: Server and client components (pages.tsx), API route handlers, root layout, global styles
- Key files:
  - `page.tsx` - Landing page entry point
  - `middleware.ts` - Route protection and redirection
  - `api/*/route.ts` - Server-side API endpoints

**src/components:**
- Purpose: Reusable React UI components organized by feature/domain
- Contains: UI primitives (button, card, dialog), feature components (TradeList, WalletCard), layout shells
- Key files:
  - `ui/*` - Radix UI wrappers with Tailwind styling
  - `auth/WalletConnectButton.tsx` - Main auth entry point component
  - `layout/DashboardLayout.tsx` - App-wide navigation and layout

**src/lib:**
- Purpose: Core business logic, external integrations, state management, utilities
- Contains: Calculators, services, API clients, stores, helpers, constants
- Key files:
  - `stores/auth-store.ts` - Zustand auth state with localStorage
  - `services/*.ts` - Orchestrators coordinating multiple operations
  - `trade-parser.ts`, `tier-calculator.ts`, `cashout-calculator.ts` - Domain logic
  - `helius-client.ts`, `supabase.ts` - External API clients

**src/hooks:**
- Purpose: Custom React hooks encapsulating reusable logic patterns
- Contains: Auth/setup protection hooks, potentially data-fetching hooks
- Pattern: Export hook functions that use Zustand stores and Next.js router

**src/types:**
- Purpose: Define domain models, database schemas, API types
- Contains: TypeScript interfaces and enums
- Key files:
  - `index.ts` - Main domain types (User, Wallet, Trade, Tier, TradeStatus, etc.)
  - `database.ts` - Supabase schema type definitions

**src/migrations:**
- Purpose: Store SQL migration files for database schema
- Contains: Version-numbered SQL files for schema changes
- Executed: External to Next.js (database management tool)

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Landing page, wallet connection flow starts here
- `src/app/dashboard/page.tsx`: Main authenticated dashboard
- `src/app/layout.tsx`: Root HTML structure (minimal - just children)
- `src/middleware.ts`: Request routing and auth checks

**Configuration:**
- `next.config.ts`: Next.js build and runtime settings
- `tsconfig.json`: TypeScript compiler options with `@/*` path alias
- `eslint.config.mjs`: Linting rules (extends next/core-web-vitals, next/typescript)
- `vitest.config.ts`: Test runner with jsdom environment, aliases
- `package.json`: Dependencies (React 19, Next 16, Zustand, Supabase, Helius, Radix UI)

**Core Logic:**
- `src/lib/trade-parser.ts`: Converts blockchain transactions to Trade objects
- `src/lib/tier-calculator.ts`: Determines user tier (REBUILD to MAXIMUM)
- `src/lib/cashout-calculator.ts`: Calculates profit-taking percentages
- `src/lib/services/trade-service.ts`: Orchestrates trade sync from Helius to database
- `src/lib/stores/auth-store.ts`: Client-side wallet authentication state

**Testing:**
- `src/**/__tests__/*.test.ts(x)`: Test files co-located with implementation
- `vitest.config.ts`: Test configuration (jsdom, globals, coverage exclusions)

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Component files: PascalCase.tsx (e.g., `WalletConnectButton.tsx`)
- Utility/service files: camelCase.ts (e.g., `trade-parser.ts`, `helius-client.ts`)
- Test files: `ComponentName.test.tsx` or `function-name.test.ts`
- Type definition files: `database.ts`, `index.ts` for shared types

**Directories:**
- Feature-based components: lowercase plural (e.g., `components/trade/`, `components/wallet/`)
- Utility directories: lowercase (e.g., `lib/services/`, `lib/helpers/`, `lib/stores/`)
- Test subdirectories: `__tests__/` within the directory being tested

**Functions:**
- Async service/API functions: PascalCase (e.g., `syncTrades()`, `calculateCashout()`)
- Helper utilities: camelCase (e.g., `calculateNetProfit()`, `isValidSolanaAddress()`)
- React hooks: `useXxx` pattern (e.g., `useRequireAuth()`, `useAuthStore()`)
- Component functions: PascalCase (e.g., `WalletConnectButton`, `TradeList`)

**Variables:**
- State variables: camelCase (e.g., `walletAddress`, `isLoading`)
- Constants: UPPER_SNAKE_CASE (e.g., `WALLET_AUTH_COOKIE`, `RATE_LIMIT`)
- Type/interface names: PascalCase (e.g., `WalletError`, `TradeListProps`)
- Enum values: UPPER_SNAKE_CASE (e.g., `Tier.REBUILD`, `TradeStatus.CONFIRMED`)

## Where to Add New Code

**New Feature (e.g., "Add trade filtering"):**
- Primary code: `src/components/trade/` (new component) + `src/lib/helpers/trade-helpers.ts` (filter logic)
- Tests: `src/components/trade/__tests__/NewComponent.test.tsx`
- API changes: Create/update route in `src/app/api/trades/route.ts`

**New Component/Module (e.g., "Add price charts"):**
- Implementation: `src/components/charts/PriceChart.tsx` (create new directory)
- Tests: `src/components/charts/__tests__/PriceChart.test.tsx`
- Styling: Use Tailwind classes directly (no separate CSS files)
- Export: Use named exports from `src/components/charts/index.ts` (optional barrel file)

**New Utility/Helper (e.g., "Format price with decimals"):**
- Location: `src/lib/helpers/formatting-helpers.ts` (create new file or add to existing helpers)
- Pattern: Export pure functions with clear single responsibility
- Tests: `src/lib/__tests__/formatting-helpers.test.ts`
- Import path: `import { formatPrice } from "@/lib/helpers/formatting-helpers"`

**New API Endpoint (e.g., "Get wallet history"):**
- Location: `src/app/api/wallets/history/route.ts` (create new route file)
- Pattern:
  ```typescript
  export async function GET(request: NextRequest) {
    // Check auth cookie
    // Parse query params
    // Call service or database
    // Return NextResponse.json(...)
  }
  ```
- Tests: Test the service/helper it calls, not the API route directly (integration tested via E2E if needed)

**New State/Store (e.g., "Trade filters state"):**
- Location: `src/lib/stores/trade-filters-store.ts`
- Pattern: Use Zustand `create()` with optional `persist` middleware
- Export: Default export of `create()` result
- Usage: `const { filters, setFilters } = useTradeFiltersStore()`

**New Type/Interface (e.g., "API response type"):**
- Location: `src/types/index.ts` (add to main file if domain-related) or new file like `src/types/api-responses.ts`
- Pattern: TypeScript `interface` for object shapes, `type` for unions/complex types, `enum` for constants
- Supabase schema types: Auto-generated into `src/types/database.ts`

## Special Directories

**src/components/ui:**
- Purpose: Radix UI component wrappers with Tailwind styling
- Generated: Partially auto-generated from shadcn/ui template
- Committed: Yes - these are application-specific UI primitives
- Pattern: Each file exports a single component or component group with sensible defaults and variants

**src/migrations:**
- Purpose: Track database schema changes
- Generated: No - manually created SQL files
- Committed: Yes - essential for schema versioning
- Pattern: Version prefix (e.g., `001_create_users_table.sql`)

**.next:**
- Purpose: Next.js build output
- Generated: Yes - from `next build`
- Committed: No - in `.gitignore`

**node_modules:**
- Purpose: npm/pnpm dependencies
- Generated: Yes - from `package.json` and `pnpm-lock.yaml`
- Committed: No - in `.gitignore`

---

*Structure analysis: 2026-02-20*
