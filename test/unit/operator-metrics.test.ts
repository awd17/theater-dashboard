import { describe, expect, it } from 'vitest'
import {
  buildOperatorSnapshotEntry,
  type OperatorFactRow,
} from '../../server/ingest/operator-metrics'

const company = { ticker: 'AMC', name: 'AMC Entertainment' }

function flow(metric: string, start: string, end: string, value: number, filed = '2026-07-23'): OperatorFactRow {
  return { metric, periodStart: start, periodEnd: end, value, filedDate: filed, fiscalYear: 2026, fiscalPeriod: 'Q2' }
}

function instant(metric: string, end: string, value: number, filed = '2026-07-23'): OperatorFactRow {
  return { metric, periodStart: end, periodEnd: end, value, filedDate: filed, fiscalYear: 2026, fiscalPeriod: 'Q2' }
}

describe('buildOperatorSnapshotEntry', () => {
  const rows: OperatorFactRow[] = [
    flow('revenue', '2026-04-01', '2026-06-30', 150_000),
    flow('revenue', '2026-01-01', '2026-06-30', 260_000),
    flow('revenue', '2025-04-01', '2025-06-30', 120_000, '2025-07-23'),
    flow('net_income', '2026-04-01', '2026-06-30', -1_000),
    flow('operating_income', '2026-04-01', '2026-06-30', 20_000),
    instant('cash', '2026-06-30', 70_000),
    instant('long_term_debt_noncurrent', '2026-06-30', 370_000),
    instant('long_term_debt_current', '2026-06-30', 15_000),
    instant('cash', '2022-09-30', 999_999, '2022-11-01'),
    instant('shares_outstanding', '2026-07-22', 892),
  ]

  const entry = buildOperatorSnapshotEntry(company, rows)

  it('selects the latest quarterly revenue, ignoring year-to-date durations', () => {
    expect(entry.latestQuarterEnd).toBe('2026-06-30')
    expect(entry.revenueCents).toBe(150_000)
    expect(entry.latestQuarterLabel).toBe('Q2 2026')
  })

  it('computes year-over-year growth from the same quarter last year', () => {
    expect(entry.revenueYoyRatio).toBeCloseTo(0.25, 10)
  })

  it('takes flows and instants only from the latest quarter period', () => {
    expect(entry.netIncomeCents).toBe(-1_000)
    expect(entry.operatingIncomeCents).toBe(20_000)
    expect(entry.cashCents).toBe(70_000)
  })

  it('sums noncurrent and current long-term debt at the same period end', () => {
    expect(entry.longTermDebtCents).toBe(385_000)
  })

  it('uses shares outstanding measured at or after the quarter end', () => {
    expect(entry.sharesOutstanding).toBe(892)
  })

  it('prefers the most recently filed value when a period is restated', () => {
    const restated = buildOperatorSnapshotEntry(company, [
      ...rows,
      flow('revenue', '2026-04-01', '2026-06-30', 155_000, '2026-09-01'),
    ])
    expect(restated.revenueCents).toBe(155_000)
  })

  it('leaves stale balance-sheet values out instead of showing old data', () => {
    const noFreshCash = rows.filter(
      (row) => !(row.metric === 'cash' && row.periodEnd === '2026-06-30'),
    )
    const entryWithoutFreshCash = buildOperatorSnapshotEntry(company, noFreshCash)
    expect(entryWithoutFreshCash.cashCents).toBeNull()
  })

  it('returns an empty entry when no quarterly revenue exists', () => {
    const entryEmpty = buildOperatorSnapshotEntry(company, [instant('cash', '2026-06-30', 1)])
    expect(entryEmpty.latestQuarterEnd).toBeNull()
    expect(entryEmpty.revenueCents).toBeNull()
  })
})
