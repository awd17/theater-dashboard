import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  discoverPageSchema,
  releaseDatesResponseSchema,
} from '../../server/ingest/sources/tmdb/client'
import { extractTheatricalReleases } from '../../server/ingest/sources/tmdb/upcoming'

const releaseDatesFixture = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '../fixtures/tmdb/release-dates-fall-2-deadpoint.json'),
    'utf8',
  ),
)

const discoverFixture = JSON.parse(
  readFileSync(join(import.meta.dirname, '../fixtures/tmdb/discover-page-1.json'), 'utf8'),
)

describe('TMDB response schemas', () => {
  it('parses a discover page', () => {
    const page = discoverPageSchema.parse(discoverFixture)
    expect(page.page).toBe(1)
    expect(page.results.length).toBeGreaterThan(0)
    expect(page.results[0]).toMatchObject({ id: expect.any(Number), title: expect.any(String) })
  })

  it('parses a release dates response', () => {
    const parsed = releaseDatesResponseSchema.parse(releaseDatesFixture)
    expect(parsed.id).toBe(1101412)
    expect(parsed.results.some((entry) => entry.iso_3166_1 === 'US')).toBe(true)
  })
})

describe('extractTheatricalReleases', () => {
  const parsed = releaseDatesResponseSchema.parse(releaseDatesFixture)
  const candidate = {
    tmdbId: 1101412,
    title: 'Fall 2: Deadpoint',
    popularity: 29.36,
    primaryReleaseDate: '2026-09-02',
  }

  it('extracts the US wide theatrical release within the window', () => {
    const releases = extractTheatricalReleases(candidate, parsed, {
      region: 'US',
      fromDate: '2026-08-29',
      toDate: '2027-02-25',
    })

    expect(releases).toEqual([
      {
        tmdbId: 1101412,
        title: 'Fall 2: Deadpoint',
        region: 'US',
        releaseDate: '2026-09-02',
        releaseType: 'theatrical_wide',
        certification: 'PG-13',
        popularity: 29.36,
        primaryReleaseDate: '2026-09-02',
      },
    ])
  })

  it('excludes releases outside the requested window', () => {
    const releases = extractTheatricalReleases(candidate, parsed, {
      region: 'US',
      fromDate: '2026-10-01',
      toDate: '2027-02-25',
    })

    expect(releases).toEqual([])
  })

  it('returns nothing for regions without entries', () => {
    const releases = extractTheatricalReleases(candidate, parsed, {
      region: 'ZZ',
      fromDate: '2026-08-29',
      toDate: '2027-02-25',
    })

    expect(releases).toEqual([])
  })
})
