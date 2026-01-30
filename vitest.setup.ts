import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
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

// Extend Vitest's expect with jest-dom matchers
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toBeInTheDocument(): T
    toHaveClass(className: string): T
    toHaveTextContent(text: string): T
    toBeVisible(): T
    toBeDisabled(): T
    toBeEnabled(): T
    toHaveAttribute(attr: string, value?: string): T
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toHaveStyle(style: Record<string, any>): T
  }
}
