import { describe, expect, it } from 'vitest'
import {
  buildOperatorQuarterlyHistory,
  buildOperatorSnapshotEntry,
  interestCoverage,
  leaseAdjustedNetDebt,
  type OperatorFactRow,
} from '../../server/ingest/operator-metrics'

const company = { ticker: 'AMC', name: 'AMC Entertainment' }

function fiscalFor(end: string): { fiscalYear: number, fiscalPeriod: string } {
  const [year, month] = end.split('-')
  return { fiscalYear: Number(year), fiscalPeriod: `Q${Math.ceil(Number(month) / 3)}` }
}

function flow(metric: string, start: string, end: string, value: number, filed = '2026-07-23'): OperatorFactRow {
  return { metric, periodStart: start, periodEnd: end, value, filedDate: filed, ...fiscalFor(end) }
}

function instant(metric: string, end: string, value: number, filed = '2026-07-23'): OperatorFactRow {
  return { metric, periodStart: end, periodEnd: end, value, filedDate: filed, ...fiscalFor(end) }
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

  describe('attendance', () => {
    const withAttendance = [
      ...rows,
      flow('attendance', '2026-04-01', '2026-06-30', 75_000_000),
      flow('attendance', '2025-04-01', '2025-06-30', 60_000_000),
    ]
    const attendanceEntry = buildOperatorSnapshotEntry(company, withAttendance)

    it('reports latest quarterly attendance with year-over-year growth', () => {
      expect(attendanceEntry.attendanceCount).toBe(75_000_000)
      expect(attendanceEntry.attendanceYoyRatio).toBeCloseTo(0.25, 10)
    })

    it('computes revenue per patron from the matching quarter', () => {
      expect(attendanceEntry.revenuePerPatronCents).toBe(Math.round(150_000 / 75_000_000))
    })

    it('keeps fresher attendance even when revenue lags a quarter behind', () => {
      const lagged = buildOperatorSnapshotEntry(company, [
        flow('revenue', '2026-01-01', '2026-03-31', 100_000, '2026-05-01'),
        flow('attendance', '2026-04-01', '2026-06-30', 50_000_000),
        flow('attendance', '2025-04-01', '2025-06-30', 40_000_000),
      ])
      expect(lagged.latestQuarterEnd).toBe('2026-03-31')
      expect(lagged.attendanceCount).toBe(50_000_000)
      expect(lagged.attendanceYoyRatio).toBeCloseTo(0.25, 10)
      expect(lagged.revenuePerPatronCents).toBeNull()
    })

    it('leaves attendance fields null when no attendance facts exist', () => {
      expect(entry.attendanceCount).toBeNull()
      expect(entry.attendanceYoyRatio).toBeNull()
      expect(entry.revenuePerPatronCents).toBeNull()
    })

    it('uses reported attendance growth and an estimated core-spend proxy when counts are undisclosed', () => {
      const marcus = buildOperatorSnapshotEntry(
        { ticker: 'MCS', name: 'Marcus' },
        [
          flow('revenue', '2026-04-01', '2026-06-30', 231_744),
          flow('admissions_revenue', '2026-04-01', '2026-06-30', 72_557),
          flow('admissions_revenue', '2025-04-01', '2025-06-30', 62_348),
          flow('food_beverage_revenue', '2026-04-01', '2026-06-30', 65_264),
          flow('food_beverage_revenue', '2025-04-01', '2025-06-30', 57_611),
          flow('attendance_yoy_ratio', '2026-04-01', '2026-06-30', 109_000),
          flow('average_ticket_price_yoy_ratio', '2026-04-01', '2026-06-30', 52_000),
          flow('food_beverage_per_patron_yoy_ratio', '2026-04-01', '2026-06-30', 24_000),
        ],
      )

      const expectedCoreSpendGrowth = (
        62_348 * 0.052
        + 57_611 * 0.024
      ) / (62_348 + 57_611)

      expect(marcus.attendanceCount).toBeNull()
      expect(marcus.attendanceYoyRatio).toBeCloseTo(0.109, 10)
      expect(marcus.attendanceYoyQuality).toBe('reported')
      expect(marcus.revenuePerPatronYoyRatio).toBeCloseTo(expectedCoreSpendGrowth, 10)
      expect(marcus.revenuePerPatronYoyQuality).toBe('estimated')
    })
  })

  describe('revenue split and per-patron metrics', () => {
    const withSplit = [
      ...rows,
      flow('attendance', '2026-04-01', '2026-06-30', 50_000),
      flow('admissions_revenue', '2026-04-01', '2026-06-30', 90_000),
      flow('food_beverage_revenue', '2026-04-01', '2026-06-30', 45_000),
    ]
    const splitEntry = buildOperatorSnapshotEntry(company, withSplit)

    it('reports the admissions and food & beverage split', () => {
      expect(splitEntry.admissionsRevenueCents).toBe(90_000)
      expect(splitEntry.foodBeverageRevenueCents).toBe(45_000)
    })

    it('derives average ticket price and food & beverage per patron', () => {
      expect(splitEntry.averageTicketPriceCents).toBe(Math.round(90_000 / 50_000))
      expect(splitEntry.foodBeveragePerPatronCents).toBe(Math.round(45_000 / 50_000))
    })

    it('reports theatre and screen counts with attendance per screen', () => {
      const withCounts = buildOperatorSnapshotEntry(company, [
        ...rows,
        flow('attendance', '2026-04-01', '2026-06-30', 50_000),
        instant('theatre_count', '2026-06-30', 845),
        instant('screen_count', '2026-06-30', 9_530),
      ])
      expect(withCounts.theatreCount).toBe(845)
      expect(withCounts.screenCount).toBe(9_530)
      expect(withCounts.attendancePerScreen).toBe(Math.round(50_000 / 9_530))
    })

    it('accepts quarter-average screen counts and skips per-screen on period mismatch', () => {
      const averaged = buildOperatorSnapshotEntry(company, [
        ...rows,
        flow('attendance', '2026-04-01', '2026-06-30', 50_000),
        flow('screen_count', '2026-01-01', '2026-03-31', 5_646, '2026-05-01'),
      ])
      expect(averaged.screenCount).toBe(5_646)
      expect(averaged.attendancePerScreen).toBeNull()
    })

    it('skips per-patron derivations when attendance covers a different quarter', () => {
      const mismatched = buildOperatorSnapshotEntry(company, [
        ...rows,
        flow('attendance', '2026-01-01', '2026-03-31', 40_000, '2026-05-01'),
        flow('admissions_revenue', '2026-04-01', '2026-06-30', 90_000),
      ])
      expect(mismatched.admissionsRevenueCents).toBe(90_000)
      expect(mismatched.averageTicketPriceCents).toBeNull()
    })
  })

  describe('cash flow, interest, and leases', () => {
    const withFinancials = [
      ...rows,
      flow('interest_expense', '2026-04-01', '2026-06-30', 11_000),
      flow('operating_cash_flow', '2026-01-01', '2026-06-30', 10_690),
      flow('operating_cash_flow', '2026-01-01', '2026-03-31', -12_850),
      flow('capex', '2026-01-01', '2026-06-30', 9_150),
      flow('capex', '2026-01-01', '2026-03-31', 4_620),
      instant('operating_lease_noncurrent', '2026-06-30', 300_000),
      instant('operating_lease_current', '2026-06-30', 50_000),
    ]
    const financialEntry = buildOperatorSnapshotEntry(company, withFinancials)

    it('takes quarterly interest expense directly', () => {
      expect(financialEntry.interestExpenseCents).toBe(11_000)
    })

    it('derives the quarter from year-to-date cash flow facts', () => {
      expect(financialEntry.operatingCashFlowCents).toBe(10_690 - -12_850)
      expect(financialEntry.capexCents).toBe(9_150 - 4_620)
    })

    it('computes free cash flow from the derived quarter values', () => {
      expect(financialEntry.freeCashFlowCents).toBe(23_540 - 4_530)
    })

    it('sums current and noncurrent operating lease liabilities', () => {
      expect(financialEntry.operatingLeaseCents).toBe(350_000)
    })

    it('uses a first-quarter year-to-date fact directly as the quarter', () => {
      const q1 = buildOperatorSnapshotEntry(company, [
        flow('revenue', '2026-01-01', '2026-03-31', 80_000, '2026-05-01'),
        flow('operating_cash_flow', '2026-01-01', '2026-03-31', 5_000, '2026-05-01'),
      ])
      expect(q1.operatingCashFlowCents).toBe(5_000)
    })

    it('returns null cash flow when the previous year-to-date fact is missing', () => {
      const partial = buildOperatorSnapshotEntry(company, [
        ...rows,
        flow('operating_cash_flow', '2026-01-01', '2026-06-30', 10_690),
      ])
      expect(partial.operatingCashFlowCents).toBeNull()
      expect(partial.freeCashFlowCents).toBeNull()
    })

    it('exposes net debt, lease-adjusted net debt, and interest coverage', () => {
      expect(financialEntry.netDebtCents).toBe(385_000 - 70_000)
      expect(financialEntry.leaseAdjustedNetDebtCents).toBe(385_000 + 350_000 - 70_000)
      expect(financialEntry.interestCoverageRatio).toBeCloseTo(20_000 / 11_000, 10)
    })
  })

  describe('leverage null-safety', () => {
    it('returns null when any lease-adjusted input is missing', () => {
      expect(leaseAdjustedNetDebt(null, 1, 1)).toBeNull()
      expect(leaseAdjustedNetDebt(1, null, 1)).toBeNull()
      expect(leaseAdjustedNetDebt(1, 1, null)).toBeNull()
      expect(leaseAdjustedNetDebt(385_000, 350_000, 70_000)).toBe(665_000)
    })

    it('returns null interest coverage without operating income, interest, or with zero interest', () => {
      expect(interestCoverage(null, 11_000)).toBeNull()
      expect(interestCoverage(20_000, null)).toBeNull()
      expect(interestCoverage(20_000, 0)).toBeNull()
      expect(interestCoverage(20_000, 11_000)).toBeCloseTo(20_000 / 11_000, 10)
    })

    it('leaves leverage null when balance-sheet inputs are stale', () => {
      const noCash = rows.filter(
        (row) => !(row.metric === 'cash' && row.periodEnd === '2026-06-30'),
      )
      const stale = buildOperatorSnapshotEntry(company, noCash)
      expect(stale.netDebtCents).toBeNull()
      expect(stale.leaseAdjustedNetDebtCents).toBeNull()
    })
  })

  describe('geography split', () => {
    function segmented(metric: string, concept: string, value: number): OperatorFactRow {
      return { ...flow(metric, '2026-04-01', '2026-06-30', value), concept }
    }

    it('leaves shares and notes null when filings disclose no segment rows', () => {
      const plain = buildOperatorSnapshotEntry(company, [
        ...rows,
        flow('attendance', '2026-04-01', '2026-06-30', 50_000),
        flow('admissions_revenue', '2026-04-01', '2026-06-30', 90_000),
      ])
      expect(plain.attendanceUsShare).toBeNull()
      expect(plain.admissionsRevenueUsShare).toBeNull()
      expect(plain.geographyNote).toBeNull()
    })

    it('derives US shares only from explicit segment rows', () => {
      const split = buildOperatorSnapshotEntry(company, [
        ...rows,
        flow('attendance', '2026-04-01', '2026-06-30', 50_000),
        segmented('attendance', 'us-gaap:RevenueDomestic', 30_000),
        segmented('attendance', 'us-gaap:RevenueInternational', 20_000),
        flow('admissions_revenue', '2026-04-01', '2026-06-30', 90_000),
        segmented('admissions_revenue', 'us-gaap:RevenueDomestic', 60_000),
        segmented('admissions_revenue', 'us-gaap:RevenueInternational', 30_000),
      ])
      expect(split.attendanceUsShare).toBeCloseTo(0.6, 10)
      expect(split.admissionsRevenueUsShare).toBeCloseTo(60_000 / 90_000, 10)
      expect(split.geographyNote).toContain('us-gaap:RevenueDomestic')
      expect(split.geographyNote).toContain('us-gaap:RevenueInternational')
    })
  })
})

describe('buildOperatorQuarterlyHistory', () => {
  it('returns per-quarter revenue with companions, oldest first', () => {
    const history = buildOperatorQuarterlyHistory([
      flow('revenue', '2026-04-01', '2026-06-30', 150_000),
      flow('revenue', '2026-01-01', '2026-03-31', 100_000, '2026-05-01'),
      flow('revenue', '2026-01-01', '2026-06-30', 260_000),
      flow('revenue', '2025-04-01', '2025-06-30', 120_000, '2025-07-23'),
      flow('net_income', '2026-04-01', '2026-06-30', -1_000),
      flow('attendance', '2026-04-01', '2026-06-30', 50_000),
    ])

    expect(history.map((entry) => entry.label)).toEqual(['Q2 2025', 'Q1 2026', 'Q2 2026'])
    expect(history.at(-1)).toMatchObject({
      periodEnd: '2026-06-30',
      label: 'Q2 2026',
      revenueCents: 150_000,
      netIncomeCents: -1_000,
      attendanceCount: 50_000,
    })
    expect(history[1]!.netIncomeCents).toBeNull()
  })

  it('caps the history at the requested number of quarters', () => {
    const manyQuarters = Array.from({ length: 12 }, (_, index) => {
      const year = 2020 + Math.floor(index / 4)
      const quarter = (index % 4) + 1
      const endMonth = String(quarter * 3).padStart(2, '0')
      const startMonth = String(quarter * 3 - 2).padStart(2, '0')
      return flow('revenue', `${year}-${startMonth}-01`, `${year}-${endMonth}-28`, 1_000 + index, `${year}-12-31`)
    })

    const history = buildOperatorQuarterlyHistory(manyQuarters, 8)
    expect(history).toHaveLength(8)
    expect(history[0]!.label).toBe('Q1 2021')
    expect(history.at(-1)!.label).toBe('Q4 2022')
  })

  it('prefers the most recently filed value for a restated quarter', () => {
    const history = buildOperatorQuarterlyHistory([
      flow('revenue', '2026-01-01', '2026-03-31', 100_000, '2026-05-01'),
      flow('revenue', '2026-01-01', '2026-03-31', 105_000, '2026-08-01'),
    ])
    expect(history).toHaveLength(1)
    expect(history[0]!.revenueCents).toBe(105_000)
  })
  it('derives the fourth quarter from full-year and nine-month facts', () => {
    const history = buildOperatorQuarterlyHistory([
      flow('revenue', '2025-01-01', '2025-12-31', 400_000, '2026-02-25'),
      flow('revenue', '2025-01-01', '2025-09-30', 290_000, '2025-11-05'),
      flow('revenue', '2026-01-01', '2026-03-31', 95_000, '2026-05-01'),
    ])

    expect(history.map((entry) => entry.label)).toEqual(['Q4 2025', 'Q1 2026'])
    expect(history[0]!.revenueCents).toBe(110_000)
  })

  it('computes attendance per screen only when counts align in the same quarter', () => {
    const history = buildOperatorQuarterlyHistory([
      flow('revenue', '2026-04-01', '2026-06-30', 150_000),
      flow('revenue', '2026-01-01', '2026-03-31', 100_000, '2026-05-01'),
      flow('attendance', '2026-04-01', '2026-06-30', 50_000),
      instant('screen_count', '2026-06-30', 9_530),
      flow('attendance', '2026-01-01', '2026-03-31', 40_000, '2026-05-01'),
    ])

    expect(history.at(-1)?.attendancePerScreen).toBe(Math.round(50_000 / 9_530))
    expect(history[0]?.attendancePerScreen).toBeNull()
  })

  it('exposes fiscal and calendar period identity without conflating them', () => {
    const history = buildOperatorQuarterlyHistory([
      flow('revenue', '2026-04-01', '2026-06-30', 150_000),
    ])

    expect(history.at(-1)).toMatchObject({
      periodEnd: '2026-06-30',
      periodStart: '2026-04-01',
      fiscalYear: 2026,
      fiscalPeriod: 'Q2',
      calendarLabel: 'Q2 2026',
      label: 'Q2 2026',
    })

    const calendarOnly = buildOperatorQuarterlyHistory([
      { ...flow('revenue', '2026-04-01', '2026-06-30', 150_000), fiscalYear: null, fiscalPeriod: null },
    ])

    expect(calendarOnly.at(-1)).toMatchObject({
      fiscalYear: null,
      fiscalPeriod: null,
      calendarLabel: 'Q2 2026',
      label: 'Q2 2026',
    })
  })
})
