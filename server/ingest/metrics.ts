export interface DailyGrossRow {
  observationDate: string
  movieId: number
  grossCents: number | null
  theaterCount: number | null
  rank: number | null
}

export interface MarketPeriodRow {
  periodLabel: string
  boxOfficeCents: number | null
  ticketsSold: number | null
  averageTicketPriceCents: number | null
  isPartial: boolean | null
}

export interface DistributorYearRow {
  periodLabel: string
  distributor: string
  boxOfficeCents: number
  titleCount: number
  isPartial: boolean | null
}

export interface DistributorShareEntry {
  distributor: string
  boxOfficeCents: number
  titleCount: number
  share: number
}

export interface DistributorShareSummary {
  periodLabel: string
  isPartial: boolean
  totalBoxOfficeCents: number
  entries: DistributorShareEntry[]
}

export function buildDistributorShares(
  rows: DistributorYearRow[],
  topCount = 6,
): DistributorShareSummary | null {
  if (rows.length === 0) {
    return null
  }

  const latestLabel = rows
    .map((row) => row.periodLabel)
    .reduce((a, b) => (a > b ? a : b))
  const latestRows = rows
    .filter((row) => row.periodLabel === latestLabel)
    .sort((a, b) => b.boxOfficeCents - a.boxOfficeCents)

  const totalBoxOfficeCents = latestRows.reduce((sum, row) => sum + row.boxOfficeCents, 0)
  if (totalBoxOfficeCents === 0) {
    return null
  }

  const top = latestRows.slice(0, topCount)
  const rest = latestRows.slice(topCount)

  const entries = top.map((row) => ({
    distributor: row.distributor,
    boxOfficeCents: row.boxOfficeCents,
    titleCount: row.titleCount,
    share: row.boxOfficeCents / totalBoxOfficeCents,
  }))

  if (rest.length > 0) {
    const restBoxOffice = rest.reduce((sum, row) => sum + row.boxOfficeCents, 0)
    entries.push({
      distributor: `Others (${rest.length})`,
      boxOfficeCents: restBoxOffice,
      titleCount: rest.reduce((sum, row) => sum + row.titleCount, 0),
      share: restBoxOffice / totalBoxOfficeCents,
    })
  }

  return {
    periodLabel: latestLabel,
    isPartial: latestRows.some((row) => row.isPartial === true),
    totalBoxOfficeCents,
    entries,
  }
}
export const RECOVERY_BASELINES = ['2019', 'avg2017_2019'] as const

export type RecoveryBaseline = (typeof RECOVERY_BASELINES)[number]

export interface ReleaseVolumeEntry {
  periodLabel: string
  titleCount: number
}

export function buildReleaseVolumeHistory(distributorRows: DistributorYearRow[]): ReleaseVolumeEntry[] {
  const titlesByPeriod = new Map<string, number>()
  for (const row of distributorRows) {
    titlesByPeriod.set(row.periodLabel, (titlesByPeriod.get(row.periodLabel) ?? 0) + row.titleCount)
  }
  return [...titlesByPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodLabel, titleCount]) => ({ periodLabel, titleCount }))
}

export interface MarketYearEntry {
  periodLabel: string
  boxOfficeCents: number | null
  ticketsSold: number | null
  averageTicketPriceCents: number | null
  isPartial: boolean | null
  yoyGrowthRatio: number | null
}

export interface IndustrySnapshot {
  latestObservationDate: string | null
  latestDailyTotalCents: number | null
  ytdBoxOfficeCents: number | null
  priorYearComparableYtdCents: number | null
  yoyGrowthRatio: number | null
  top10Concentration: number | null
  recoveryVs2019Ratio: number | null
  recoveryPeriodLabel: string | null
  recoveryBaselinePeriodLabel: string
  latestMarketYear: {
    periodLabel: string
    boxOfficeCents: number | null
    ticketsSold: number | null
    averageTicketPriceCents: number | null
    isPartial: boolean | null
  } | null
  marketYears: MarketYearEntry[]
}

export function buildMarketYearHistory(periods: MarketPeriodRow[]): MarketYearEntry[] {
  const sorted = [...periods].sort((a, b) => a.periodLabel.localeCompare(b.periodLabel))
  const boxOfficeByLabel = new Map(
    sorted.map((period) => [period.periodLabel, period.boxOfficeCents]),
  )

  return sorted.map((period) => {
    const priorLabel = String(Number(period.periodLabel) - 1)
    const prior = boxOfficeByLabel.get(priorLabel) ?? null
    const yoyGrowthRatio =
      period.boxOfficeCents !== null && prior !== null && prior !== 0
        ? period.boxOfficeCents / prior - 1
        : null

    return {
      periodLabel: period.periodLabel,
      boxOfficeCents: period.boxOfficeCents,
      ticketsSold: period.ticketsSold,
      averageTicketPriceCents: period.averageTicketPriceCents,
      isPartial: period.isPartial,
      yoyGrowthRatio,
    }
  })
}

function sumGross(rows: DailyGrossRow[], datePrefix?: string): number | null {
  const filtered = datePrefix
    ? rows.filter((row) => row.observationDate.startsWith(datePrefix))
    : rows

  if (filtered.length === 0) {
    return null
  }

  let total = 0
  let sawValue = false
  for (const row of filtered) {
    if (row.grossCents === null) {
      continue
    }
    total += row.grossCents
    sawValue = true
  }

  return sawValue ? total : null
}

function latestDate(rows: DailyGrossRow[]): string | null {
  if (rows.length === 0) {
    return null
  }
  return rows.reduce(
    (latest, row) => (row.observationDate > latest ? row.observationDate : latest),
    rows[0]!.observationDate,
  )
}

export function computeTop10Concentration(rowsForDay: DailyGrossRow[]): number | null {
  const withGross = rowsForDay
    .filter((row) => row.grossCents !== null && row.grossCents > 0)
    .sort((a, b) => (b.grossCents ?? 0) - (a.grossCents ?? 0))

  if (withGross.length === 0) {
    return null
  }

  const total = withGross.reduce((sum, row) => sum + (row.grossCents ?? 0), 0)
  if (total === 0) {
    return null
  }

  const top10 = withGross.slice(0, 10).reduce((sum, row) => sum + (row.grossCents ?? 0), 0)
  return top10 / total
}

export function computeRecoveryVs2019(
  periods: MarketPeriodRow[],
  baseline: RecoveryBaseline = '2019',
): {
  ratio: number | null
  latestLabel: string | null
  baselineLabel: string
} {
  const baselineYears = baseline === '2019' ? ['2019'] : ['2017', '2018', '2019']
  const baselineValues = baselineYears.map(
    (label) => periods.find((period) => period.periodLabel === label)?.boxOfficeCents ?? null,
  )
  let baselineCents: number | null = null
  if (baseline === '2019') {
    baselineCents = baselineValues[0] ?? null
  } else if (baselineValues.every((value) => value !== null && value !== 0)) {
    baselineCents = ((baselineValues[0] ?? 0) + (baselineValues[1] ?? 0) + (baselineValues[2] ?? 0)) / 3
  }
  const displayBaselineLabel = baseline === '2019' ? '2019' : '2017–19 avg'
  const excluded: Record<string, true> = baseline === '2019'
    ? { '2019': true }
    : { '2017': true, '2018': true, '2019': true }
  const completed = periods
    .filter((period) => !excluded[period.periodLabel] && period.isPartial !== true)
    .sort((a, b) => b.periodLabel.localeCompare(a.periodLabel))
  const latest = completed[0] ?? null
  if (
    baselineCents === null
    || baselineCents === 0
    || !latest
    || latest.boxOfficeCents === null
  ) {
    return { ratio: null, latestLabel: latest?.periodLabel ?? null, baselineLabel: displayBaselineLabel }
  }
  return {
    ratio: latest.boxOfficeCents / baselineCents,
    latestLabel: latest.periodLabel,
    baselineLabel: displayBaselineLabel,
  }
}

export interface MonthlyBoxOfficePoint {
  month: string
  year: number
  monthNumber: number
  boxOfficeCents: number
}

export interface YearMonthlySeries {
  year: number
  months: MonthlyBoxOfficePoint[]
  cumulativeByMonth: Array<{ monthNumber: number, cumulativeCents: number }>
}

export interface SeasonalityMonthRow {
  monthNumber: number
  values: Record<string, number | null>
}

export interface SeasonalityMatrix {
  years: number[]
  months: SeasonalityMonthRow[]
}

export interface IndustryTrend {
  asOfDate: string | null
  monthlyByYear: YearMonthlySeries[]
  comparisonYears: number[]
  seasonality: SeasonalityMatrix | null
}

function monthKey(observationDate: string): string {
  return observationDate.slice(0, 7)
}

export function buildSeasonalityMatrix(dailyRows: DailyGrossRow[]): SeasonalityMatrix | null {
  const monthlyTotals = new Map<string, number>()
  for (const row of dailyRows) {
    if (row.grossCents === null) {
      continue
    }
    const key = monthKey(row.observationDate)
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + row.grossCents)
  }
  if (monthlyTotals.size === 0) {
    return null
  }
  const latestYear = Number(latestDate(dailyRows)?.slice(0, 4))
  const years: number[] = []
  for (let year = 2019; year <= latestYear; year += 1) {
    years.push(year)
  }
  const months: SeasonalityMonthRow[] = []
  for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
    const values: Record<string, number | null> = {}
    for (const year of years) {
      const key = `${year}-${String(monthNumber).padStart(2, '0')}`
      values[String(year)] = monthlyTotals.get(key) ?? null
    }
    if (Object.values(values).every((value) => value === null)) {
      continue
    }
    months.push({ monthNumber, values })
  }
  if (years.length === 0 || months.length === 0) {
    return null
  }
  return { years, months }
}

export function buildIndustryTrend(
  dailyRows: DailyGrossRow[],
  comparisonYears = [2019],
): IndustryTrend {
  const observationDate = latestDate(dailyRows)
  if (!observationDate) {
    return {
      asOfDate: null,
      monthlyByYear: [],
      comparisonYears,
      seasonality: null,
    }
  }

  const currentYear = Number(observationDate.slice(0, 4))
  const priorYear = currentYear - 1
  const years = [...new Set([currentYear, priorYear, ...comparisonYears])].sort((a, b) => a - b)

  const monthlyTotals = new Map<string, number>()
  for (const row of dailyRows) {
    if (row.grossCents === null) {
      continue
    }
    const key = monthKey(row.observationDate)
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + row.grossCents)
  }

  const monthlyByYear: YearMonthlySeries[] = years.map((year) => {
    const months: MonthlyBoxOfficePoint[] = []
    for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
      const month = `${year}-${String(monthNumber).padStart(2, '0')}`
      const boxOfficeCents = monthlyTotals.get(month)
      if (boxOfficeCents === undefined) {
        continue
      }
      if (year === currentYear && month > observationDate.slice(0, 7)) {
        continue
      }
      months.push({ month, year, monthNumber, boxOfficeCents })
    }

    let running = 0
    const cumulativeByMonth = months.map((point) => {
      running += point.boxOfficeCents
      return { monthNumber: point.monthNumber, cumulativeCents: running }
    })

    return { year, months, cumulativeByMonth }
  })
  return {
    asOfDate: observationDate,
    monthlyByYear,
    comparisonYears: years,
    seasonality: buildSeasonalityMatrix(dailyRows),
  }
}

export function buildIndustrySnapshot(
  dailyRows: DailyGrossRow[],
  marketPeriods: MarketPeriodRow[],
  baseline: RecoveryBaseline = '2019',
): IndustrySnapshot {
  const observationDate = latestDate(dailyRows)
  const latestDayRows = observationDate
    ? dailyRows.filter((row) => row.observationDate === observationDate)
    : []

  const latestDailyTotalCents = sumGross(latestDayRows)
  const year = observationDate?.slice(0, 4) ?? null
  const ytdBoxOfficeCents = year ? sumGross(dailyRows, year) : null

  let priorYearComparableYtdCents: number | null = null
  if (observationDate && year) {
    const priorYear = String(Number(year) - 1)
    const monthDay = observationDate.slice(5)
    const comparable = dailyRows.filter((row) => {
      if (!row.observationDate.startsWith(priorYear)) {
        return false
      }
      return row.observationDate.slice(5) <= monthDay
    })
    priorYearComparableYtdCents = sumGross(comparable)
  }

  const yoyGrowthRatio =
    ytdBoxOfficeCents !== null
    && priorYearComparableYtdCents !== null
    && priorYearComparableYtdCents !== 0
      ? ytdBoxOfficeCents / priorYearComparableYtdCents - 1
      : null
  const recovery = computeRecoveryVs2019(marketPeriods, baseline)
  const latestMarket = [...marketPeriods].sort((a, b) =>
    b.periodLabel.localeCompare(a.periodLabel),
  )[0] ?? null

  return {
    latestObservationDate: observationDate,
    latestDailyTotalCents,
    ytdBoxOfficeCents,
    priorYearComparableYtdCents,
    yoyGrowthRatio,
    top10Concentration: computeTop10Concentration(latestDayRows),
    recoveryVs2019Ratio: recovery.ratio,
    recoveryPeriodLabel: recovery.latestLabel,
    recoveryBaselinePeriodLabel: recovery.baselineLabel,
    latestMarketYear: latestMarket
      ? {
          periodLabel: latestMarket.periodLabel,
          boxOfficeCents: latestMarket.boxOfficeCents,
          ticketsSold: latestMarket.ticketsSold,
          averageTicketPriceCents: latestMarket.averageTicketPriceCents,
          isPartial: latestMarket.isPartial,
        }
      : null,
    marketYears: buildMarketYearHistory(marketPeriods),
  }
}
