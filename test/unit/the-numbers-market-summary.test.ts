import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMarketYearHtml } from '../../server/ingest/sources/the-numbers/market-summary'

const fixture2019 = readFileSync(
  join(import.meta.dirname, '../fixtures/the-numbers/market-2019-top.html'),
  'utf8',
)

describe('parseMarketYearHtml', () => {
  it('aggregates annual domestic box office and ticket estimates', () => {
    const market = parseMarketYearHtml(fixture2019, 2019)

    expect(market.periodLabel).toBe('2019')
    expect(market.movieCount).toBe(694)
    expect(market.boxOfficeCents).toBe(1_126_425_244_500)
    expect(market.ticketsSold).toBe(1_229_721_892)
    expect(market.averageTicketPriceCents).toBe(916)
    expect(market.isPartial).toBe(false)
  })
})
