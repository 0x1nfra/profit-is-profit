# AGENTS.md - Profit is Profit (PisP)

> This file provides essential guidance for AI coding agents working in this repository.

## Project Overview

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5 with strict mode
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style)
- **Package Manager**: pnpm (monorepo with workspace config)
- **Icons**: Lucide React

---

## Build/Lint Commands

```bash
# Development
pnpm dev                 # Start dev server on :3000

# Build & Production
pnpm build               # Production build
pnpm start               # Start production server

# Code Quality
pnpm lint                # Run ESLint on all files
pnpm lint --fix          # Run ESLint with auto-fix

# Testing
pnpm test                # Run all tests once
pnpm test:watch          # Run tests in watch mode
pnpm test:coverage       # Run tests with coverage report
pnpm typecheck           # Run TypeScript type checking
```

---

## Code Style Guidelines

### Imports

- **Order**: React → External libs → Internal (`@/` aliases) → Relative
- **Path Aliases**: Always use `@/` aliases for internal imports:
  - `@/components/*` - UI components
  - `@/lib/*` - Utilities and helpers
  - `@/hooks/*` - Custom hooks
  - `@/types/*` - TypeScript types

### TypeScript Conventions

- **Strict Mode**: Enabled in tsconfig.json - always use proper types
- **Types Location**: `src/types/index.ts` for shared types
- **Naming**: 
  - Interfaces: `PascalCase` (e.g., `Trade`, `Wallet`)
  - Enums: `PascalCase` (e.g., `Tier`, `WalletType`)
  - Type aliases: `PascalCase` with descriptive names
- **Function Props**: Use `React.ComponentProps<"element">` for HTML props

### Component Patterns

- **Style**: New York style from shadcn/ui
- **Structure**: Use function declarations for components
- **Variants**: Use `cva` (class-variance-authority) for component variants
- **Styling**: Use `cn()` utility from `@/lib/utils` for conditional classes
- **Props Spread**: Use `{...props}` pattern for forwarding props
- **Data Attributes**: Use `data-slot`, `data-variant`, `data-size` for styling hooks

### Naming Conventions

- **Components**: `PascalCase` (e.g., `Button.tsx`, `TradeCard.tsx`)
- **Hooks**: `camelCase` with `use` prefix (e.g., `useWallet.ts`)
- **Utils**: `camelCase` (e.g., `cn`, `formatCurrency`)
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants
- **Files**: `kebab-case.ts` or `PascalCase.tsx` depending on content

### Error Handling

- **Custom Errors**: Use custom error classes from `src/types/index.ts`:
  - `ApiError` - API errors with status codes
  - `ValidationError` - Form/validation errors
  - `HeliusError` - Blockchain API errors
- **Async Functions**: Always wrap in try/catch, return typed responses
- **Never expose**: Secrets, API keys, or sensitive data in error messages

### Styling (Tailwind CSS 4)

- **Custom Properties**: Use CSS variables from globals.css (e.g., `bg-background`)
- **Dark Mode**: Use `dark:` prefix or `dark` class wrapper
- **Typography**: Use font utilities (`font-sans`, `font-mono`)
- **Spacing**: Use Tailwind's spacing scale consistently
- **Custom Theme**: Define in `@theme inline` block in globals.css

### State Management

- **Zustand**: Available for global state (installed but not yet configured)
- **React Hook Form**: Use for form handling with Zod validation
- **Zod**: Use for schema validation and type inference

### Database/Supabase

- **Client**: Located at `src/lib/supabase.ts`
- **Types**: Define in `src/types/database.ts` for Supabase types
- **Environment**: Use `.env.local` for Supabase credentials

---

## File Structure

```
src/
├── app/              # Next.js App Router pages
├── components/
│   └── ui/           # shadcn/ui components
├── lib/              # Utilities and configs
├── types/            # TypeScript definitions
├── hooks/            # Custom React hooks
└── public/           # Static assets
```

---

## Environment Variables

Required variables (defined in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `HELIUS_API_KEY` (server-side only)

---

## AI Agent Checklist

Before completing any task:
- [ ] ESLint passes with `pnpm lint`
- [ ] Tests pass with `pnpm test`
- [ ] TypeScript type checking passes with `pnpm typecheck`
- [ ] No TypeScript errors
- [ ] Uses proper `@/` path aliases
- [ ] Follows existing component patterns
- [ ] No secrets or credentials exposed
- [ ] Error handling is appropriate
