import { parse as parseHtml } from 'node-html-parser'
import { z } from 'zod'
import { MARKET_PERIOD_KIND } from './constants'
import { parseInteger, parseMoneyToCents } from './parse-utils'

export const marketYearSchema = z.object({
  year: z.number().int(),
  periodKind: z.literal(MARKET_PERIOD_KIND),
  periodLabel: z.string().min(1),
  boxOfficeCents: z.number().int().nullable(),
  ticketsSold: z.number().int().nullable(),
  averageTicketPriceCents: z.number().int().nullable(),
  movieCount: z.number().int(),
  isPartial: z.boolean(),
})

export type MarketYear = z.infer<typeof marketYearSchema>

export function parseMarketYearHtml(html: string, year: number): MarketYear {
  const root = parseHtml(html)
  const table = root.querySelector('#page_filling_chart table') ?? root.querySelector('table')
  if (!table) {
    throw new Error(`Market year table not found for ${year}`)
  }

  let boxOfficeCents = 0
  let ticketsSold = 0
  let movieCount = 0
  let hasGross = false
  let hasTickets = false

  for (const tr of table.querySelectorAll('tbody tr')) {
    const cells = tr.querySelectorAll('td')
    if (cells.length < 6) {
      continue
    }

    const grossCell = cells[cells.length - 2]
    const ticketsCell = cells[cells.length - 1]
    const gross = parseMoneyToCents(grossCell?.text ?? '')
    const tickets = parseInteger(ticketsCell?.text ?? '')

    if (gross === null && tickets === null) {
      continue
    }

    movieCount += 1
    if (gross !== null) {
      boxOfficeCents += gross
      hasGross = true
    }
    if (tickets !== null) {
      ticketsSold += tickets
      hasTickets = true
    }
  }

  if (movieCount === 0) {
    throw new Error(`No market year rows parsed for ${year}`)
  }

  const averageTicketPriceCents =
    hasGross && hasTickets && ticketsSold > 0
      ? Math.round(boxOfficeCents / ticketsSold)
      : null

  return marketYearSchema.parse({
    year,
    periodKind: MARKET_PERIOD_KIND,
    periodLabel: String(year),
    boxOfficeCents: hasGross ? boxOfficeCents : null,
    ticketsSold: hasTickets ? ticketsSold : null,
    averageTicketPriceCents,
    movieCount,
    isPartial: year >= new Date().getUTCFullYear(),
  })
}
