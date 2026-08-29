import { parse as parseHtml } from 'node-html-parser'
import { z } from 'zod'
import { MARKET_PERIOD_KIND } from './constants'
import { parseInteger, parseMoneyToCents } from './parse-utils'

export const distributorYearSchema = z.object({
  distributor: z.string().min(1),
  boxOfficeCents: z.number().int(),
  ticketsSold: z.number().int().nullable(),
  titleCount: z.number().int().positive(),
})

export const marketYearSchema = z.object({
  year: z.number().int(),
  periodKind: z.literal(MARKET_PERIOD_KIND),
  periodLabel: z.string().min(1),
  boxOfficeCents: z.number().int().nullable(),
  ticketsSold: z.number().int().nullable(),
  averageTicketPriceCents: z.number().int().nullable(),
  movieCount: z.number().int(),
  isPartial: z.boolean(),
  distributors: z.array(distributorYearSchema),
})

export type DistributorYear = z.infer<typeof distributorYearSchema>
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

  interface DistributorTotals {
    boxOfficeCents: number
    ticketsSold: number
    hasTickets: boolean
    titleCount: number
  }
  const byDistributor = new Map<string, DistributorTotals>()

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

    const distributor = cells[cells.length - 4]?.text.replace(/\s+/g, ' ').trim() ?? ''
    if (distributor.length > 0 && gross !== null) {
      const totals = byDistributor.get(distributor) ?? {
        boxOfficeCents: 0,
        ticketsSold: 0,
        hasTickets: false,
        titleCount: 0,
      }
      totals.boxOfficeCents += gross
      totals.titleCount += 1
      if (tickets !== null) {
        totals.ticketsSold += tickets
        totals.hasTickets = true
      }
      byDistributor.set(distributor, totals)
    }
  }

  if (movieCount === 0) {
    throw new Error(`No market year rows parsed for ${year}`)
  }

  const averageTicketPriceCents =
    hasGross && hasTickets && ticketsSold > 0
      ? Math.round(boxOfficeCents / ticketsSold)
      : null

  const distributors = [...byDistributor.entries()]
    .map(([distributor, totals]) => ({
      distributor,
      boxOfficeCents: totals.boxOfficeCents,
      ticketsSold: totals.hasTickets ? totals.ticketsSold : null,
      titleCount: totals.titleCount,
    }))
    .sort((a, b) => b.boxOfficeCents - a.boxOfficeCents)

  return marketYearSchema.parse({
    year,
    periodKind: MARKET_PERIOD_KIND,
    periodLabel: String(year),
    boxOfficeCents: hasGross ? boxOfficeCents : null,
    ticketsSold: hasTickets ? ticketsSold : null,
    averageTicketPriceCents,
    movieCount,
    isPartial: year >= new Date().getUTCFullYear(),
    distributors,
  })
}
