---
phase: 01-foundation-authentication
plan: 02
subsystem: wallet-setup, dashboard, middleware
tags: [wallet-setup, helius, balance-api, middleware, route-protection, cookies]

# Dependency graph
requires:
  - phase: 01-foundation-authentication
    plan: 01
    provides: Wallet authentication with session management
provides:
  - Wallet setup form with Solana address validation
  - Trading + vault wallet configuration
  - Balance fetching from Helius (SOL + USD)
  - Dashboard with wallet balance cards
  - Route protection middleware (auth + setup state)
  - Cookie-based auth state for server-side routing
affects: [all-authenticated-routes, future-wallet-features]

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-label": "Label component for forms"
    - "@supabase/ssr": "Server-side Supabase client (middleware compatibility)"
    - "CoinGecko API": "SOL/USD price fetching"
  patterns:
    - "Cookie-based auth state for middleware (pisp-auth, pisp-setup-complete)"
    - "Client-side wallet store + server-side cookie sync"
    - "Helius balance API with Promise.allSettled for batch fetching"
    - "Graceful error handling with 0 balance fallback"

key-files:
  created:
    - "src/components/ui/label.tsx": "Label component (shadcn/ui)"
    - "src/components/ui/skeleton.tsx": "Skeleton loading component"
    - "src/components/forms/WalletSetupForm.tsx": "Wallet setup form with React Hook Form + Zod"
    - "src/app/setup/page.tsx": "Setup page rendering WalletSetupForm"
    - "src/app/api/wallets/create/route.ts": "POST endpoint to save wallet records"
    - "src/app/api/wallets/balances/route.ts": "GET endpoint to fetch SOL + USD balances"
    - "src/app/api/wallets/user/route.ts": "GET endpoint to fetch user wallets"
    - "src/app/dashboard/page.tsx": "Dashboard with balance cards"
    - "src/middleware.ts": "Route protection middleware"
    - "src/app/api/auth/signout/route.ts": "POST endpoint to clear auth cookies"
  modified:
    - "src/app/api/auth/verify/route.ts": "Set pisp-auth cookie on successful auth"
    - "src/app/page.tsx": "Call signout API on disconnect"
    - "package.json": "Added @radix-ui/react-label, @supabase/ssr"

key-decisions:
  - "Cookie-based auth detection for middleware (simpler than Supabase SSR session)"
  - "CoinGecko public API for SOL/USD price (no auth required, 60s cache)"
  - "Batch balance fetching with Promise.allSettled (graceful partial failures)"
  - "Zero balance fallback on Helius API errors (avoid blocking dashboard)"
  - "Separate /api/wallets/user endpoint (client can't access supabaseAdmin)"
  - "Checkbox confirmation for trading wallet (explicit user acknowledgment)"
  - "Info tooltip on vault wallet field (educate users on vault concept)"

patterns-established:
  - "Pattern 1: Cookie-based auth state for middleware route protection"
  - "Pattern 2: Batch API requests with Promise.allSettled for resilience"
  - "Pattern 3: Client API → Server API → Supabase pattern (no direct client DB access)"
  - "Pattern 4: Inline validation errors with React Hook Form + Zod"

requirements-completed: [SETUP-01, SETUP-02, SETUP-03, SETUP-04, AUTH-03]

# Metrics
duration: 9min
completed: 2026-02-20
---

# Phase 01 Plan 02: Wallet Setup & Dashboard Summary

**Complete wallet setup flow with address validation, Helius balance fetching, dashboard display, and cookie-based route protection middleware**

## Performance

- **Duration:** 9 min (573 seconds)
- **Started:** 2026-02-20T09:02:42Z
- **Completed:** 2026-02-20T09:12:15Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Wallet setup form with Zod + React Hook Form validation
- Solana address validation using @solana/addresses isAddress()
- Connected wallet pre-fills trading wallet with confirmation checkbox
- Vault wallet field with Info tooltip explaining concept
- Cross-field validation: trading ≠ vault addresses
- Wallet records saved to Supabase (trading + vault)
- Balance API fetching SOL via Helius + USD via CoinGecko
- Dashboard displaying two wallet balance cards with SOL and USD
- Loading skeletons during data fetch
- Route protection middleware based on auth + setup cookies
- Signout API to clear auth cookies
- Disconnect flow clears all state (cookies + localStorage + Supabase session)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wallet setup form with validation and API route** - `290cb34` (feat)
2. **Task 2: Create balance API and dashboard with wallet cards** - `63b2e32` (feat)
3. **Task 3: Create route protection middleware with cookie-based auth** - `3ac4590` (feat)

## Files Created/Modified
- `src/components/ui/label.tsx` - Label component (shadcn/ui)
- `src/components/ui/skeleton.tsx` - Skeleton loading component
- `src/components/forms/WalletSetupForm.tsx` - Wallet setup form with validation
- `src/app/setup/page.tsx` - Setup page with form
- `src/app/api/wallets/create/route.ts` - POST /api/wallets/create (save wallet records)
- `src/app/api/wallets/balances/route.ts` - GET /api/wallets/balances (fetch SOL + USD balances)
- `src/app/api/wallets/user/route.ts` - GET /api/wallets/user (fetch user wallets)
- `src/app/dashboard/page.tsx` - Dashboard with balance cards
- `src/middleware.ts` - Route protection middleware
- `src/app/api/auth/signout/route.ts` - POST /api/auth/signout (clear cookies)
- `src/app/api/auth/verify/route.ts` - Updated to set pisp-auth cookie
- `src/app/page.tsx` - Updated disconnect to clear cookies
- `package.json` - Added @radix-ui/react-label, @supabase/ssr

## Decisions Made

1. **Cookie-based auth for middleware** - Simpler than Supabase SSR session checking. Set `pisp-auth` cookie on auth verify, `pisp-setup-complete` on wallet creation. Middleware checks both for routing decisions.

2. **CoinGecko API for SOL/USD price** - Public API (no auth), cached for 60s. Fallback to $150 if API fails (prevents dashboard blocking).

3. **Batch balance fetching with Promise.allSettled** - Fetch multiple wallet balances in one request. Graceful partial failures (0 balance fallback).

4. **Separate /api/wallets/user endpoint** - Client components can't use supabaseAdmin. Created API route to fetch user wallets server-side.

5. **Checkbox confirmation for trading wallet** - User must explicitly confirm pre-filled trading wallet (prevents accidental submission).

6. **Info tooltip on vault wallet** - Educate users on vault concept inline (hover tooltip with explanation).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created Label component**
- **Found during:** Task 1 (WalletSetupForm creation)
- **Issue:** Label component referenced in plan but missing from src/components/ui/
- **Fix:** Created Label component using @radix-ui/react-label (shadcn/ui pattern)
- **Files created:** src/components/ui/label.tsx
- **Dependencies installed:** @radix-ui/react-label
- **Verification:** pnpm typecheck passes, pnpm build succeeds
- **Committed in:** 290cb34 (Task 1 commit)

**2. [Rule 3 - Blocking] Created Skeleton component**
- **Found during:** Task 2 (Dashboard creation)
- **Issue:** Plan references Skeleton components for loading states but component missing
- **Fix:** Created Skeleton component (simple animated div)
- **Files created:** src/components/ui/skeleton.tsx
- **Verification:** pnpm typecheck passes, pnpm build succeeds
- **Committed in:** 63b2e32 (Task 2 commit)

**3. [Rule 2 - Missing functionality] Created /api/wallets/user endpoint**
- **Found during:** Task 2 (Dashboard page)
- **Issue:** Dashboard needs user wallets but can't access supabaseAdmin from client component
- **Fix:** Created server-side API route to fetch user wallets by connected address
- **Files created:** src/app/api/wallets/user/route.ts
- **Rationale:** Pattern consistency - all Supabase queries go through server API routes
- **Verification:** Dashboard successfully fetches and displays wallets
- **Committed in:** 63b2e32 (Task 2 commit)

**4. [Rule 2 - Missing functionality] Created /api/auth/signout endpoint**
- **Found during:** Task 3 (Middleware + disconnect flow)
- **Issue:** Middleware uses cookies but no API to clear them on disconnect
- **Fix:** Created POST /api/auth/signout to delete pisp-auth and pisp-setup-complete cookies
- **Files created:** src/app/api/auth/signout/route.ts
- **Files modified:** src/app/page.tsx, src/app/dashboard/page.tsx (call signout on disconnect)
- **Rationale:** Complete auth lifecycle - set cookies on auth, clear on signout
- **Verification:** Disconnect clears cookies, middleware redirects correctly
- **Committed in:** 3ac4590 (Task 3 commit)

**5. [Rule 1 - Bug] Fixed TypeScript branded type error in WalletSetupForm**
- **Found during:** Task 1 (typecheck)
- **Issue:** isAddress() returns branded type (Address), incompatible with Zod string schema inference
- **Fix:** Wrapped isAddress in try-catch refine function, defined explicit WalletSetupFormData type
- **Files modified:** src/components/forms/WalletSetupForm.tsx
- **Verification:** pnpm typecheck passes
- **Committed in:** 290cb34 (Task 1 commit)

**6. [Rule 1 - Bug] Fixed TypeScript error in /api/wallets/user route**
- **Found during:** Task 2 (typecheck)
- **Issue:** Supabase query result typed as `never` due to conditional supabaseAdmin typing
- **Fix:** Type assertion on query result (`as Array<{ user_id: string }> | null`)
- **Files modified:** src/app/api/wallets/user/route.ts
- **Verification:** pnpm typecheck passes
- **Committed in:** 63b2e32 (Task 2 commit)

---

**Total deviations:** 6 auto-fixed (2 bugs, 2 missing functionality, 2 blocking)
**Impact on plan:** All auto-fixes were necessary for compilation and correct functionality. No scope creep - all additions directly support plan requirements.

## Issues Encountered

**Next.js 16 middleware deprecation warning** - Build shows warning about "middleware" → "proxy" convention. This is a Next.js 16 deprecation notice but doesn't affect functionality. Middleware works correctly. Consider renaming to proxy.ts in future Next.js versions.

**Helius balance API structure** - Plan suggested using Helius Wallet API for balance + USD. Helius provides SOL balance only via RPC `getBalance`. Used CoinGecko for SOL/USD price conversion (public API, simple, cached).

## User Setup Required

**Manual testing steps:**
1. Complete Plan 01 auth flow (connect wallet, sign message)
2. Should redirect to /setup page
3. Fill out wallet setup form:
   - Trading wallet: pre-filled with connected address
   - Check confirmation checkbox
   - Vault wallet: enter different Solana address
4. Submit form → redirected to /dashboard
5. Dashboard shows two balance cards (trading + vault) with SOL and USD amounts
6. Refresh page → middleware ensures authenticated + setup user stays on /dashboard
7. Try accessing /setup while on dashboard → middleware redirects back to /dashboard
8. Disconnect → clears cookies and localStorage, redirects to landing page
9. Try accessing /dashboard without auth → middleware redirects to landing page

**Environment variables required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `HELIUS_API_KEY` - Helius API key for balance fetching

## Next Phase Readiness

**Phase 1 complete! Ready for Phase 2 (Trade Tracking & Sync):**
- User can authenticate with wallet signature
- User can set up trading + vault wallets
- Dashboard displays current balances (SOL + USD)
- Route protection enforces correct flow (auth → setup → dashboard)
- Session management with 7-day TTL
- Clean disconnect flow

**Ready to build:**
- Trade history fetching via Helius
- Trade parsing and aggregation logic
- Cashout calculation based on tier + ROI
- Trade confirmation UI
- Wallet sync functionality

**No blockers.** Foundation and authentication phase complete. All requirements (AUTH-01, AUTH-02, AUTH-03, AUTH-04, SETUP-01, SETUP-02, SETUP-03, SETUP-04) satisfied.

---
*Phase: 01-foundation-authentication*
*Completed: 2026-02-20*

## Self-Check: PASSED

All created files verified:
- ✓ src/components/ui/label.tsx
- ✓ src/components/ui/skeleton.tsx
- ✓ src/components/forms/WalletSetupForm.tsx
- ✓ src/app/setup/page.tsx
- ✓ src/app/api/wallets/create/route.ts
- ✓ src/app/api/wallets/balances/route.ts
- ✓ src/app/api/wallets/user/route.ts
- ✓ src/app/dashboard/page.tsx
- ✓ src/middleware.ts
- ✓ src/app/api/auth/signout/route.ts

All task commits verified:
- ✓ 290cb34 (Task 1)
- ✓ 63b2e32 (Task 2)
- ✓ 3ac4590 (Task 3)
