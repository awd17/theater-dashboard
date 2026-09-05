import { describe, expect, it } from 'vitest'
import {
  buildDistributorShares,
  buildIndustrySnapshot,
  buildIndustryTrend,
  buildMarketYearHistory,
  buildReleaseVolumeHistory,
  buildSeasonalityMatrix,
  computeRecoveryVs2019,
  computeTop10Concentration,
  type DailyGrossRow,
  type DistributorYearRow,
  type MarketPeriodRow,
} from '../../server/ingest/metrics'

describe('buildDistributorShares', () => {
  const row = (
    periodLabel: string,
    distributor: string,
    boxOfficeCents: number,
    isPartial = false,
  ): DistributorYearRow => ({ periodLabel, distributor, boxOfficeCents, titleCount: 3, isPartial })

  it('computes shares for the latest year and groups the tail into Others', () => {
    const rows = [
      row('2025', 'Old Studio', 999_999),
      row('2026', 'Studio A', 500, true),
      row('2026', 'Studio B', 300, true),
      row('2026', 'Studio C', 150, true),
      row('2026', 'Studio D', 50, true),
    ]

    const summary = buildDistributorShares(rows, 2)!

    expect(summary.periodLabel).toBe('2026')
    expect(summary.isPartial).toBe(true)
    expect(summary.totalBoxOfficeCents).toBe(1_000)
    expect(summary.entries.map((entry) => entry.distributor)).toEqual([
      'Studio A',
      'Studio B',
      'Others (2)',
    ])
    expect(summary.entries[0]!.share).toBeCloseTo(0.5, 10)
    expect(summary.entries[2]!.share).toBeCloseTo(0.2, 10)
  })

  it('returns null without distributor rows', () => {
    expect(buildDistributorShares([])).toBeNull()
  })
})

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

  it('averages 2017-2019 when the avg baseline is selected', () => {
    const periods: MarketPeriodRow[] = [
      {
        periodLabel: '2017',
        boxOfficeCents: 900_000,
        ticketsSold: 90,
        averageTicketPriceCents: 10_000,
        isPartial: false,
      },
      {
        periodLabel: '2018',
        boxOfficeCents: 1_100_000,
        ticketsSold: 110,
        averageTicketPriceCents: 10_000,
        isPartial: false,
      },
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
    ]

    expect(computeRecoveryVs2019(periods, 'avg2017_2019')).toEqual({
      ratio: 0.8,
      latestLabel: '2025',
      baselineLabel: '2017–19 avg',
    })
  })

  it('returns null when any average-baseline year is missing', () => {
    const periods: MarketPeriodRow[] = [
      {
        periodLabel: '2018',
        boxOfficeCents: 1_100_000,
        ticketsSold: 110,
        averageTicketPriceCents: 10_000,
        isPartial: false,
      },
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
    ]

    expect(computeRecoveryVs2019(periods, 'avg2017_2019')).toEqual({
      ratio: null,
      latestLabel: '2025',
      baselineLabel: '2017–19 avg',
    })
  })
})

describe('buildReleaseVolumeHistory', () => {
  it('sums title counts per period label in ascending order', () => {
    const rows: DistributorYearRow[] = [
      { periodLabel: '2025', distributor: 'A', boxOfficeCents: 500, titleCount: 120, isPartial: false },
      { periodLabel: '2025', distributor: 'B', boxOfficeCents: 300, titleCount: 80, isPartial: false },
      { periodLabel: '2024', distributor: 'A', boxOfficeCents: 400, titleCount: 150, isPartial: false },
    ]

    expect(buildReleaseVolumeHistory(rows)).toEqual([
      { periodLabel: '2024', titleCount: 150 },
      { periodLabel: '2025', titleCount: 200 },
    ])
  })

  it('returns an empty array without distributor rows', () => {
    expect(buildReleaseVolumeHistory([])).toEqual([])
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
    expect(snapshot.yoyGrowthRatio).toBe(0.5)
    expect(snapshot.top10Concentration).toBe(1)
    expect(snapshot.recoveryVs2019Ratio).toBe(0.7)
    expect(snapshot.recoveryPeriodLabel).toBe('2025')
  })
})

describe('buildIndustryTrend', () => {
  it('aggregates daily gross into monthly series by year', () => {
    const dailyRows: DailyGrossRow[] = [
      {
        observationDate: '2019-01-15',
        movieId: 1,
        grossCents: 100,
        theaterCount: 1,
        rank: 1,
      },
      {
        observationDate: '2019-02-10',
        movieId: 1,
        grossCents: 200,
        theaterCount: 1,
        rank: 1,
      },
      {
        observationDate: '2025-01-05',
        movieId: 1,
        grossCents: 150,
        theaterCount: 1,
        rank: 1,
      },
      {
        observationDate: '2026-01-05',
        movieId: 1,
        grossCents: 180,
        theaterCount: 1,
        rank: 1,
      },
      {
        observationDate: '2026-01-20',
        movieId: 2,
        grossCents: 20,
        theaterCount: 1,
        rank: 2,
      },
      {
        observationDate: '2026-02-01',
        movieId: 1,
        grossCents: 300,
        theaterCount: 1,
        rank: 1,
      },
    ]

    const trend = buildIndustryTrend(dailyRows)

    expect(trend.asOfDate).toBe('2026-02-01')
    expect(trend.comparisonYears).toEqual([2019, 2025, 2026])

    const current = trend.monthlyByYear.find((series) => series.year === 2026)!
    expect(current.months).toEqual([
      { month: '2026-01', year: 2026, monthNumber: 1, boxOfficeCents: 200 },
      { month: '2026-02', year: 2026, monthNumber: 2, boxOfficeCents: 300 },
    ])
    expect(current.cumulativeByMonth).toEqual([
      { monthNumber: 1, cumulativeCents: 200 },
      { monthNumber: 2, cumulativeCents: 500 },
    ])
  })

  it('builds a 2019-to-latest seasonality matrix with nulls for missing months', () => {
    const dailyRows: DailyGrossRow[] = [
      {
        observationDate: '2019-01-15',
        movieId: 1,
        grossCents: 100,
        theaterCount: 1,
        rank: 1,
      },
      {
        observationDate: '2020-01-10',
        movieId: 1,
        grossCents: 400,
        theaterCount: 1,
        rank: 1,
      },
      {
        observationDate: '2020-03-10',
        movieId: 1,
        grossCents: 600,
        theaterCount: 1,
        rank: 1,
      },
    ]

    const matrix = buildSeasonalityMatrix(dailyRows)

    expect(matrix?.years).toEqual([2019, 2020])
    expect(matrix?.months).toEqual([
      { monthNumber: 1, values: { '2019': 100, '2020': 400 } },
      { monthNumber: 3, values: { '2019': null, '2020': 600 } },
    ])
    expect(buildIndustryTrend(dailyRows).seasonality).toEqual(matrix)
  })

  it('returns null seasonality without daily rows', () => {
    expect(buildSeasonalityMatrix([])).toBeNull()
    expect(buildIndustryTrend([]).seasonality).toBeNull()
  })
})
