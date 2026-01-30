import { describe, it, expect } from 'vitest'
import { ApiError, ValidationError, HeliusError } from '@/types'

describe('ApiError', () => {
  it('creates error with message only', () => {
    const error = new ApiError('Something went wrong')
    expect(error.message).toBe('Something went wrong')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBeUndefined()
    expect(error.name).toBe('ApiError')
  })

  it('creates error with message and status code', () => {
    const error = new ApiError('Not found', 404)
    expect(error.message).toBe('Not found')
    expect(error.statusCode).toBe(404)
    expect(error.code).toBeUndefined()
  })

  it('creates error with message, status code, and error code', () => {
    const error = new ApiError('Rate limited', 429, 'RATE_LIMIT_EXCEEDED')
    expect(error.message).toBe('Rate limited')
    expect(error.statusCode).toBe(429)
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('is instance of Error', () => {
    const error = new ApiError('Test')
    expect(error).toBeInstanceOf(Error)
  })

  it('can be thrown and caught', () => {
    expect(() => {
      throw new ApiError('Test error', 400)
    }).toThrow(ApiError)

    try {
      throw new ApiError('Catch me', 500, 'INTERNAL_ERROR')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).code).toBe('INTERNAL_ERROR')
    }
  })

  it('works with common HTTP status codes', () => {
    const errors = [
      { status: 400, message: 'Bad Request' },
      { status: 401, message: 'Unauthorized' },
      { status: 403, message: 'Forbidden' },
      { status: 404, message: 'Not Found' },
      { status: 422, message: 'Unprocessable Entity' },
      { status: 500, message: 'Internal Server Error' },
      { status: 502, message: 'Bad Gateway' },
      { status: 503, message: 'Service Unavailable' },
    ]

    errors.forEach(({ status, message }) => {
      const error = new ApiError(message, status)
      expect(error.statusCode).toBe(status)
      expect(error.message).toBe(message)
    })
  })
})

describe('ValidationError', () => {
  it('creates error with message only', () => {
    const error = new ValidationError('Invalid input')
    expect(error.message).toBe('Invalid input')
    expect(error.field).toBeUndefined()
    expect(error.name).toBe('ValidationError')
  })

  it('creates error with message and field', () => {
    const error = new ValidationError('Required field missing', 'email')
    expect(error.message).toBe('Required field missing')
    expect(error.field).toBe('email')
  })

  it('is instance of Error', () => {
    const error = new ValidationError('Test')
    expect(error).toBeInstanceOf(Error)
  })

  it('can be thrown and caught', () => {
    expect(() => {
      throw new ValidationError('Invalid tier', 'tier')
    }).toThrow(ValidationError)

    try {
      throw new ValidationError('Amount must be positive', 'amount')
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError)
      expect((e as ValidationError).field).toBe('amount')
    }
  })

  it('works with various field names', () => {
    const testCases = [
      { message: 'Invalid', field: 'netProfitSOL' },
      { message: 'Required', field: 'tier' },
      { message: 'Out of range', field: 'roiPercent' },
      { message: 'Invalid format', field: 'walletAddress' },
    ]

    testCases.forEach(({ message, field }) => {
      const error = new ValidationError(message, field)
      expect(error.message).toBe(message)
      expect(error.field).toBe(field)
    })
  })
})

describe('HeliusError', () => {
  it('creates error with message only', () => {
    const error = new HeliusError('Helius API failed')
    expect(error.message).toBe('Helius API failed')
    expect(error.statusCode).toBeUndefined()
    expect(error.name).toBe('HeliusError')
  })

  it('creates error with message and status code', () => {
    const error = new HeliusError('Rate limited', 429)
    expect(error.message).toBe('Rate limited')
    expect(error.statusCode).toBe(429)
  })

  it('is instance of Error', () => {
    const error = new HeliusError('Test')
    expect(error).toBeInstanceOf(Error)
  })

  it('can be thrown and caught', () => {
    expect(() => {
      throw new HeliusError('API down', 503)
    }).toThrow(HeliusError)

    try {
      throw new HeliusError('Timeout', 408)
    } catch (e) {
      expect(e).toBeInstanceOf(HeliusError)
      expect((e as HeliusError).statusCode).toBe(408)
    }
  })

  it('works with various Helius API error scenarios', () => {
    const scenarios = [
      { message: 'Invalid API key', status: 401 },
      { message: 'Rate limit exceeded', status: 429 },
      { message: 'Transaction not found', status: 404 },
      { message: 'Internal server error', status: 500 },
      { message: 'Service unavailable', status: 503 },
    ]

    scenarios.forEach(({ message, status }) => {
      const error = new HeliusError(message, status)
      expect(error.message).toBe(message)
      expect(error.statusCode).toBe(status)
    })
  })
})

describe('Error inheritance', () => {
  it('all custom errors inherit from Error', () => {
    const apiError = new ApiError('Test')
    const validationError = new ValidationError('Test')
    const heliusError = new HeliusError('Test')

    expect(apiError).toBeInstanceOf(Error)
    expect(validationError).toBeInstanceOf(Error)
    expect(heliusError).toBeInstanceOf(Error)
  })

  it('custom errors have correct names', () => {
    expect(new ApiError('Test').name).toBe('ApiError')
    expect(new ValidationError('Test').name).toBe('ValidationError')
    expect(new HeliusError('Test').name).toBe('HeliusError')
  })

  it('error messages are accessible', () => {
    const message = 'Custom error message'
    expect(new ApiError(message).message).toBe(message)
    expect(new ValidationError(message).message).toBe(message)
    expect(new HeliusError(message).message).toBe(message)
  })

  it('errors can be identified by name property', () => {
    const errors = [
      new ApiError('API', 500, 'CODE'),
      new ValidationError('Validation', 'field'),
      new HeliusError('Helius', 503),
    ]

    const names = errors.map(e => e.name)
    expect(names).toContain('ApiError')
    expect(names).toContain('ValidationError')
    expect(names).toContain('HeliusError')
  })
})

describe('Error handling patterns', () => {
  it('can distinguish error types in catch blocks', () => {
    function throwDifferentErrors() {
      throw new ValidationError('Invalid tier', 'tier')
    }

    try {
      throwDifferentErrors()
    } catch (error) {
      if (error instanceof ValidationError) {
        expect(error.field).toBe('tier')
      } else {
        throw new Error('Should have been ValidationError')
      }
    }
  })

  it('can extract error details for logging', () => {
    const apiError = new ApiError('Server error', 500, 'INTERNAL_ERROR')
    
    const logEntry = {
      name: apiError.name,
      message: apiError.message,
      statusCode: apiError.statusCode,
      code: apiError.code,
    }

    expect(logEntry).toEqual({
      name: 'ApiError',
      message: 'Server error',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    })
  })

  it('stack trace is preserved', () => {
    const error = new ValidationError('Test error', 'field')
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('ValidationError')
  })
})
