import { describe, expect, it } from 'vitest'
import {
  buildOutlookSnapshot,
  isExpectedWideRelease,
  isRerelease,
  type UpcomingReleaseRow,
} from '../../server/ingest/outlook-metrics'

function row(overrides: Partial<UpcomingReleaseRow> & Pick<UpcomingReleaseRow, 'movieId' | 'title' | 'releaseDate'>): UpcomingReleaseRow {
  return {
    releaseType: 'theatrical_wide',
    popularity: 20,
    primaryReleaseDate: overrides.releaseDate,
    ...overrides,
  }
}

const rows: UpcomingReleaseRow[] = [
  row({ movieId: 1, title: 'Wide Soon', releaseDate: '2026-09-05' }),
  row({ movieId: 2, title: 'Limited Soon', releaseDate: '2026-09-10', releaseType: 'theatrical_limited' }),
  row({ movieId: 2, title: 'Limited Soon', releaseDate: '2026-09-24', primaryReleaseDate: '2026-09-10' }),
  row({ movieId: 3, title: 'Fall Tentpole', releaseDate: '2026-11-20' }),
  row({ movieId: 4, title: 'Winter Release', releaseDate: '2027-02-12' }),
  row({ movieId: 5, title: 'Already Out', releaseDate: '2026-08-01' }),
  row({ movieId: 6, title: 'Classic Re-Release', releaseDate: '2026-09-12', primaryReleaseDate: '2006-06-09', popularity: 22 }),
  row({ movieId: 7, title: 'Event Cinema One-Nighter', releaseDate: '2026-09-15', popularity: 0.4 }),
]

describe('isRerelease', () => {
  it('flags releases more than a year after the primary release', () => {
    expect(isRerelease(row({ movieId: 6, title: 'Old', releaseDate: '2026-09-12', primaryReleaseDate: '2006-06-09' }))).toBe(true)
  })

  it('accepts limited-to-wide expansions within a year', () => {
    expect(isRerelease(row({ movieId: 2, title: 'New', releaseDate: '2026-09-24', primaryReleaseDate: '2026-09-10' }))).toBe(false)
  })

  it('treats unknown primary dates as not re-releases', () => {
    expect(isRerelease(row({ movieId: 8, title: 'Unknown', releaseDate: '2026-09-12', primaryReleaseDate: null }))).toBe(false)
  })
})

describe('isExpectedWideRelease', () => {
  it('requires the wide tag, a fresh release, and minimum popularity', () => {
    expect(isExpectedWideRelease(row({ movieId: 1, title: 'A', releaseDate: '2026-09-05' }))).toBe(true)
    expect(isExpectedWideRelease(row({ movieId: 2, title: 'B', releaseDate: '2026-09-05', releaseType: 'theatrical_limited' }))).toBe(false)
    expect(isExpectedWideRelease(row({ movieId: 6, title: 'C', releaseDate: '2026-09-12', primaryReleaseDate: '2006-06-09' }))).toBe(false)
    expect(isExpectedWideRelease(row({ movieId: 7, title: 'D', releaseDate: '2026-09-15', popularity: 0.4 }))).toBe(false)
    expect(isExpectedWideRelease(row({ movieId: 9, title: 'E', releaseDate: '2026-09-15', popularity: null }))).toBe(false)
  })
})

describe('buildOutlookSnapshot', () => {
  const snapshot = buildOutlookSnapshot(rows, '2026-08-29')

  it('counts unique movies inside each forward window', () => {
    expect(snapshot.next30DayCount).toBe(4)
    expect(snapshot.next90DayCount).toBe(5)
    expect(snapshot.next180DayCount).toBe(6)
  })

  it('excludes past releases entirely', () => {
    expect(snapshot.monthlyCounts.find((entry) => entry.month === '2026-08')).toBeUndefined()
  })

  it('filters wide counts to expected wide releases only', () => {
    expect(snapshot.next90DayWideCount).toBe(3)
  })

  it('groups unique movies by month', () => {
    expect(snapshot.monthlyCounts).toEqual([
      { month: '2026-09', count: 4 },
      { month: '2026-11', count: 1 },
      { month: '2027-02', count: 1 },
    ])
  })

  it('lists expected wide releases in date order without duplicates or junk', () => {
    expect(snapshot.upcomingWideReleases).toEqual([
      { title: 'Wide Soon', releaseDate: '2026-09-05' },
      { title: 'Limited Soon', releaseDate: '2026-09-24' },
      { title: 'Fall Tentpole', releaseDate: '2026-11-20' },
    ])
  })
})
