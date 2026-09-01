import { describe, expect, it } from 'vitest'
import { upsertCompanyFacts } from '../../server/ingest/upsert'

function fact(index: number) {
  return {
    metric: 'revenue',
    concept: `us-gaap:Revenues:${index}`,
    unit: 'usd_cents',
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    value: index,
    fiscalYear: 2026,
    fiscalPeriod: 'Q1',
    form: '10-Q',
    filedDate: '2026-05-01',
    accession: '0001411579-26-000001',
  }
}

function createRecordingDatabase() {
  const valueBatches: Array<Array<{ concept: string }>> = []
  let batchCalls = 0

  const db = {
    insert: () => ({
      values: (rows: Array<{ concept: string }>) => {
        valueBatches.push(rows)
        return {
          onConflictDoUpdate: () => Promise.resolve(),
        }
      },
    }),
    batch: async () => {
      batchCalls += 1
    },
  }

  return { db, valueBatches, getBatchCalls: () => batchCalls }
}

describe('upsertCompanyFacts', () => {
  it('returns 0 without writing when there are no facts', async () => {
    const { db, valueBatches } = createRecordingDatabase()
    await expect(
      upsertCompanyFacts(db as never, 1, [], 'https://example.test', '2026-01-01T00:00:00Z'),
    ).resolves.toBe(0)
    expect(valueBatches).toEqual([])
  })

  it('writes facts in multi-row statements and uses D1 batch when available', async () => {
    const { db, valueBatches, getBatchCalls } = createRecordingDatabase()
    const facts = Array.from({ length: 13 }, (_, index) => fact(index))

    await expect(
      upsertCompanyFacts(db as never, 7, facts, 'https://example.test', '2026-01-01T00:00:00Z'),
    ).resolves.toBe(13)

    expect(valueBatches.map((batch) => batch.length)).toEqual([6, 6, 1])
    expect(valueBatches[0]?.[0]?.concept).toBe('us-gaap:Revenues:0')
    expect(getBatchCalls()).toBe(1)
  })
})
