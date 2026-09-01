import { afterEach, describe, expect, it, vi } from 'vitest'
import { isRetryableError, withRetries } from '../../server/ingest/retry'

describe('isRetryableError', () => {
  it('retries Cloudflare service unavailable responses', () => {
    expect(isRetryableError(new Error('Service Unavailable'))).toBe(true)
    expect(isRetryableError(new Error('HTTP 503'))).toBe(true)
    expect(isRetryableError(new Error('D1 database is overloaded'))).toBe(true)
  })

  it('does not retry application failures', () => {
    expect(isRetryableError(new Error('Invalid ingest token'))).toBe(false)
    expect(isRetryableError(new Error('SEC request https://data.sec.gov/x failed with status 404'))).toBe(false)
    expect(isRetryableError('nope')).toBe(false)
  })
})

describe('withRetries', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries Service Unavailable and then returns', async () => {
    vi.useFakeTimers()
    let attempts = 0
    const pending = withRetries('ingest.upsertFacts', async () => {
      attempts += 1
      if (attempts < 3) {
        throw new Error('Service Unavailable')
      }
      return 12
    })

    const result = await vi.runAllTimersAsync().then(() => pending)
    expect(result).toBe(12)
    expect(attempts).toBe(3)
  })

  it('does not retry permanent errors', async () => {
    await expect(withRetries('ingest.startRun', async () => {
      throw new Error('Invalid ingest token')
    })).rejects.toThrow('Invalid ingest token')
  })
})
