import { dailyChartUrl, marketYearUrl, THE_NUMBERS_SOURCE } from './sources/the-numbers/constants'
import { parseDailyChartHtml } from './sources/the-numbers/daily-chart'
import { parseMarketYearHtml } from './sources/the-numbers/market-summary'
import { fetchHtml, PageNotFoundError } from './http'
import { openLocalDatabase } from './local-db'
import {
  finishIngestRun,
  startIngestRun,
  upsertDailyChart,
  upsertMarketYear,
  upsertMarketYearDistributors,
} from './upsert'

interface CliArgs {
  dailyFrom: string | null
  dailyTo: string | null
  marketYears: number[] | null
  forceRefresh: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dailyFrom: null,
    dailyTo: null,
    marketYears: null,
    forceRefresh: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]

    if (flag === '--daily-from' && value) {
      args.dailyFrom = value
      i += 1
      continue
    }
    if (flag === '--daily-to' && value) {
      args.dailyTo = value
      i += 1
      continue
    }
    if (flag === '--market-years' && value) {
      const [startRaw, endRaw] = value.split('-')
      const start = Number(startRaw)
      const end = Number(endRaw ?? startRaw)
      if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
        throw new Error(`Invalid --market-years value: ${value}`)
      }
      args.marketYears = []
      for (let year = start; year <= end; year += 1) {
        args.marketYears.push(year)
      }
      i += 1
      continue
    }
    if (flag === '--force-refresh') {
      args.forceRefresh = true
      continue
    }
    if (flag === '--help' || flag === '-h') {
      printHelp()
      process.exit(0)
    }

    throw new Error(`Unknown argument: ${flag}`)
  }

  if (!args.dailyFrom && !args.marketYears) {
    throw new Error('Provide --daily-from/--daily-to and/or --market-years')
  }
  if ((args.dailyFrom && !args.dailyTo) || (!args.dailyFrom && args.dailyTo)) {
    throw new Error('Both --daily-from and --daily-to are required together')
  }

  return args
}

function printHelp(): void {
  console.log(`Usage:
  bun run ingest:the-numbers --daily-from YYYY-MM-DD --daily-to YYYY-MM-DD
  bun run ingest:the-numbers --market-years 2015-2025
  bun run ingest:the-numbers --daily-from YYYY-MM-DD --daily-to YYYY-MM-DD --market-years 2019-2025

Options:
  --force-refresh   Bypass local HTML cache
`)
}

function eachDateInclusive(from: string, to: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T00:00:00.000Z`)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) {
    throw new Error(`Invalid date range: ${from} → ${to}`)
  }

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const db = openLocalDatabase()
  const runId = await startIngestRun(db, THE_NUMBERS_SOURCE, { ...args })

  let urlCount = 0
  let rowCount = 0

  try {
    if (args.dailyFrom && args.dailyTo) {
      const dates = eachDateInclusive(args.dailyFrom, args.dailyTo)
      for (const date of dates) {
        const url = dailyChartUrl(date)
        let page
        try {
          page = await fetchHtml(url, { forceRefresh: args.forceRefresh })
        }
        catch (error) {
          if (error instanceof PageNotFoundError) {
            console.log(`daily ${date}: not published yet, skipping`)
            continue
          }
          throw error
        }
        urlCount += 1
        const chart = parseDailyChartHtml(page.html, date)
        rowCount += await upsertDailyChart(db, chart, page.url, page.retrievedAt)
        console.log(
          `daily ${date}: ${chart.rows.length} rows via ${page.via}`
          + (chart.reportedTotalGrossCents !== null
            ? ` (reported total $${(chart.reportedTotalGrossCents / 100).toLocaleString('en-US')})`
            : ''),
        )
      }
    }

    if (args.marketYears) {
      for (const year of args.marketYears) {
        const url = marketYearUrl(year)
        const page = await fetchHtml(url, { forceRefresh: args.forceRefresh })
        urlCount += 1
        const market = parseMarketYearHtml(page.html, year)
        rowCount += await upsertMarketYear(db, market, page.url, page.retrievedAt)
        rowCount += await upsertMarketYearDistributors(db, market, page.url, page.retrievedAt)
        console.log(
          `market ${year}: ${market.movieCount} titles, ${market.distributors.length} distributors`
          + (market.boxOfficeCents !== null
            ? `, $${(market.boxOfficeCents / 100).toLocaleString('en-US')}`
            : '')
          + ` via ${page.via}`,
        )
      }
    }

    await finishIngestRun(db, runId, 'completed', urlCount, rowCount)
    console.log(`Done. urls=${urlCount} rows=${rowCount}`)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await finishIngestRun(db, runId, 'failed', urlCount, rowCount, message)
    console.error(message)
    process.exitCode = 1
  }
}

main()
