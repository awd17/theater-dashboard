import { describe, expect, it } from 'vitest'
import {
  buildIndustrySnapshot,
  buildMarketYearHistory,
  computeRecoveryVs2019,
  computeTop10Concentration,
  type DailyGrossRow,
  type MarketPeriodRow,
} from '../../server/ingest/metrics'

describe('buildMarketYearHistory', () => {
  const year = (
    periodLabel: string,
    boxOfficeCents: number | null,
    isPartial = false,
  ): MarketPeriodRow => ({
    periodLabel,
    boxOfficeCents,
    ticketsSold: 100,
    averageTicketPriceCents: 10_000,
    isPartial,
  })

  it('sorts years ascending and computes year-over-year growth', () => {
    const history = buildMarketYearHistory([
      year('2025', 1_100_000),
      year('2023', 900_000),
      year('2024', 1_000_000),
    ])

    expect(history.map((entry) => entry.periodLabel)).toEqual(['2023', '2024', '2025'])
    expect(history[0]!.yoyGrowthRatio).toBeNull()
    expect(history[1]!.yoyGrowthRatio).toBeCloseTo(1 / 9, 10)
    expect(history[2]!.yoyGrowthRatio).toBeCloseTo(0.1, 10)
  })

  it('skips growth across gaps and missing box office values', () => {
    const history = buildMarketYearHistory([
      year('2020', null),
      year('2021', 500_000),
      year('2023', 800_000),
    ])

    expect(history.find((entry) => entry.periodLabel === '2021')!.yoyGrowthRatio).toBeNull()
    expect(history.find((entry) => entry.periodLabel === '2023')!.yoyGrowthRatio).toBeNull()
  })

  it('keeps the partial flag on the current year', () => {
    const history = buildMarketYearHistory([year('2026', 700_000, true)])
    expect(history[0]!.isPartial).toBe(true)
  })
})

describe('computeTop10Concentration', () => {
  it('returns the share of daily gross earned by the top 10 films', () => {
    const rows: DailyGrossRow[] = Array.from({ length: 12 }, (_, index) => ({
      observationDate: '2026-08-26',
      movieId: index + 1,
      grossCents: (12 - index) * 100,
      theaterCount: 1_000,
      rank: index + 1,
    }))

    expect(computeTop10Concentration(rows)).toBeCloseTo(75 / 78)
  })
})

describe('computeRecoveryVs2019', () => {
  it('compares the latest completed market year against 2019', () => {
    const periods: MarketPeriodRow[] = [
      {
        periodLabel: '2019',
        boxOfficeCents: 1_000_000,
        ticketsSold: 100,
        averageTicketPriceCents: 10_000,
        isPartial: false,
      },
      {
        periodLabel: '2025',
        boxOfficeCents: 800_000,
        ticketsSold: 70,
        averageTicketPriceCents: 11_000,
        isPartial: false,
      },
      {
        periodLabel: '2026',
        boxOfficeCents: 500_000,
        ticketsSold: 40,
        averageTicketPriceCents: 12_000,
        isPartial: true,
      },
    ]

    expect(computeRecoveryVs2019(periods)).toEqual({
      ratio: 0.8,
      latestLabel: '2025',
      baselineLabel: '2019',
    })
  })
})

describe('buildIndustrySnapshot', () => {
  it('computes YTD, comparable prior-year YTD, and recovery', () => {
    const dailyRows: DailyGrossRow[] = [
      {
        observationDate: '2025-01-01',
        movieId: 1,
        grossCents: 100,
        theaterCount: 1_000,
        rank: 1,
      },
      {
        observationDate: '2025-08-26',
        movieId: 1,
        grossCents: 200,
        theaterCount: 1_000,
        rank: 1,
      },
      {
        observationDate: '2026-01-01',
        movieId: 1,
        grossCents: 150,
        theaterCount: 1_000,
        rank: 1,
      },
      {
        observationDate: '2026-08-26',
        movieId: 1,
        grossCents: 250,
        theaterCount: 1_000,
        rank: 1,
      },
      {
        observationDate: '2026-08-26',
        movieId: 2,
        grossCents: 50,
        theaterCount: 800,
        rank: 2,
      },
    ]

    const marketPeriods: MarketPeriodRow[] = [
      {
        periodLabel: '2019',
        boxOfficeCents: 1_000,
        ticketsSold: 100,
        averageTicketPriceCents: 10,
        isPartial: false,
      },
      {
        periodLabel: '2025',
        boxOfficeCents: 700,
        ticketsSold: 60,
        averageTicketPriceCents: 12,
        isPartial: false,
      },
    ]

    const snapshot = buildIndustrySnapshot(dailyRows, marketPeriods)

    expect(snapshot.latestObservationDate).toBe('2026-08-26')
    expect(snapshot.latestDailyTotalCents).toBe(300)
    expect(snapshot.ytdBoxOfficeCents).toBe(450)
    expect(snapshot.priorYearComparableYtdCents).toBe(300)
    expect(snapshot.yoyGrowthRatio).toBe(1.5)
    expect(snapshot.top10Concentration).toBe(1)
    expect(snapshot.recoveryVs2019Ratio).toBe(0.7)
    expect(snapshot.recoveryPeriodLabel).toBe('2025')
  })
})
