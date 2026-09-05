export const WIDE_RELEASE_MIN_TMDB_POPULARITY = 4
export const RERELEASE_MIN_AGE_DAYS = 365
export const FORWARD_COMPARISON_WINDOW_DAYS = 180
export const UNRATED_CERTIFICATION_LABEL = 'Unrated/NA'

export interface UpcomingReleaseRow {
  movieId: number
  title: string
  releaseDate: string
  releaseType: string
  certification: string | null
  popularity: number | null
  primaryReleaseDate: string | null
}

export interface OutlookSnapshot {
  asOfDate: string
  next30DayCount: number
  next90DayCount: number
  next180DayCount: number
  next90DayWideCount: number
  monthlyCounts: Array<{ month: string, count: number }>
  monthlySplit: Array<{ month: string, total: number, wide: number, limited: number }>
  mixByReleaseType: Array<{ releaseType: string, count: number }>
  mixByCertification: Array<{ certification: string, count: number }>
  hasData: boolean
  upcomingWideReleases: Array<{ title: string, releaseDate: string }>
}

export interface DistributorTitleRow {
  periodLabel: string
  titleCount: number
  isPartial: boolean | null
}

export interface ForwardWindowComparison {
  windowDays: number
  currentCount: number
  priorYearSameWindowCount: number | null
}

function addDays(date: string, days: number): string {
  const cursor = new Date(`${date}T00:00:00.000Z`)
  cursor.setUTCDate(cursor.getUTCDate() + days)
  return cursor.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) / 86_400_000
}

export function isRerelease(row: UpcomingReleaseRow): boolean {
  return (
    row.primaryReleaseDate !== null
    && daysBetween(row.primaryReleaseDate, row.releaseDate) > RERELEASE_MIN_AGE_DAYS
  )
}

export function isExpectedWideRelease(row: UpcomingReleaseRow): boolean {
  return (
    row.releaseType === 'theatrical_wide'
    && !isRerelease(row)
    && row.popularity !== null
    && row.popularity >= WIDE_RELEASE_MIN_TMDB_POPULARITY
  )
}

export function certificationLabel(certification: string | null): string {
  if (certification !== null && certification.trim() !== '') {
    return certification.trim()
  }
  return UNRATED_CERTIFICATION_LABEL
}

function uniqueMovieCount(rows: UpcomingReleaseRow[]): number {
  return new Set(rows.map((row) => row.movieId)).size
}

export function buildOutlookSnapshot(
  rows: UpcomingReleaseRow[],
  asOfDate: string,
): OutlookSnapshot {
  const upcoming = rows.filter((row) => row.releaseDate >= asOfDate)

  const within = (days: number) =>
    upcoming.filter((row) => row.releaseDate <= addDays(asOfDate, days))

  const monthly = new Map<string, Set<number>>()
  const monthlyWide = new Map<string, Set<number>>()
  const monthlyLimited = new Map<string, Set<number>>()
  for (const row of upcoming) {
    const month = row.releaseDate.slice(0, 7)
    const set = monthly.get(month) ?? new Set<number>()
    set.add(row.movieId)
    monthly.set(month, set)
    if (isExpectedWideRelease(row)) {
      const wide = monthlyWide.get(month) ?? new Set<number>()
      wide.add(row.movieId)
      monthlyWide.set(month, wide)
    }
    if (row.releaseType === 'theatrical_limited') {
      const limited = monthlyLimited.get(month) ?? new Set<number>()
      limited.add(row.movieId)
      monthlyLimited.set(month, limited)
    }
  }
  const months = [...monthly.keys()].sort((a, b) => a.localeCompare(b))

  const earliestInWindow = new Map<number, UpcomingReleaseRow>()
  for (const row of within(180)) {
    const existing = earliestInWindow.get(row.movieId)
    if (existing === undefined || row.releaseDate < existing.releaseDate) {
      earliestInWindow.set(row.movieId, row)
    }
  }
  const mixByType = new Map<string, number>()
  const mixByCert = new Map<string, number>()
  for (const row of earliestInWindow.values()) {
    mixByType.set(row.releaseType, (mixByType.get(row.releaseType) ?? 0) + 1)
    const label = certificationLabel(row.certification)
    mixByCert.set(label, (mixByCert.get(label) ?? 0) + 1)
  }
  const byCountDesc = (a: [string, number], b: [string, number]): number =>
    b[1] - a[1] || a[0].localeCompare(b[0])

  const wide = within(90).filter(isExpectedWideRelease)
  const seenWide = new Set<number>()
  const upcomingWideReleases: Array<{ title: string, releaseDate: string }> = []
  for (const row of [...wide].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))) {
    if (seenWide.has(row.movieId)) {
      continue
    }
    seenWide.add(row.movieId)
    upcomingWideReleases.push({ title: row.title, releaseDate: row.releaseDate })
    if (upcomingWideReleases.length >= 8) {
      break
    }
  }

  return {
    asOfDate,
    next30DayCount: uniqueMovieCount(within(30)),
    next90DayCount: uniqueMovieCount(within(90)),
    next180DayCount: uniqueMovieCount(within(180)),
    next90DayWideCount: uniqueMovieCount(wide),
    monthlyCounts: months.map((month) => ({ month, count: monthly.get(month)?.size ?? 0 })),
    monthlySplit: months.map((month) => ({
      month,
      total: monthly.get(month)?.size ?? 0,
      wide: monthlyWide.get(month)?.size ?? 0,
      limited: monthlyLimited.get(month)?.size ?? 0,
    })),
    mixByReleaseType: [...mixByType.entries()]
      .sort(byCountDesc)
      .map(([releaseType, count]) => ({ releaseType, count })),
    mixByCertification: [...mixByCert.entries()]
      .sort(byCountDesc)
      .map(([certification, count]) => ({ certification, count })),
    hasData: upcoming.length > 0,
    upcomingWideReleases,
  }
}

export function buildHistoricalReleaseVolume(
  rows: DistributorTitleRow[],
): Array<{ periodLabel: string, titleCount: number }> {
  const totals = new Map<string, number>()
  for (const row of rows) {
    totals.set(row.periodLabel, (totals.get(row.periodLabel) ?? 0) + row.titleCount)
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodLabel, titleCount]) => ({ periodLabel, titleCount }))
}

export function buildForwardWindowComparison(
  currentCount: number,
  distributorRows: DistributorTitleRow[],
): ForwardWindowComparison {
  const totals = new Map<string, { titleCount: number, isPartial: boolean }>()
  for (const row of distributorRows) {
    const entry = totals.get(row.periodLabel) ?? { titleCount: 0, isPartial: false }
    entry.titleCount += row.titleCount
    entry.isPartial = entry.isPartial || row.isPartial === true
    totals.set(row.periodLabel, entry)
  }
  const completed = [...totals.entries()]
    .filter(([, entry]) => !entry.isPartial)
    .sort(([a], [b]) => a.localeCompare(b))
  const last = completed.at(-1)
  return {
    windowDays: FORWARD_COMPARISON_WINDOW_DAYS,
    currentCount,
    priorYearSameWindowCount: last === undefined ? null : last[1].titleCount / 2,
  }
}
