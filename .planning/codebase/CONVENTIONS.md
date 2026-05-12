# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**
- Components: PascalCase, e.g., `WalletConnectButton.tsx`, `TradeList.tsx`, `DashboardLayout.tsx`
- Pages: kebab-case with `.tsx` extension, e.g., `page.tsx` (Next.js App Router)
- Utilities and helpers: camelCase, e.g., `cashout-calculator.ts`, `trade-parser.ts`
- Test files: Co-located with `__tests__` subdirectory, e.g., `src/components/auth/__tests__/WalletConnectButton.test.tsx`
- Stores: camelCase with `-store` suffix, e.g., `auth-store.ts`
- API routes: Use Next.js routing convention at `src/app/api/[resource]/route.ts`

**Functions:**
- Exported functions: camelCase, e.g., `calculateCashout()`, `parseTrades()`, `isValidSolanaAddress()`
- React components: PascalCase, e.g., `export function WalletConnectButton()`, `export function TradeList()`
- Helper/utility functions: camelCase descriptive names, e.g., `calculateROIBonus()`, `extractTokenTransfers()`
- Event handlers in components: camelCase with "handle" prefix, e.g., `handleConnect()`, `handleDisconnect()`

**Variables:**
- State and constants: camelCase, e.g., `walletAddress`, `connectionStatus`, `isAuthenticated`
- Boolean values: prefix with `is`, `has`, `should`, e.g., `isWin`, `isPending`, `hasMoreTrades`
- Enum-like objects: SCREAMING_SNAKE_CASE for enum values, e.g., `Tier.REBUILD`, `TradeStatus.PENDING`
- Constants in files: camelCase, e.g., `sizeClasses`, `variantClasses`, `walletAuthCookie`
- Magic numbers: avoid; use named constants, e.g., `WALLET_AUTH_COOKIE = "pisp-wallet-auth"`

**Types and Interfaces:**
- Interfaces: PascalCase suffix with convention, e.g., `WalletConnectButtonProps`, `TradeListProps`, `CashoutInput`
- Type unions: describe the state, e.g., `type ConnectionStatus = "idle" | "connecting" | "connected" | "error"`
- Error classes: PascalCase with "Error" suffix, e.g., `ApiError`, `ValidationError`, `HeliusError`
- Database interfaces: Match database schema exactly, e.g., `User`, `Wallet`, `Trade` with snake_case fields

## Code Style

**Formatting:**
- Tool: ESLint 9 with Next.js config (see `eslint.config.mjs`)
- Indentation: 2 spaces (default Next.js/TypeScript)
- Line length: No strict limit; ESLint enforces core-web-vitals rules
- Trailing commas: Included in multi-line structures

**Linting:**
- Config: `eslint.config.mjs` using flat config format
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Key rules enforced:
  - Strict TypeScript checks enabled (`strict: true` in `tsconfig.json`)
  - No explicit `any` without comment: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
  - React hooks rules via `eslint-plugin-react-hooks`

**TypeScript Configuration:**
- Target: ES2017
- Strict mode: Enabled
- Path alias: `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Module resolution: `bundler` (Next.js standard)

## Import Organization

**Order:**
1. External libraries (React, Next.js, third-party packages)
2. Internal types (from `@/types`)
3. Internal utilities and hooks (from `@/lib`)
4. Components (from `@/components`)
5. Type imports (using `type` keyword)

**Example from codebase:**
```typescript
import React from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore, type WalletError, type ConnectionStatus } from "@/lib/stores/auth-store";
import { Wallet, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Trade, TradeStatus, Tier } from "@/types";
```

**Path Aliases:**
- Always use `@/` for imports from src directory
- Never use relative paths like `../`

## Error Handling

**Patterns:**
- Create custom error classes extending Error, e.g., `ApiError`, `ValidationError`, `HeliusError` (in `src/types/index.ts`)
- Include error context: status code, error code, field name where applicable
- In try-catch blocks, explicitly check `err instanceof Error` before accessing `.message`
- For promise rejections, throw typed errors rather than generic Error

**Example from codebase (`src/lib/cashout-calculator.ts`):**
```typescript
const validation = validateCashoutInput(input);
if (!validation.valid) {
  throw new Error(`Invalid cashout input: ${validation.errors.join(", ")}`);
}
```

**API responses:**
- All API routes return `{ success: boolean; data?: T; error?: { message: string; code?: string } }`
- Errors include machine-readable `code` for client-side handling
- HTTP status codes: 401 (Unauthorized), 404 (Not Found), 500 (Internal Error)

## Logging

**Framework:** `console` (no external logging library currently)

**Patterns:**
- Minimal logging in production code
- Use `console.error()` for errors only
- Avoid logging sensitive data (wallet addresses in logs)
- Tests use `vitest` output only

## Comments

**When to Comment:**
- Complex algorithms: Include JSDoc with explanation and examples
- Non-obvious business logic: Document the "why" not the "what"
- Type definitions: JSDoc for exported types and interfaces
- Avoid: Comments stating obvious code (e.g., `// increment counter` above `count++`)

**JSDoc/TSDoc:**
- Used extensively for exported functions and types
- Include `@param`, `@returns`, `@throws` tags
- Include examples from specs or functional documents where relevant

**Example from `src/lib/cashout-calculator.ts`:**
```typescript
/**
 * Calculates the final cashout percentage and amount based on tier, ROI, streak, and optional goal boost
 *
 * Formula (Section 3.4 & 3.5):
 * Final Cashout % = (Base Rate + ROI Bonus) × Streak Multiplier × Goal Boost
 * Cashout Amount = Net Profit × Final Cashout %
 *
 * @param input - CashoutInput containing tier, netProfitSOL, roiPercent, losingStreak, and optional goalBoostPercent
 * @returns CashoutResult with final percentage, amount, and breakdown
 * @throws ValidationError if input is invalid
 */
export function calculateCashout(input: CashoutInput): CashoutResult
```

**File Headers:**
- All significant files include a header comment block with file purpose:
```typescript
// =============================================
// Component/Service Name
// src/path/to/file.ts
// =============================================
```

**Section Comments:**
- Code is organized into logical sections with separator comments:
```typescript
// =============================================
// ENUMS
// =============================================

// =============================================
// DATABASE MODELS
// =============================================
```

## Function Design

**Size:**
- Keep functions under 100 lines; larger functions are split into helpers
- Example: `src/lib/services/trade-service.ts` (546 lines) is split into logical functions, not one monolithic function

**Parameters:**
- Use object parameters for functions with 2+ parameters
- Include type annotations for all parameters
- Provide default values for optional parameters

**Example from `src/components/trade/TradeList.tsx`:**
```typescript
export function TradeList({
  trades,
  maxDisplay = 5,
  showViewAll = true,
  onConfirmCashout,
  onOverrideCashout,
}: TradeListProps) {
```

**Return Values:**
- Explicitly type return values (enforced by `strict: true`)
- Avoid implicit `any` returns
- Use union types for conditional returns (e.g., `T | null`, `T | undefined`)

## Module Design

**Exports:**
- Use named exports for utilities and components
- Use default export only for page components and main entry points
- Example from `src/components/auth/WalletConnectButton.tsx`:
```typescript
export function WalletConnectButton({ ... }: WalletConnectButtonProps) { ... }
export default WalletConnectButton;  // Both named and default for convenience
```

**Barrel Files:**
- Use index files to re-export from directories where beneficial
- Example: `src/components/ui/index.ts` may exist to export all UI components (if applicable)

## State Management

**Framework:** Zustand with persistence middleware

**Pattern:** Store defined in `src/lib/stores/[name]-store.ts`

**Example structure from `src/lib/stores/auth-store.ts`:**
```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State properties
      isAuthenticated: boolean;
      walletAddress: string | null;
      // Action methods
      setWalletAddress: (address: string | null) => void;
      connect: () => Promise<void>;
    }),
    {
      name: "auth-store",
    }
  )
);
```

## Client Components

**Pattern:** All interactive components use `"use client"` directive

**Imports:** Always import React from `"react"` in client components

**Props:** Define `Props` interface for component props, placed before component definition

**Example from `src/components/auth/WalletConnectButton.tsx`:**
```typescript
"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export interface WalletConnectButtonProps {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
  onConnect?: (walletAddress: string) => void;
  onError?: (error: WalletError) => void;
}

export function WalletConnectButton({
  size = "md",
  variant = "primary",
  ...
}: WalletConnectButtonProps) {
```

## Formatting and Utility Functions

**Common utilities location:** `src/lib/utils.ts`

**Example - `cn()` function:**
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

This is used throughout for conditional Tailwind classes:
```typescript
className={cn(
  "border rounded-lg p-4 space-y-3",
  isWin ? "bg-green-50/50" : "bg-red-50/50",
  "dark:bg-transparent"
)}
```

---

*Convention analysis: 2026-02-20*
