import { describe, expect, it } from 'vitest'
import {
  buildForwardWindowComparison,
  buildHistoricalReleaseVolume,
  buildOutlookSnapshot,
  isExpectedWideRelease,
  isRerelease,
  type DistributorTitleRow,
  type UpcomingReleaseRow,
} from '../../server/ingest/outlook-metrics'

function row(overrides: Partial<UpcomingReleaseRow> & Pick<UpcomingReleaseRow, 'movieId' | 'title' | 'releaseDate'>): UpcomingReleaseRow {
  return {
    releaseType: 'theatrical_wide',
    certification: null,
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

describe('monthlySplit', () => {
  const snapshot = buildOutlookSnapshot(rows, '2026-08-29')

  it('splits each month into expected-wide versus limited with totals intact', () => {
    expect(snapshot.monthlySplit).toEqual([
      { month: '2026-09', total: 4, wide: 2, limited: 1 },
      { month: '2026-11', total: 1, wide: 1, limited: 0 },
      { month: '2027-02', total: 1, wide: 1, limited: 0 },
    ])
  })

  it('keeps monthlyCounts aligned with the split totals', () => {
    expect(snapshot.monthlySplit.map((entry) => ({ month: entry.month, count: entry.total })))
      .toEqual(snapshot.monthlyCounts)
  })
})

describe('supply mix', () => {
  const snapshot = buildOutlookSnapshot(rows, '2026-08-29')

  it('counts each movie once by release type using its earliest window date', () => {
    expect(snapshot.mixByReleaseType).toEqual([
      { releaseType: 'theatrical_wide', count: 5 },
      { releaseType: 'theatrical_limited', count: 1 },
    ])
  })

  it('labels missing certifications as Unrated/NA', () => {
    expect(snapshot.mixByCertification).toEqual([
      { certification: 'Unrated/NA', count: 6 },
    ])
  })

  it('groups certifications and treats blank values as unrated', () => {
    const mixed = buildOutlookSnapshot(
      [
        row({ movieId: 10, title: 'Rated A', releaseDate: '2026-09-05', certification: 'PG-13' }),
        row({ movieId: 11, title: 'Blank Cert', releaseDate: '2026-09-06', certification: '  ' }),
        row({ movieId: 12, title: 'Missing Cert', releaseDate: '2026-09-07', certification: null }),
        row({ movieId: 13, title: 'Rated B', releaseDate: '2026-11-01', certification: 'R' }),
      ],
      '2026-08-29',
    )
    expect(mixed.mixByCertification).toEqual([
      { certification: 'Unrated/NA', count: 2 },
      { certification: 'PG-13', count: 1 },
      { certification: 'R', count: 1 },
    ])
  })
})

describe('hasData', () => {
  it('is true when upcoming rows back the snapshot', () => {
    expect(buildOutlookSnapshot(rows, '2026-08-29').hasData).toBe(true)
  })

  it('stays false with honest zeros when nothing was ingested', () => {
    const empty = buildOutlookSnapshot([], '2026-08-29')
    expect(empty.hasData).toBe(false)
    expect(empty.next30DayCount).toBe(0)
    expect(empty.next90DayCount).toBe(0)
    expect(empty.next180DayCount).toBe(0)
    expect(empty.next90DayWideCount).toBe(0)
    expect(empty.monthlyCounts).toEqual([])
    expect(empty.monthlySplit).toEqual([])
    expect(empty.mixByReleaseType).toEqual([])
    expect(empty.mixByCertification).toEqual([])
  })
})

describe('buildHistoricalReleaseVolume', () => {
  it('sums distributor title counts per year in label order', () => {
    const volume = buildHistoricalReleaseVolume([
      { periodLabel: '2024', titleCount: 300, isPartial: false },
      { periodLabel: '2024', titleCount: 200, isPartial: false },
      { periodLabel: '2023', titleCount: 400, isPartial: false },
    ])
    expect(volume).toEqual([
      { periodLabel: '2023', titleCount: 400 },
      { periodLabel: '2024', titleCount: 500 },
    ])
  })
})

describe('buildForwardWindowComparison', () => {
  const history: DistributorTitleRow[] = [
    { periodLabel: '2024', titleCount: 500, isPartial: false },
    { periodLabel: '2025', titleCount: 100, isPartial: true },
  ]

  it('pro-rates the most recent completed year to a half-year pace', () => {
    expect(buildForwardWindowComparison(120, history)).toEqual({
      windowDays: 180,
      currentCount: 120,
      priorYearSameWindowCount: 250,
    })
  })

  it('returns a null pace when history is absent', () => {
    expect(buildForwardWindowComparison(120, [])).toEqual({
      windowDays: 180,
      currentCount: 120,
      priorYearSameWindowCount: null,
    })
  })
})
