---
phase: 01-foundation-authentication
plan: 01
subsystem: auth
tags: [solana, wallet-adapter, zustand, tweetnacl, signature-verification, session-management]

# Dependency graph
requires:
  - phase: none
    provides: fresh Next.js app with Supabase client
provides:
  - Solana wallet connection (Phantom, Solflare) via wallet-adapter
  - Client-side wallet session store with 7-day TTL
  - Server-side Ed25519 signature verification
  - Auto-reconnect on page refresh with session validation
  - User creation/lookup in Supabase on successful auth
affects: [02-wallet-setup, 03-trade-tracking, all-authenticated-features]

# Tech tracking
tech-stack:
  added:
    - "@solana/wallet-adapter-react": "Wallet connection context"
    - "@solana/wallet-adapter-react-ui": "WalletMultiButton component"
    - "@solana/wallet-adapter-wallets": "Phantom, Solflare adapters"
    - "@solana/web3.js": "Solana SDK"
    - "@solana/addresses": "Address utilities"
    - "bs58": "Base58 encoding for signatures"
    - "tweetnacl": "Ed25519 signature verification"
    - "zustand": "State management"
  patterns:
    - "Client-side dynamic import for wallet provider (prevents SSR hydration errors)"
    - "Zustand persist middleware for localStorage session management"
    - "Message signing for wallet ownership proof (timestamp-based)"
    - "7-day session TTL with client-side expiry checks"

key-files:
  created:
    - "src/types/wallet.ts": "Auth types (AuthVerifyRequest/Response, WalletBalance)"
    - "src/components/providers/WalletProvider.tsx": "Solana wallet adapter context"
    - "src/components/providers/ClientWalletProvider.tsx": "Client wrapper for dynamic import"
    - "src/lib/stores/wallet-store.ts": "Zustand wallet session store with persistence"
    - "src/app/api/auth/verify/route.ts": "Signature verification and user lookup/creation"
  modified:
    - "src/app/layout.tsx": "Added WalletProvider wrapper, Toaster, metadata"
    - "src/app/page.tsx": "Landing page with connect flow and auto-reconnect logic"
    - "package.json": "Added wallet adapter and crypto dependencies"

key-decisions:
  - "Removed Backpack wallet adapter (not available in @solana/wallet-adapter-wallets package)"
  - "Used ClientWalletProvider wrapper pattern for Next.js 16 compatibility with dynamic imports"
  - "Timestamp-based verification messages (simple, no backend nonce storage required)"
  - "7-day session TTL stored client-side (matches typical web app session length)"
  - "Type assertion workaround for supabaseAdmin conditional typing issue"

patterns-established:
  - "Pattern 1: Wallet auth via message signing with timestamp"
  - "Pattern 2: Zustand persist for session state across refreshes"
  - "Pattern 3: Auto-reconnect on mount with session validity check"
  - "Pattern 4: Client-side dynamic import wrapper for SSR incompatible libraries"

requirements-completed: [AUTH-01, AUTH-02, AUTH-04]

# Metrics
duration: 9min
completed: 2026-02-20
---

# Phase 01 Plan 01: Foundation & Authentication Summary

**Solana wallet authentication with Phantom/Solflare adapters, Ed25519 signature verification, and 7-day session persistence via Zustand localStorage**

## Performance

- **Duration:** 9 min (525 seconds)
- **Started:** 2026-02-20T08:48:55Z
- **Completed:** 2026-02-20T08:57:40Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Wallet connection flow with Phantom and Solflare support via WalletMultiButton
- Ed25519 signature verification using tweetnacl with server-side user lookup/creation
- Client-side session store with 7-day TTL and localStorage persistence
- Auto-reconnect logic on page refresh with session expiry detection
- Clean disconnect flow with Supabase signOut and state reset

## Task Commits

Each task was committed atomically:

1. **Task 1: Install wallet adapter packages and create WalletProvider with dynamic import** - `847aa6f` (feat)
2. **Task 2: Create Zustand wallet store with persistence and auth verify API route** - `114d936` (feat)
3. **Task 3: Build landing page with connect flow, message signing, auto-reconnect, and disconnect** - `98f4f89` (feat)

## Files Created/Modified
- `src/types/wallet.ts` - Auth request/response types and wallet balance interface
- `src/components/providers/WalletProvider.tsx` - Solana wallet adapter context (ConnectionProvider, WalletProvider, WalletModalProvider)
- `src/components/providers/ClientWalletProvider.tsx` - Client-side wrapper for dynamic import (Next.js 16 SSR compatibility)
- `src/lib/stores/wallet-store.ts` - Zustand store with persist middleware (connectedAddress, sessionExpiry, 7-day TTL)
- `src/app/api/auth/verify/route.ts` - POST endpoint for Ed25519 signature verification and Supabase user creation
- `src/app/layout.tsx` - Added ClientWalletProvider, Toaster, updated metadata
- `src/app/page.tsx` - Landing page with wallet connect, message signing, auto-reconnect, disconnect
- `package.json` - Added wallet adapter packages, tweetnacl, bs58

## Decisions Made

1. **Removed Backpack wallet support** - BackpackWalletAdapter not exported by @solana/wallet-adapter-wallets package. Kept Phantom and Solflare only.

2. **ClientWalletProvider wrapper pattern** - Next.js 16 Turbopack doesn't allow `dynamic()` with `ssr: false` in server components. Created client-side wrapper component to handle dynamic import.

3. **Type assertion for supabaseAdmin** - Conditional typing in supabaseAdmin export causes TypeScript to infer `never` type. Used type assertion to work around this limitation.

4. **Timestamp-based verification messages** - Simpler than UUID or backend nonce storage. Message format: `Sign in to Profit is Profit\n\nTimestamp: ${Date.now()}`

5. **7-day session TTL** - Standard web app session length, stored client-side in Zustand with Date.now() + 7 days calculation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed Backpack wallet adapter**
- **Found during:** Task 1 (WalletProvider creation)
- **Issue:** BackpackWalletAdapter not exported by @solana/wallet-adapter-wallets package, causing TypeScript compilation error
- **Fix:** Removed BackpackWalletAdapter import and usage, kept only PhantomWalletAdapter and SolflareWalletAdapter
- **Files modified:** src/components/providers/WalletProvider.tsx
- **Verification:** pnpm typecheck passes, pnpm build succeeds
- **Committed in:** 847aa6f (Task 1 commit)

**2. [Rule 3 - Blocking] Created ClientWalletProvider wrapper for Next.js 16 compatibility**
- **Found during:** Task 1 (layout.tsx update)
- **Issue:** Next.js 16 Turbopack throws error when using `dynamic()` with `ssr: false` in server components: "`ssr: false` is not allowed with `next/dynamic` in Server Components"
- **Fix:** Created ClientWalletProvider.tsx as 'use client' component that wraps the dynamic import, imported into server component layout.tsx
- **Files modified:** src/components/providers/ClientWalletProvider.tsx (created), src/app/layout.tsx
- **Verification:** pnpm build succeeds, no hydration errors
- **Committed in:** 847aa6f (Task 1 commit)

**3. [Rule 3 - Blocking] Type assertion for supabaseAdmin queries**
- **Found during:** Task 2 (auth verify API route)
- **Issue:** supabaseAdmin typed as `SupabaseClient<Database> | (() => never)` due to conditional export, causing TypeScript to infer `never` for query results
- **Fix:** Added type assertion `const admin = supabaseAdmin as SupabaseClient<Database>` and used `as any` on insert query
- **Files modified:** src/app/api/auth/verify/route.ts
- **Verification:** pnpm typecheck passes, pnpm build succeeds
- **Committed in:** 114d936 (Task 2 commit)

**4. [Rule 1 - Bug] Installed missing @solana/wallet-adapter-base package**
- **Found during:** Task 1 (WalletProvider creation)
- **Issue:** WalletAdapterNetwork import failed, module '@solana/wallet-adapter-base' not found
- **Fix:** Ran `pnpm add @solana/wallet-adapter-base`
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** Import succeeds, typecheck passes
- **Committed in:** 847aa6f (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (1 bug, 3 blocking)
**Impact on plan:** All auto-fixes were necessary for compilation and Next.js 16 compatibility. Backpack wallet removal is minor - Phantom and Solflare cover majority of Solana users. No scope creep.

## Issues Encountered

**Next.js 16 Turbopack SSR restrictions** - Turbopack enforces stricter rules for `dynamic()` usage. Solution: Client wrapper component pattern works cleanly and will be reusable for other SSR-incompatible libraries.

**Supabase admin client typing** - Conditional export pattern in src/lib/supabase.ts creates union type that TypeScript can't properly narrow. Solution: Type assertions work at runtime since SUPABASE_SERVICE_ROLE_KEY will be present in production.

## User Setup Required

**Wallet extension installation required for testing.** Users need one of:
- Phantom wallet (Chrome extension or mobile)
- Solflare wallet (Chrome extension or mobile)

**Manual testing steps:**
1. Install wallet extension and create/import a wallet
2. Run `pnpm dev`
3. Navigate to `http://localhost:3000`
4. Click "Connect Wallet" button
5. Select wallet from modal (Phantom or Solflare)
6. Approve connection request in wallet extension
7. Sign verification message when prompted
8. Verify redirect to /setup page
9. Refresh page - should see auto-reconnect toast
10. Click "Disconnect Wallet" - should clear state and return to connect view

**Environment variables required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side user creation)

## Next Phase Readiness

**Ready for wallet setup flow (Plan 02):**
- User can connect wallet and sign authentication message
- Session persists across refreshes with 7-day TTL
- User record created in Supabase on first connection
- Clean disconnect flow resets all state

**Ready to build:**
- Trading wallet + vault wallet setup page (/setup)
- Dashboard page (/dashboard) with wallet balance display
- Wallet sync functionality via Helius API

**No blockers.** Foundation is solid, all auth requirements (AUTH-01, AUTH-02, AUTH-04) complete.

---
*Phase: 01-foundation-authentication*
*Completed: 2026-02-20*

## Self-Check: PASSED

All created files verified:
- ✓ src/types/wallet.ts
- ✓ src/components/providers/WalletProvider.tsx
- ✓ src/components/providers/ClientWalletProvider.tsx
- ✓ src/lib/stores/wallet-store.ts
- ✓ src/app/api/auth/verify/route.ts

All task commits verified:
- ✓ 847aa6f (Task 1)
- ✓ 114d936 (Task 2)
- ✓ 98f4f89 (Task 3)
