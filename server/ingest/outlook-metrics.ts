export const WIDE_RELEASE_MIN_TMDB_POPULARITY = 4
export const RERELEASE_MIN_AGE_DAYS = 365

export interface UpcomingReleaseRow {
  movieId: number
  title: string
  releaseDate: string
  releaseType: string
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
  upcomingWideReleases: Array<{ title: string, releaseDate: string }>
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
  for (const row of upcoming) {
    const month = row.releaseDate.slice(0, 7)
    const set = monthly.get(month) ?? new Set<number>()
    set.add(row.movieId)
    monthly.set(month, set)
  }

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
    monthlyCounts: [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, set]) => ({ month, count: set.size })),
    upcomingWideReleases,
  }
}
