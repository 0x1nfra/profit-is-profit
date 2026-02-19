# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**
- TypeScript 5.x - Used throughout source code for type safety and development
- JavaScript - Runtime in Node.js and browser environments
- SQL - Database queries via Supabase client

**Secondary:**
- JSX/TSX - React component definitions in `src/components/` and `src/app/`

## Runtime

**Environment:**
- Node.js (no specific version locked - see package.json for compatibility)
- Browser environments (React 19.2.3)

**Package Manager:**
- pnpm (see `pnpm-lock.yaml` 229KB lockfile present)
- Lockfile: `pnpm-lock.yaml` - committed and up-to-date

## Frameworks

**Core:**
- Next.js 16.1.4 - Full-stack React framework (app router in `src/app/`)
- React 19.2.3 - UI library

**UI & Components:**
- Radix UI (multiple packages) - Headless UI components
  - `@radix-ui/react-dialog` ^1.1.15
  - `@radix-ui/react-label` ^2.1.8
  - `@radix-ui/react-progress` ^1.1.8
  - `@radix-ui/react-slot` ^1.2.4
  - `@radix-ui/react-toast` ^1.2.15
- Tailwind CSS 4.x - Utility-first CSS framework (configured in `postcss.config.mjs`)
- Lucide React ^0.562.0 - Icon library
- Recharts ^3.6.0 - Charts and graphs library

**Forms & Validation:**
- React Hook Form ^7.71.1 - Lightweight form state management
- Zod ^4.3.5 - TypeScript-first schema validation
- `@hookform/resolvers` ^5.2.2 - Zod resolver for React Hook Form

**State Management:**
- Zustand ^5.0.10 - Lightweight state management library

**UI Utilities:**
- Sonner ^2.0.7 - Toast notifications
- clsx ^2.1.1 - Conditional className builder
- class-variance-authority ^0.7.1 - Type-safe CSS variant composition
- tailwind-merge ^3.4.0 - Merge Tailwind CSS classes safely

**Date/Time:**
- Day.js ^1.11.19 - Lightweight date manipulation

**HTTP Client:**
- Axios ^1.13.2 - HTTP client for API requests (minimal usage detected)

## Testing

**Framework:**
- Vitest ^4.0.18 - Unit test runner (see `vitest.config.ts`)
- React Testing Library ^16.3.2 - React component testing utilities
- `@testing-library/user-event` ^14.6.1 - User interaction simulation
- `@testing-library/jest-dom` ^6.9.1 - DOM matchers

**Mocking:**
- vitest-mock-extended ^3.1.0 - Extended mocking utilities
- jsdom ^27.4.0 - DOM implementation for testing

**Coverage:**
- `@vitest/coverage-v8` ^4.0.18 - V8 coverage provider

## Build & Dev Tools

**Transpilation:**
- Vite (@vitejs/plugin-react) ^5.1.2 - Build plugin for React in Vitest
- TypeScript compiler - Type checking (via `tsc --noEmit`)

**Linting:**
- ESLint 9.x - Code quality (see `eslint.config.mjs`)
- eslint-config-next 16.1.4 - Next.js recommended rules
- Includes Next.js core-web-vitals and TypeScript config

**CSS Processing:**
- `@tailwindcss/postcss` ^4 - Tailwind CSS via PostCSS
- PostCSS - CSS transformation (configured in `postcss.config.mjs`)

**Animations:**
- tw-animate-css ^1.4.0 - Additional Tailwind animation utilities

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.91.0 - Supabase client library
  - Used for database queries, authentication, and real-time subscriptions
  - Initialized in `src/lib/supabase.ts` and `src/lib/supabase-server.ts`
  - Why it matters: Core data persistence and user authentication

**Infrastructure:**
- Next.js 16.1.4 - Framework handles routing, API endpoints, and server-side rendering
- React 19.2.3 - UI rendering engine
- Tailwind CSS 4.x - All styling throughout the app

**Type Safety:**
- TypeScript 5.x - Compile-time type checking
- Zod ^4.3.5 - Runtime schema validation

## Configuration

**Environment:**
- Environment variables required:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (server-side only)
  - `HELIUS_API_KEY` - Helius blockchain API key (server-side only)
- See `.env.example` for template
- `.env` and `.env.local` files present but NOT committed (in `.gitignore`)

**TypeScript:**
- `tsconfig.json` - Strict mode enabled, target ES2017, module resolution: bundler
- Path alias: `@/*` → `./src/*`

**Build:**
- `next.config.ts` - Next.js configuration (minimal, no custom options)
- `components.json` - Shadcn/ui component configuration

**Testing:**
- `vitest.config.ts` - Vitest configuration
  - Environment: jsdom
  - Globals: true
  - Coverage providers: v8
  - Test patterns: `src/**/*.{test,spec}.{ts,tsx}`
  - Setup file: `vitest.setup.ts`

## Platform Requirements

**Development:**
- Node.js (version not specified in lock - should support ES2017 minimum)
- pnpm package manager
- TypeScript 5.x

**Production:**
- Node.js runtime environment (server-side)
- Modern browser support (React 19, ES2017)
- Deployment to Next.js-compatible platform (Vercel, self-hosted Node server, Docker)

---

*Stack analysis: 2026-02-20*
