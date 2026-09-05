import { describe, expect, it } from 'vitest'
import { healthResultSchema } from '../../server/orpc/procedures/health'

describe('healthResultSchema', () => {
  it('accepts an unavailable database with empty ingest state', () => {
    const result = {
      ok: true as const,
      database: 'unavailable' as const,
      ingestSources: [],
      coverage: { dailyLatestDate: null, marketLatestLabel: null },
    }
    expect(healthResultSchema.parse(result)).toEqual(result)
  })

  it('accepts per-source ingest runs with coverage', () => {
    const result = {
      ok: true as const,
      database: 'connected' as const,
      ingestSources: [
        { source: 'sec', status: 'completed', finishedAt: '2026-09-01T00:00:00.000Z', rowCount: 120 },
        { source: 'the_numbers', status: 'completed', finishedAt: null, rowCount: null },
      ],
      coverage: { dailyLatestDate: '2026-08-30', marketLatestLabel: '2025' },
    }
    expect(healthResultSchema.parse(result)).toEqual(result)
  })
})
