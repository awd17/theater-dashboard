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
  baselineLabel = '2019',
): {
  ratio: number | null
  latestLabel: string | null
  baselineLabel: string
} {
  const baseline = periods.find((period) => period.periodLabel === baselineLabel)
  const completed = periods
    .filter((period) => period.periodLabel !== baselineLabel && period.isPartial !== true)
    .sort((a, b) => b.periodLabel.localeCompare(a.periodLabel))

  const latest = completed[0] ?? null

  if (
    !baseline
    || baseline.boxOfficeCents === null
    || baseline.boxOfficeCents === 0
    || !latest
    || latest.boxOfficeCents === null
  ) {
    return { ratio: null, latestLabel: latest?.periodLabel ?? null, baselineLabel }
  }

  return {
    ratio: latest.boxOfficeCents / baseline.boxOfficeCents,
    latestLabel: latest.periodLabel,
    baselineLabel,
  }
}

export function buildIndustrySnapshot(
  dailyRows: DailyGrossRow[],
  marketPeriods: MarketPeriodRow[],
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
      ? ytdBoxOfficeCents / priorYearComparableYtdCents
      : null

  const recovery = computeRecoveryVs2019(marketPeriods)
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
