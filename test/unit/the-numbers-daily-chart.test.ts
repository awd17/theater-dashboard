import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDailyChartHtml } from '../../server/ingest/sources/the-numbers/daily-chart'
import {
  extractMovieSlug,
  parseInteger,
  parseMoneyToCents,
  parseRank,
} from '../../server/ingest/sources/the-numbers/parse-utils'

const fixture = readFileSync(
  join(import.meta.dirname, '../fixtures/the-numbers/daily-2026-08-26.html'),
  'utf8',
)

describe('parseMoneyToCents', () => {
  it('parses currency strings into integer cents', () => {
    expect(parseMoneyToCents('$3,147,879')).toBe(314_787_900)
    expect(parseMoneyToCents('$786')).toBe(78_600)
  })

  it('returns null for missing markers', () => {
    expect(parseMoneyToCents('–')).toBeNull()
    expect(parseMoneyToCents('-')).toBeNull()
    expect(parseMoneyToCents('')).toBeNull()
  })
})

describe('parseRank and parseInteger', () => {
  it('treats dash ranks as missing', () => {
    expect(parseRank('-')).toBeNull()
    expect(parseRank('1')).toBe(1)
  })

  it('parses theater counts and leaves blanks missing', () => {
    expect(parseInteger('4,006')).toBe(4_006)
    expect(parseInteger('')).toBeNull()
    expect(parseInteger('0')).toBe(0)
  })
})

describe('extractMovieSlug', () => {
  it('extracts the Numbers movie slug', () => {
    expect(extractMovieSlug('/movie/Spider-Man-Brand-New-Day-(2026)')).toBe(
      'Spider-Man-Brand-New-Day-(2026)',
    )
  })
})

describe('parseDailyChartHtml', () => {
  it('parses ranked rows and the reported industry total', () => {
    const chart = parseDailyChartHtml(fixture, '2026-08-26')

    expect(chart.observationDate).toBe('2026-08-26')
    expect(chart.rows).toHaveLength(32)
    expect(chart.reportingMovieCount).toBe(32)
    expect(chart.reportedTotalGrossCents).toBe(1_106_160_400)

    expect(chart.rows[0]).toMatchObject({
      rank: 1,
      title: 'Spider-Man: Brand New Day',
      externalId: 'Spider-Man-Brand-New-Day-(2026)',
      grossCents: 314_787_900,
      theaterCount: 4_006,
      daysInRelease: 27,
    })

    const unranked = chart.rows.find((row) => row.title === 'The End of Oak Street')
    expect(unranked?.rank).toBeNull()
    expect(unranked?.grossCents).toBe(76_518_600)
  })
})
