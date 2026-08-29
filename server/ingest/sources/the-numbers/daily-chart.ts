import { parse as parseHtml } from 'node-html-parser'
import { z } from 'zod'
import {
  extractMovieSlug,
  parseInteger,
  parseMoneyToCents,
  parseRank,
} from './parse-utils'

export const dailyChartRowSchema = z.object({
  rank: z.number().int().positive().nullable(),
  title: z.string().min(1),
  externalId: z.string().min(1),
  moviePath: z.string().min(1),
  grossCents: z.number().int().nullable(),
  theaterCount: z.number().int().nullable(),
  perTheaterAverageCents: z.number().int().nullable(),
  cumulativeGrossCents: z.number().int().nullable(),
  daysInRelease: z.number().int().nullable(),
})

export const dailyChartSchema = z.object({
  observationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(dailyChartRowSchema),
  reportedTotalGrossCents: z.number().int().nullable(),
  reportingMovieCount: z.number().int().nullable(),
})

export type DailyChartRow = z.infer<typeof dailyChartRowSchema>
export type DailyChart = z.infer<typeof dailyChartSchema>

export function parseDailyChartHtml(html: string, observationDate: string): DailyChart {
  const root = parseHtml(html)
  const table = root.querySelector('table.chart-desktop')
  if (!table) {
    throw new Error('Daily chart table.chart-desktop not found')
  }

  const rows: DailyChartRow[] = []
  let reportedTotalGrossCents: number | null = null
  let reportingMovieCount: number | null = null

  for (const tr of table.querySelectorAll('tbody tr, tfoot tr')) {
    const cells = tr.querySelectorAll('td')
    if (cells.length < 3) {
      continue
    }

    const rowText = tr.text.replace(/\s+/g, ' ').trim().toLowerCase()
    if (rowText.includes('total box office') || rowText.includes('reporting movies')) {
      const totalMatch = rowText.match(/reporting movies:\s*(\d+)/i)
      if (totalMatch) {
        reportingMovieCount = Number(totalMatch[1])
      }
      const moneyCell = cells.find((cell) => cell.text.includes('$'))
      if (moneyCell) {
        reportedTotalGrossCents = parseMoneyToCents(moneyCell.text)
      }
      continue
    }

    const titleLink = tr.querySelector('a[href*="/movie/"]')
    if (!titleLink) {
      continue
    }

    const href = titleLink.getAttribute('href') ?? ''
    const externalId = extractMovieSlug(href)
    if (!externalId) {
      continue
    }

    const rank = parseRank(cells[0]?.text ?? '')
    const title = titleLink.text.replace(/\s+/g, ' ').trim()
    const grossCents = parseMoneyToCents(cells[3]?.text ?? '')
    const theaterCount = parseInteger(cells[6]?.text ?? '')
    const perTheaterAverageCents = parseMoneyToCents(cells[7]?.text ?? '')
    const cumulativeGrossCents = parseMoneyToCents(cells[8]?.text ?? '')
    const daysInRelease = parseInteger(cells[9]?.text ?? '')

    rows.push(
      dailyChartRowSchema.parse({
        rank,
        title,
        externalId,
        moviePath: href,
        grossCents,
        theaterCount,
        perTheaterAverageCents,
        cumulativeGrossCents,
        daysInRelease,
      }),
    )
  }

  return dailyChartSchema.parse({
    observationDate,
    rows,
    reportedTotalGrossCents,
    reportingMovieCount,
  })
}
