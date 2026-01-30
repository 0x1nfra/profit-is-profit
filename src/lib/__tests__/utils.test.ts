import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn utility', () => {
  it('merges simple class strings', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('merges multiple class strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('handles conditional classes with objects', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active')
  })

  it('handles arrays of classes', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
  })

  it('handles nested arrays', () => {
    expect(cn(['a', ['b', 'c']])).toBe('a b c')
  })

  it('removes falsy values', () => {
    expect(cn('a', false, 'b', null, 'c', undefined)).toBe('a b c')
  })

  it('merges Tailwind classes correctly (tailwind-merge)', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles complex conditional scenarios', () => {
    const isActive = true
    const isDisabled = false

    const result = cn(
      'base-button',
      {
        'button-active': isActive,
        'button-disabled': isDisabled,
      },
      'button-primary'
    )

    expect(result).toBe('base-button button-active button-primary')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })

  it('handles only falsy values', () => {
    expect(cn(false, null, undefined)).toBe('')
  })

  it('merges conflicting Tailwind utilities (later wins)', () => {
    expect(cn('px-2 py-1', 'px-4 py-2')).toBe('px-4 py-2')
    expect(cn('m-4', 'm-2')).toBe('m-2')
  })

  it('preserves non-conflicting classes', () => {
    expect(cn('p-4 bg-red-500', 'text-white')).toBe('p-4 bg-red-500 text-white')
  })

  it('handles real-world component styling scenario', () => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md'
    const sizeClasses = 'h-10 px-4 py-2'
    const variantClasses = 'bg-blue-600 text-white hover:bg-blue-700'
    const stateClasses = { 'opacity-50 cursor-not-allowed': false }

    const result = cn(baseClasses, sizeClasses, variantClasses, stateClasses)

    expect(result).toContain('inline-flex')
    expect(result).toContain('bg-blue-600')
    expect(result).toContain('rounded-md')
    expect(result).not.toContain('opacity-50')
  })
})
