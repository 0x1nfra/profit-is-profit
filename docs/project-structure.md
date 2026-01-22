# Profit is Profit (P is P) - Project Structure

## 📁 Complete File Structure

```
profit-is-profit/
├── docs/                           # Documentation
│   ├── prd.md                      # Product Requirements Document
│   ├── functional-logic.md         # Business logic specifications
│   ├── technical-design.md         # Technical architecture
│   └── ROADMAP.md                  # Development roadmap
│
├── public/                         # Static assets
│   ├── next.svg
│   ├── vercel.svg
│   └── ... (other SVGs)
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home/landing page
│   │   ├── globals.css             # Global styles
│   │   │
│   │   ├── health-check/           # System health monitoring
│   │   │   └── page.tsx            # ✅ DONE - Health check dashboard
│   │   │
│   │   ├── setup/                  # 📅 Week 2 - First-time setup
│   │   │   └── page.tsx            # Wallet setup form
│   │   │
│   │   ├── dashboard/              # 📅 Week 2 - Main dashboard
│   │   │   └── page.tsx            # Trading/vault wallets, tier, trades
│   │   │
│   │   ├── trades/                 # 📅 Week 2 - Trade history
│   │   │   └── page.tsx            # Historical trade view
│   │   │
│   │   ├── goals/                  # 📅 Week 3 - Goal management
│   │   │   └── page.tsx            # Monthly goals, progress tracking
│   │   │
│   │   └── api/                    # API Routes
│   │       ├── wallets/
│   │       │   ├── setup/
│   │       │   │   └── route.ts    # POST - Initial wallet setup
│   │       │   └── route.ts        # GET - Get user's wallets
│   │       │
│   │       ├── trades/
│   │       │   ├── refresh/
│   │       │   │   └── route.ts    # POST - Fetch new trades from Helius
│   │       │   └── route.ts        # GET - Get trade history
│   │       │
│   │       ├── cashouts/
│   │       │   └── [tradeId]/
│   │       │       ├── confirm/
│   │       │       │   └── route.ts # POST - Confirm cashout
│   │       │       └── override/
│   │       │           └── route.ts # PUT - Override cashout amount
│   │       │
│   │       ├── goals/
│   │       │   ├── route.ts        # GET/PUT - Goal settings
│   │       │   └── boost/
│   │       │       └── route.ts    # POST - Accept/decline boost
│   │       │
│   │       └── dashboard/
│   │           └── route.ts        # GET - All dashboard data
│   │
│   ├── components/                 # React components
│   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── button.tsx          # ✅ DONE
│   │   │   ├── card.tsx            # ✅ DONE
│   │   │   ├── badge.tsx           # ✅ DONE
│   │   │   ├── table.tsx           # ✅ DONE
│   │   │   ├── input.tsx           # ✅ DONE
│   │   │   ├── dialog.tsx          # ✅ DONE
│   │   │   ├── progress.tsx        # ✅ DONE
│   │   │   └── ... (more as needed)
│   │   │
│   │   ├── wallet/                 # Wallet-related components
│   │   │   ├── WalletCard.tsx      # Display wallet balance + tier
│   │   │   ├── WalletAddressInput.tsx # Input with validation
│   │   │   └── TierBadge.tsx       # Color-coded tier indicator
│   │   │
│   │   ├── trade/                  # Trade-related components
│   │   │   ├── TradeList.tsx       # List of recent trades
│   │   │   ├── CashoutCard.tsx     # Cashout suggestion UI
│   │   │   └── TradeHistoryTable.tsx # Full trade history table
│   │   │
│   │   ├── goal/                   # Goal-related components
│   │   │   ├── GoalProgress.tsx    # Progress bar with stats
│   │   │   └── BoostSuggestion.tsx # Sunday boost UI
│   │   │
│   │   └── shared/                 # Shared components
│   │       ├── RefreshButton.tsx   # Manual refresh trigger
│   │       └── LoadingSpinner.tsx  # Loading states
│   │
│   ├── lib/                        # Core utilities & logic
│   │   ├── supabase.ts             # ✅ DONE - Database client
│   │   ├── utils.ts                # ✅ DONE - cn() helper
│   │   │
│   │   ├── tier-calculator.ts      # 📅 Day 3-4 - Tier calculation
│   │   ├── cashout-calculator.ts   # 📅 Day 3-4 - Cashout logic
│   │   ├── constants.ts            # 📅 Day 3-4 - Config & constants
│   │   │
│   │   ├── helius-client.ts        # 📅 Day 5-6 - Helius API wrapper
│   │   ├── trade-parser.ts         # 📅 Day 5-6 - Parse transactions
│   │   │
│   │   ├── services/               # Business logic services
│   │   │   ├── wallet-service.ts   # 📅 Day 7 - Wallet operations
│   │   │   ├── trade-service.ts    # 📅 Week 2 - Trade operations
│   │   │   ├── cashout-service.ts  # 📅 Week 2 - Cashout operations
│   │   │   └── goal-service.ts     # 📅 Week 3 - Goal operations
│   │   │
│   │   └── stores/                 # Zustand state management
│   │       ├── wallet-store.ts     # 📅 Day 7 - Wallet state
│   │       ├── trade-store.ts      # 📅 Week 2 - Trade state
│   │       └── goal-store.ts       # 📅 Week 3 - Goal state
│   │
│   ├── types/                      # TypeScript definitions
│   │   ├── index.ts                # ✅ DONE - Main types
│   │   └── database.ts             # ✅ DONE - Supabase types
│   │
│   └── hooks/                      # Custom React hooks (optional)
│       ├── useWallets.ts           # Hook for wallet data
│       ├── useTrades.ts            # Hook for trade data
│       └── useGoals.ts             # Hook for goal data
│
├── .env.local                      # Environment variables (not in git)
├── .gitignore                      # ✅ DONE
├── package.json                    # ✅ DONE
├── tsconfig.json                   # ✅ DONE
├── next.config.ts                  # ✅ DONE
├── postcss.config.mjs              # ✅ DONE
├── eslint.config.mjs               # ✅ DONE
├── components.json                 # ✅ DONE - shadcn config
├── pnpm-workspace.yaml             # ✅ DONE
└── README.md                       # ✅ DONE
```

---

## 📊 Status Legend

- ✅ **DONE** - Already implemented
- 📅 **Day X** - Scheduled in roadmap
- 🔜 **Week X** - Planned for specific week
- ⚠️ **Optional** - Nice to have, not MVP critical

---

## 🗂️ Directory Purposes

### `/docs`

- All project documentation
- Keep PRD, specs, and roadmap here
- Reference during development

### `/src/app`

- Next.js 14 App Router pages
- Each folder = a route
- `page.tsx` = the actual page component
- `layout.tsx` = shared layout wrapper
- `/api` subfolder = backend API routes

### `/src/components`

- **`/ui`** - Base UI components from shadcn/ui (button, card, etc.)
- **`/wallet`, `/trade`, `/goal`** - Feature-specific components
- **`/shared`** - Reusable across features

### `/src/lib`

- **Root files** - Core utilities (database, calculations)
- **`/services`** - Business logic layer (CRUD operations)
- **`/stores`** - Zustand state management

### `/src/types`

- All TypeScript interfaces and types
- Keep database types separate from app types

---

## 🎯 Current State (Day 1-2 Complete)

### ✅ What's Built

```
src/
├── app/
│   ├── layout.tsx           ✅
│   ├── page.tsx             ✅
│   ├── globals.css          ✅
│   └── health-check/
│       └── page.tsx         ✅
├── components/ui/           ✅ (7 components)
├── lib/
│   ├── supabase.ts          ✅
│   └── utils.ts             ✅
└── types/
    ├── index.ts             ✅
    └── database.ts          ✅
```

### 📅 Next Up (Day 3-4)

```
src/lib/
├── tier-calculator.ts       ⏳ Next
├── cashout-calculator.ts    ⏳ Next
└── constants.ts             ⏳ Next
```

---

## 🚀 How to Navigate

### When building a feature:

1. **Start with types** (`/types/index.ts`)
   - Define interfaces for the feature

2. **Build business logic** (`/lib/`)
   - Core calculations and utilities
   - No UI dependencies

3. **Create service layer** (`/lib/services/`)
   - Database operations
   - API integrations

4. **Build API routes** (`/app/api/`)
   - HTTP endpoints
   - Use services for logic

5. **Create UI components** (`/components/`)
   - Feature-specific components
   - Use UI primitives from `/ui`

6. **Build pages** (`/app/`)
   - Compose components
   - Call API routes

### File Naming Conventions

- **Components**: PascalCase (`WalletCard.tsx`)
- **Utilities**: kebab-case (`tier-calculator.ts`)
- **API Routes**: `route.ts` (Next.js convention)
- **Pages**: `page.tsx` (Next.js convention)
- **Types**: `index.ts` or `database.ts`

---

## 📦 Import Path Aliases

Use the `@/` alias for clean imports:

```typescript
// ✅ Good
import { supabase } from "@/lib/supabase";
import { Wallet } from "@/types";
import { Button } from "@/components/ui/button";

// ❌ Avoid
import { supabase } from "../../lib/supabase";
```

---

## 🔍 Finding Things Quickly

**Need to work on wallets?**

```
src/
├── app/api/wallets/          # API endpoints
├── components/wallet/        # UI components
├── lib/services/wallet-service.ts  # Business logic
└── lib/stores/wallet-store.ts      # State management
```

**Need to work on trades?**

```
src/
├── app/api/trades/           # API endpoints
├── components/trade/         # UI components
├── lib/services/trade-service.ts   # Business logic
└── lib/stores/trade-store.ts       # State management
```

**Need to work on goals?**

```
src/
├── app/api/goals/            # API endpoints
├── components/goal/          # UI components
├── lib/services/goal-service.ts    # Business logic
└── lib/stores/goal-store.ts        # State management
```

---

## 💡 Best Practices

1. **Keep components small** - One responsibility per component
2. **Business logic in /lib** - Never in components
3. **API routes call services** - Don't put logic in routes
4. **Types first** - Define interfaces before implementation
5. **Test utilities** - Business logic is easiest to test

---

## 🎨 Component Organization Example

**Good Component Structure:**

```typescript
// WalletCard.tsx
import { Card } from "@/components/ui/card";
import { TierBadge } from "@/components/wallet/TierBadge";
import { Wallet } from "@/types";

interface WalletCardProps {
  wallet: Wallet;
}

export function WalletCard({ wallet }: WalletCardProps) {
  // Component logic here
}
```

**Good Service Structure:**

```typescript
// wallet-service.ts
import { supabase } from "@/lib/supabase";
import { Wallet, WalletType } from "@/types";

export async function getWalletsByUserId(userId: string): Promise<Wallet[]> {
  // Database logic here
}

export async function updateWalletBalance(
  walletId: string,
  balance: number,
): Promise<Wallet> {
  // Update logic here
}
```

---

## 📝 Next Steps

Now that you have this structure overview:

1. ✅ You know where everything goes
2. ✅ You can navigate the codebase easily
3. ✅ You understand the file organization
4. 🚀 Ready to build Day 3-4 features!

\*\*Shall we start building the core business l
