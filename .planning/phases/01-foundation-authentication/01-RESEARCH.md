# Phase 1: Foundation & Authentication - Research

**Researched:** 2026-02-20
**Domain:** Solana wallet authentication, Next.js App Router, Supabase integration
**Confidence:** HIGH

## Summary

Phase 1 establishes user authentication via Solana wallet connection (Phantom, Solflare, Backpack) and wallet setup flow in a Next.js 16 App Router application. The standard stack centers on @solana/wallet-adapter-react for wallet connectivity, Supabase for session persistence and user data storage, and Zustand for client-side state management. The architecture leverages server components where possible, client components for wallet interactions, and middleware for route protection. Key pitfalls include hydration errors from improper client/server component boundaries and RLS policy misconfiguration in Supabase.

This phase builds on existing infrastructure: Supabase schema already defined (users, wallets tables), UI components from shadcn/ui installed, and environment variables configured for Helius and Supabase.

**Primary recommendation:** Use @solana/wallet-adapter-react with dynamic imports to avoid hydration errors, implement Supabase RLS policies for secure data access, and leverage Zustand persist middleware for wallet state across sessions. Validate all Solana addresses with @solana/addresses before database persistence.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Landing & connect flow:**
- Brief value prop on landing page: logo, 1-2 sentences explaining profit-taking discipline, then connect button
- Degen-friendly tone — crypto-native language, casual ("Stop giving back your gains" vibes)
- Single "Connect Wallet" button that opens adapter modal showing all detected wallets (Phantom, Solflare, Backpack)
- User signs a verification message on every connect for security

**Wallet setup experience:**
- Claude's discretion on single page vs stepped wizard — pick what works best for the inputs
- Connected wallet auto-fills as trading wallet, but requires explicit confirmation before saving
- Inline tooltip (info icon) next to vault wallet input explaining the concept
- Invalid Solana address: inline error message under the field, blocks save until fixed
- Trading wallet and vault wallet must be validated as different addresses

**Post-setup landing:**
- Dashboard shows balances only — trading wallet + vault wallet (SOL & USD). Minimal, clean
- No success fanfare after setup — just redirect straight to dashboard
- User can edit wallet addresses later from a settings page (not inline on dashboard)

**Session & reconnect:**
- Auto-reconnect on return visits with brief toast: "Reconnected as 0xABC..."
- 7-day session TTL before requiring re-authentication (re-sign message)
- Switching wallets connects a different address but keeps the same account/data
- Claude's discretion on handling locked/unavailable wallet extension on return

### Claude's Discretion

- Balance display layout (cards, summary, etc.)
- Single page vs wizard for setup flow
- Disconnected wallet state handling (landing page vs read-only dashboard)
- Loading states and error handling patterns
- Exact spacing, typography, and visual details

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can connect Solana wallet (Phantom, Solflare, Backpack) to authenticate | @solana/wallet-adapter-react with WalletAdapterNetwork and wallet imports for Phantom, Solflare, Backpack. Dynamic import pattern to avoid hydration. |
| AUTH-02 | User session persists across page refresh via wallet connection state | Zustand persist middleware with localStorage storage + Supabase session cookies (persistSession: true). Auto-reconnect via useEffect on mount. |
| AUTH-03 | User is redirected to appropriate page based on auth + setup status (landing → setup → dashboard) | Next.js middleware checking Supabase session + database query for wallet setup completion. Conditional redirects based on state. |
| AUTH-04 | User can disconnect wallet and return to landing page | wallet.disconnect() from useWallet hook + Supabase signOut() + Zustand state reset. Clear all persisted state on disconnect. |
| SETUP-01 | User can input trading wallet address (validated Solana address) | React Hook Form + Zod schema with custom validator using @solana/addresses isAddress() function. Real-time validation with inline error display. |
| SETUP-02 | User can input vault wallet address (validated, must differ from trading wallet) | Zod custom refine validator comparing trading and vault addresses. Both must pass isAddress() and inequality check. |
| SETUP-03 | System fetches initial balances from Helius after wallet setup | Helius Wallet API GET /v1/wallet/{address}/balances endpoint. Parallel requests for both trading and vault wallets. Parse SOL balance from response. |
| SETUP-04 | User is redirected to dashboard after completing setup | Server action or API route to insert wallet records, then router.push('/dashboard') on success. No intermediate confirmation page. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @solana/wallet-adapter-react | ^0.15.x | Solana wallet connection hooks (useWallet, useConnection) | Official Solana wallet adapter, supports Phantom/Solflare/Backpack, widely adopted in Solana ecosystem |
| @solana/wallet-adapter-react-ui | ^0.9.x | Pre-built wallet connect button and modal UI | Pairs with wallet-adapter-react, handles wallet selection UI automatically |
| @solana/wallet-adapter-wallets | ^0.19.x | Wallet adapters for Phantom, Solflare, Backpack | Concrete wallet implementations, required for multi-wallet support |
| @solana/web3.js | ^1.x | Solana blockchain interaction (Connection, PublicKey) | Core Solana JavaScript SDK, needed for connection setup |
| @solana/addresses | ^2.x | Address validation (isAddress, address) | Type-safe Solana address validation, part of new modular SDK |
| @supabase/supabase-js | ^2.91.0 | Database client, authentication session management | Already installed, handles auth session persistence and database queries |
| zustand | ^5.0.10 | Client-side state management | Already installed, lightweight alternative to Redux, 13KB, perfect for wallet state |
| react-hook-form | ^7.71.1 | Form state management | Already installed, minimal re-renders, excellent DX with TypeScript |
| zod | ^4.3.5 | Runtime schema validation | Already installed, pairs with react-hook-form via @hookform/resolvers |
| next | 16.1.4 | Web framework (App Router, middleware, server actions) | Already installed, latest stable version |
| bs58 | ^6.x | Base58 encoding for message signing | Industry standard for encoding Solana signatures, used in auth flow |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tweetnacl | ^1.x | Signature verification | Optional server-side signature verification (if implementing custom verify logic) |
| sonner | ^2.0.7 | Toast notifications | Already installed, for "Reconnected as 0xABC..." notifications |
| lucide-react | ^0.562.0 | Icon library | Already installed, for info tooltips, wallet icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @solana/wallet-adapter-react | @solana/react-hooks (new SDK) | New SDK approach with @solana/client, but wallet-adapter has better wallet support and is more mature for production use in 2026 |
| Zustand | React Context | Context requires more boilerplate and can cause unnecessary re-renders; Zustand is simpler and more performant |
| Supabase Auth | NextAuth.js | NextAuth requires more configuration for custom auth flows; Supabase provides built-in session management with database integration |

**Installation:**
```bash
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/web3.js @solana/addresses bs58
```

Note: @supabase/supabase-js, zustand, react-hook-form, zod, sonner, lucide-react already installed per package.json.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── page.tsx                    # Landing page with wallet connect
│   ├── setup/
│   │   └── page.tsx                # Wallet setup flow (trading + vault)
│   ├── dashboard/
│   │   └── page.tsx                # Post-setup dashboard with balances
│   ├── api/
│   │   └── wallets/
│   │       ├── create/route.ts     # Create wallet records (API route)
│   │       └── balances/route.ts   # Fetch balances from Helius
│   ├── layout.tsx                  # Root layout with providers
│   └── middleware.ts               # Auth + setup check, route protection
├── components/
│   ├── providers/
│   │   ├── WalletProvider.tsx      # Solana wallet adapter context
│   │   └── SupabaseProvider.tsx    # Supabase auth provider (if needed)
│   ├── wallet/
│   │   ├── WalletConnectButton.tsx # Custom wallet connect UI
│   │   └── WalletInfo.tsx          # Display connected wallet address
│   ├── forms/
│   │   └── WalletSetupForm.tsx     # Trading + vault wallet input form
│   └── ui/                         # shadcn/ui components (already exists)
├── lib/
│   ├── supabase.ts                 # Supabase client (already exists)
│   ├── helius-client.ts            # Helius API wrapper (already exists)
│   └── stores/
│       └── walletStore.ts          # Zustand store for wallet state
├── types/
│   ├── database.ts                 # Supabase types (already exists)
│   └── wallet.ts                   # Wallet-related types
└── middleware.ts                   # Route protection (Next.js 16)
```

### Pattern 1: Wallet Provider Setup with Dynamic Import

**What:** Wrap application in Solana WalletProvider to enable wallet hooks, but use dynamic import to prevent SSR hydration errors.

**When to use:** Always for wallet-adapter components in Next.js App Router.

**Example:**
```typescript
// src/components/providers/WalletProvider.tsx
'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import styles (required for modal)
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

// src/app/layout.tsx
import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR hydration errors
const WalletProvider = dynamic(
  () => import('@/components/providers/WalletProvider').then(mod => ({ default: mod.WalletProvider })),
  { ssr: false }
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
```

**Source:** [Solana wallet adapter Next.js guide](https://solana.com/docs/frontend/nextjs-solana), [GitHub issue #648](https://github.com/solana-labs/wallet-adapter/issues/648)

### Pattern 2: Message Signing for Authentication

**What:** Sign a verification message with wallet on connect, verify server-side, create Supabase session.

**When to use:** Every wallet connection to establish authenticated session.

**Example:**
```typescript
// Client-side signing
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

async function signInWithWallet() {
  const { publicKey, signMessage } = useWallet();

  if (!publicKey || !signMessage) throw new Error('Wallet not connected');

  const message = new TextEncoder().encode(
    `Sign in to Profit is Profit\n\nNonce: ${crypto.randomUUID()}\nTimestamp: ${Date.now()}`
  );

  const signature = await signMessage(message);
  const signatureBase58 = bs58.encode(signature);

  // Send to API route for verification
  const response = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: publicKey.toBase58(),
      message: Array.from(message),
      signature: signatureBase58,
    }),
  });

  if (!response.ok) throw new Error('Verification failed');

  return response.json();
}
```

**Source:** [QuickNode Solana wallet authentication guide](https://www.quicknode.com/guides/solana-development/dapps/how-to-authenticate-users-with-a-solana-wallet)

### Pattern 3: Zustand Persist for Wallet State

**What:** Persist connected wallet address and session state to localStorage, hydrate on mount.

**When to use:** Auto-reconnect functionality across page reloads.

**Example:**
```typescript
// src/lib/stores/walletStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WalletState {
  connectedAddress: string | null;
  isSetupComplete: boolean;
  lastConnectedAt: number | null;
  setConnectedAddress: (address: string | null) => void;
  setSetupComplete: (complete: boolean) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      connectedAddress: null,
      isSetupComplete: false,
      lastConnectedAt: null,
      setConnectedAddress: (address) =>
        set({ connectedAddress: address, lastConnectedAt: Date.now() }),
      setSetupComplete: (complete) =>
        set({ isSetupComplete: complete }),
      reset: () =>
        set({ connectedAddress: null, isSetupComplete: false, lastConnectedAt: null }),
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Source:** [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/middlewares/persist)

### Pattern 4: Solana Address Validation with Zod

**What:** Use @solana/addresses isAddress() in Zod schema for runtime validation.

**When to use:** All form inputs accepting Solana wallet addresses.

**Example:**
```typescript
import { z } from 'zod';
import { isAddress } from '@solana/addresses';

const walletSetupSchema = z.object({
  tradingWallet: z.string()
    .min(1, 'Trading wallet is required')
    .refine((val) => isAddress(val), {
      message: 'Invalid Solana address',
    }),
  vaultWallet: z.string()
    .min(1, 'Vault wallet is required')
    .refine((val) => isAddress(val), {
      message: 'Invalid Solana address',
    }),
}).refine((data) => data.tradingWallet !== data.vaultWallet, {
  message: 'Trading and vault wallets must be different',
  path: ['vaultWallet'],
});

type WalletSetupFormData = z.infer<typeof walletSetupSchema>;
```

**Source:** [@solana/addresses npm docs](https://www.npmjs.com/package/@solana/addresses), [React Hook Form Zod guide](https://www.contentful.com/blog/react-hook-form-validation-zod/)

### Pattern 5: Route Protection with Middleware

**What:** Use Next.js middleware to check Supabase session and wallet setup status, redirect unauthenticated users.

**When to use:** Protect /dashboard and /setup routes from unauthorized access.

**Example:**
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  const isAuthRoute = req.nextUrl.pathname.startsWith('/setup') ||
                      req.nextUrl.pathname.startsWith('/dashboard');

  // Redirect to landing if not authenticated
  if (isAuthRoute && !session) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Check setup completion for dashboard access
  if (req.nextUrl.pathname.startsWith('/dashboard') && session) {
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', session.user.id);

    if (!wallets || wallets.length < 2) {
      return NextResponse.redirect(new URL('/setup', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/setup/:path*', '/dashboard/:path*'],
};
```

**Source:** [WorkOS Next.js App Router auth guide](https://workos.com/blog/nextjs-app-router-authentication-guide-2026), [Auth.js protecting routes](https://authjs.dev/getting-started/session-management/protecting)

### Pattern 6: Helius Balance Fetching

**What:** Fetch wallet balances (SOL + USD) from Helius Wallet API after setup completion.

**When to use:** Initial wallet setup and dashboard balance display.

**Example:**
```typescript
// src/app/api/wallets/balances/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const response = await fetch(
    `https://api.helius.xyz/v1/wallet/${address}/balances?api-key=${process.env.HELIUS_API_KEY}`
  );

  if (!response.ok) {
    return NextResponse.json({ error: 'Helius API error' }, { status: 500 });
  }

  const data = await response.json();

  // Extract SOL balance (lamports to SOL conversion)
  const solBalance = data.nativeBalance / 1e9;

  // Get SOL price for USD calculation (simplified, use real price feed)
  const solPrice = 100; // Replace with actual price fetch
  const usdBalance = solBalance * solPrice;

  return NextResponse.json({
    sol: solBalance,
    usd: usdBalance,
  });
}
```

**Source:** [Helius Wallet API docs](https://www.helius.dev/docs/wallet-api/overview)

### Anti-Patterns to Avoid

- **Using wallet adapter in Server Components:** Wallet hooks (useWallet, useConnection) only work in Client Components marked with 'use client'. Always use dynamic import for WalletProvider.
- **Skipping signature verification:** Message signing without server-side verification is insecure. Always verify signatures in API routes before creating sessions.
- **Storing private keys:** Never request or store private keys. Use message signing for authentication, rely on wallet extensions for transaction signing.
- **Missing RLS policies:** Supabase tables without Row Level Security allow unrestricted access. Always enable RLS and create policies for authenticated users.
- **Client-side-only validation:** Address validation must happen server-side too. Zod schemas should be shared between client forms and API routes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wallet connection UI | Custom wallet detect + connect buttons | @solana/wallet-adapter-react-ui | Handles 15+ wallets, mobile wallet adapter, deep linking, standardized UX users expect |
| Address validation | Regex patterns for base58 | @solana/addresses isAddress() | Solana addresses have checksum validation, on-curve checks; regex is insufficient |
| Message signing flow | Custom nonce generation + verification | Standard SIWS (Sign In With Solana) pattern | Prevents replay attacks, includes timestamp/nonce, audited pattern |
| Session persistence | Manual localStorage + expiry logic | Supabase auth.persistSession + Zustand persist | Handles token refresh, secure cookie storage, automatic expiry |
| Form validation | Manual error state management | React Hook Form + Zod | Type-safe schemas, automatic error mapping, minimal re-renders |
| Toast notifications | Custom notification queue | sonner | Handles stacking, auto-dismiss, positioning, accessibility |

**Key insight:** Wallet adapter ecosystem is mature and battle-tested. Custom authentication flows introduce security vulnerabilities. Leverage existing libraries that handle edge cases (mobile wallets, hardware wallets, browser extension updates) that are difficult to test manually.

## Common Pitfalls

### Pitfall 1: Hydration Errors from Wallet Provider

**What goes wrong:** Next.js throws "Hydration failed because the initial UI does not match what was rendered on the server" when wallet adapter components render during SSR.

**Why it happens:** Wallet adapter hooks access browser APIs (window, localStorage) that don't exist during server-side rendering. The server renders with no wallet connected, but client may have cached wallet state.

**How to avoid:**
1. Use dynamic import with `{ ssr: false }` for WalletProvider in layout
2. Mark all components using useWallet as client components ('use client')
3. Defer wallet state hydration with useEffect check for window !== undefined

**Warning signs:**
- Console errors mentioning "Text content does not match"
- Wallet connect button showing different states on initial load vs after hydration
- useWallet hooks called in files without 'use client' directive

**Source:** [GitHub issue #648](https://github.com/solana-labs/wallet-adapter/issues/648), [Solana Next.js guide](https://solana.com/docs/frontend/nextjs-solana)

### Pitfall 2: Missing RLS Policies Causing Data Leaks

**What goes wrong:** After enabling Row Level Security on Supabase tables, no data is accessible (even to authenticated users) OR data from all users is accessible to anyone.

**Why it happens:** RLS with no policies = complete lockout. Policies that don't filter by user_id = data leak. Service role key bypasses RLS during development, hiding the issue until production.

**How to avoid:**
1. Enable RLS on all tables: `ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;`
2. Create user-scoped SELECT policy: `CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT USING (auth.uid() = user_id);`
3. Test with anon key, not service role key
4. Index columns used in policies: `CREATE INDEX idx_wallets_user_id ON wallets(user_id);`

**Warning signs:**
- Queries work in SQL editor but fail from client
- User can see other users' wallet addresses
- "New policy" button in Supabase dashboard shows 0 policies for table
- Slow queries on tables with many rows (missing index on user_id)

**Source:** [Supabase RLS complete guide](https://designrevision.com/blog/supabase-row-level-security), [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Pitfall 3: Auto-Reconnect Without Session Validation

**What goes wrong:** User opens app, sees "Reconnected as 0xABC..." toast, but session expired server-side. User clicks action, gets 401 Unauthorized error.

**Why it happens:** Zustand persists wallet address to localStorage, auto-reconnects wallet extension, but Supabase session cookie expired (7-day TTL). Client thinks user is authenticated, server disagrees.

**How to avoid:**
1. Check Supabase session validity on mount, not just localStorage
2. If session expired, trigger wallet.disconnect() and clear Zustand state
3. Show "Session expired, please reconnect" toast instead of auto-reconnect
4. Implement session refresh before 7-day expiry (Supabase handles this automatically if persistSession: true)

**Warning signs:**
- User sees wallet address in UI but API calls return 401
- "Reconnected" toast appears, then immediate "Please sign in" error
- Session works fine within same day, breaks after 7 days

**Example fix:**
```typescript
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const storedAddress = useWalletStore.getState().connectedAddress;

    if (!session && storedAddress) {
      // Stored wallet but no valid session - clear state
      wallet.disconnect();
      useWalletStore.reset();
      toast.error('Session expired, please reconnect');
    }
  };

  checkSession();
}, []);
```

### Pitfall 4: Not Handling Wallet Switch Mid-Session

**What goes wrong:** User connects with Wallet A, sets up trading/vault addresses, switches to Wallet B in browser extension, app shows stale data from Wallet A.

**Why it happens:** useWallet provides wallet.publicKey, but app caches user data in Zustand/Supabase based on initial connection. No listener for wallet change events.

**How to avoid:**
1. Listen to wallet.publicKey changes with useEffect
2. If publicKey changes and differs from stored address, trigger re-auth flow
3. Show "Wallet switched, please sign in again" message
4. Don't automatically switch user accounts - require explicit re-authentication

**Warning signs:**
- User switches wallet in Phantom, app still shows old address
- Dashboard displays balances for wrong wallet
- User connects Wallet B but sees Wallet A's trade history

**Example fix:**
```typescript
useEffect(() => {
  if (wallet.publicKey) {
    const currentAddress = wallet.publicKey.toBase58();
    const storedAddress = useWalletStore.getState().connectedAddress;

    if (storedAddress && currentAddress !== storedAddress) {
      toast.error('Wallet switched, please sign in again');
      wallet.disconnect();
      useWalletStore.reset();
    }
  }
}, [wallet.publicKey]);
```

### Pitfall 5: Parallel Balance Fetches Without Error Boundaries

**What goes wrong:** Setup form fetches balances for both trading and vault wallets. One request fails (invalid address, API timeout), entire setup breaks with cryptic error.

**Why it happens:** Promise.all([fetchTradingBalance, fetchVaultBalance]) rejects if either promise rejects. No error boundary to catch and display which wallet failed.

**How to avoid:**
1. Use Promise.allSettled instead of Promise.all for parallel requests
2. Check each result's status before accessing value
3. Display specific error messages: "Failed to fetch trading wallet balance" vs "Failed to fetch vault wallet balance"
4. Allow partial success: show balances for successful fetches, "N/A" for failures

**Warning signs:**
- "Network error" with no indication which wallet failed
- Both balance displays show errors even if one API call succeeded
- Retry button refetches both wallets when only one failed

**Example fix:**
```typescript
const results = await Promise.allSettled([
  fetchBalance(tradingWallet),
  fetchBalance(vaultWallet),
]);

const tradingBalance = results[0].status === 'fulfilled'
  ? results[0].value
  : null;
const vaultBalance = results[1].status === 'fulfilled'
  ? results[1].value
  : null;

if (!tradingBalance) {
  toast.error('Failed to fetch trading wallet balance');
}
if (!vaultBalance) {
  toast.error('Failed to fetch vault wallet balance');
}
```

## Code Examples

Verified patterns from official sources:

### Wallet Connect with Auto-Reconnect
```typescript
// src/components/wallet/WalletConnectButton.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';
import { useWalletStore } from '@/lib/stores/walletStore';
import { toast } from 'sonner';

export function WalletConnectButton() {
  const { publicKey, connected } = useWallet();
  const { setConnectedAddress, connectedAddress } = useWalletStore();

  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();

      // Check if this is a reconnect
      if (connectedAddress && connectedAddress === address) {
        toast.success(`Reconnected as ${address.slice(0, 4)}...${address.slice(-4)}`);
      }

      setConnectedAddress(address);
    } else if (!connected && connectedAddress) {
      setConnectedAddress(null);
    }
  }, [connected, publicKey, connectedAddress, setConnectedAddress]);

  return <WalletMultiButton />;
}
```

**Source:** [Solana wallet adapter React guide](https://solana.com/developers/cookbook/wallets/connect-wallet-react)

### Form with Inline Validation
```typescript
// src/components/forms/WalletSetupForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAddress } from '@solana/addresses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';

const schema = z.object({
  tradingWallet: z.string()
    .min(1, 'Required')
    .refine(isAddress, 'Invalid Solana address'),
  vaultWallet: z.string()
    .min(1, 'Required')
    .refine(isAddress, 'Invalid Solana address'),
}).refine((data) => data.tradingWallet !== data.vaultWallet, {
  message: 'Must differ from trading wallet',
  path: ['vaultWallet'],
});

type FormData = z.infer<typeof schema>;

export function WalletSetupForm({ connectedAddress }: { connectedAddress: string }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tradingWallet: connectedAddress,
      vaultWallet: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    // Call API to create wallet records
    const response = await fetch('/api/wallets/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to save wallets');

    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="tradingWallet">Trading Wallet</label>
        <Input {...register('tradingWallet')} id="tradingWallet" />
        {errors.tradingWallet && (
          <p className="text-sm text-red-500">{errors.tradingWallet.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label htmlFor="vaultWallet">Vault Wallet</label>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input {...register('vaultWallet')} id="vaultWallet" />
        {errors.vaultWallet && (
          <p className="text-sm text-red-500">{errors.vaultWallet.message}</p>
        )}
      </div>

      <Button type="submit">Complete Setup</Button>
    </form>
  );
}
```

**Source:** [React Hook Form docs](https://react-hook-form.com/docs/useform), [shadcn/ui forms](https://ui.shadcn.com/docs/forms/react-hook-form)

### Supabase RLS Policy Setup
```sql
-- Enable RLS on wallets table
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own wallets
CREATE POLICY "Users can view own wallets"
ON wallets
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own wallets
CREATE POLICY "Users can insert own wallets"
ON wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own wallets
CREATE POLICY "Users can update own wallets"
ON wallets
FOR UPDATE
USING (auth.uid() = user_id);

-- Index for performance (RLS policies filter by user_id)
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
```

**Source:** [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @solana/web3.js 1.x PublicKey class | @solana/addresses with isAddress() type guard | Nov 2024 (Web3.js 2.0) | Type-safe addresses, tree-shakable, zero deps, faster validation |
| Individual @radix-ui/react-* packages | Unified radix-ui package | Feb 2026 | Cleaner package.json, single dependency for all Radix primitives |
| NextAuth.js for Web3 auth | Supabase signInWithWeb3 | 2024-2025 | Built-in wallet auth, no extra config for JWT handling |
| localStorage manual TTL checks | Zustand persist with onRehydrateStorage | Zustand 4.x+ | Automatic hydration, type-safe, less boilerplate |
| Next.js middleware.ts | Next.js proxy.ts (v16+) | Next.js 16 | Same code, filename change only |

**Deprecated/outdated:**
- @solana/wallet-adapter-base WalletError enums: Use instanceof checks for error handling
- Solana devnet for mainnet apps: Use mainnet-beta or custom RPC for production
- Auth.js beta versions: Use stable v5 for Next.js App Router

**Note:** As of Feb 2026, Next.js 16 uses `proxy.ts` instead of `middleware.ts`, but functionality remains identical. When implementing, use `middleware.ts` for clarity since most documentation still references this filename.

## Open Questions

1. **Wallet adapter mobile support on iOS**
   - What we know: Mobile Wallet Adapter 2.0 spec exists for Android, wallet-adapter-react supports mobile wallets via deep linking
   - What's unclear: iOS Safari handling of wallet deep links, whether Phantom/Solflare iOS apps support MWA protocol
   - Recommendation: Test on iOS Safari during implementation. If deep linking fails, provide manual connection instructions for mobile users. Consider progressive enhancement: full wallet adapter on desktop, QR code fallback on mobile.

2. **Helius API rate limits for balance fetching**
   - What we know: Helius Wallet API is in beta, free tier exists
   - What's unclear: Exact rate limits per tier, recommended caching strategy for balance queries
   - Recommendation: Cache balance responses in Supabase wallets table with last_synced_at timestamp. Refresh only when user explicitly triggers sync or on dashboard mount (max once per minute). Check Helius dashboard for quota usage during testing.

3. **Session TTL vs wallet auto-lock timing**
   - What we know: Supabase sessions expire after 7 days, wallet extensions auto-lock after 5-60 minutes (user configurable)
   - What's unclear: Best UX when wallet locks but session still valid
   - Recommendation: On any wallet interaction (signing, balance check), catch "User rejected" errors. If wallet locked, show "Please unlock your wallet" toast. Don't force re-authentication unless session actually expired.

4. **Ledger hardware wallet compatibility**
   - What we know: Supabase signInWithWeb3 has known issue with Ledger wallets on Solana (GitHub issue #2277)
   - What's unclear: Whether this is resolved in latest @supabase/supabase-js version, workaround availability
   - Recommendation: Check if user is using Ledger (wallet.adapter.name includes "Ledger"), show warning: "Ledger wallets may experience authentication issues. Please use software wallet for setup." Escalate as bug if users report issues during testing.

## Sources

### Primary (HIGH confidence)
- [@solana/wallet-adapter-react npm](https://www.npmjs.com/package/@solana/wallet-adapter-react) - Wallet adapter API reference
- [@solana/addresses npm](https://www.npmjs.com/package/@solana/addresses) - Address validation functions
- [Solana Next.js integration guide](https://solana.com/docs/frontend/nextjs-solana) - Official Next.js wallet setup
- [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - Row Level Security policies
- [Supabase Solana auth guide](https://solana.com/developers/guides/getstarted/supabase-auth-guide) - Wallet-based authentication
- [Zustand persist middleware](https://zustand.docs.pmnd.rs/middlewares/persist) - State persistence API
- [React Hook Form documentation](https://react-hook-form.com/docs/useform) - Form API reference
- [Helius Wallet API docs](https://www.helius.dev/docs/wallet-api/overview) - Balance endpoint specification

### Secondary (MEDIUM confidence)
- [WorkOS Next.js auth guide 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) - App Router auth patterns
- [QuickNode Solana wallet auth](https://www.quicknode.com/guides/solana-development/dapps/how-to-authenticate-users-with-a-solana-wallet) - Message signing implementation
- [shadcn/ui forms guide](https://ui.shadcn.com/docs/forms/react-hook-form) - Form component patterns
- [Sonner toast best practices](https://medium.com/@rivainasution/shadcn-ui-react-series-part-19-sonner-modern-toast-notifications-done-right-903757c5681f) - Toast notification UX
- [Next.js Vitest testing](https://nextjs.org/docs/app/guides/testing/vitest) - Component testing setup

### Tertiary (LOW confidence)
- [GitHub wallet-adapter issue #648](https://github.com/solana-labs/wallet-adapter/issues/648) - Hydration error discussions
- [Supabase auth issue #2277](https://github.com/supabase/auth/issues/2277) - Ledger wallet compatibility
- [Tailwind CSS dark mode](https://tailwindcss.com/docs/dark-mode) - Dark mode implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in npm, official Solana/Supabase documentation
- Architecture: HIGH - Patterns sourced from official Next.js, Solana, and Supabase guides
- Pitfalls: MEDIUM-HIGH - Based on GitHub issues and community discussions, verified where possible with official docs

**Research date:** 2026-02-20
**Valid until:** 2026-04-20 (60 days - stable ecosystem, Next.js 16 just released, wallet adapter mature)

**Note:** Solana Web3.js 2.0 released Nov 2024 but wallet-adapter still uses 1.x. Migration to 2.0 SDK may happen in Q2 2026. Monitor @solana/wallet-adapter-react releases for 2.0 compatibility.
