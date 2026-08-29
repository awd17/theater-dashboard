import { openLocalDatabase } from './local-db'
import { TMDB_SOURCE, TmdbClient } from './sources/tmdb/client'
import {
  extractTheatricalReleases,
  type TheatricalCandidate,
} from './sources/tmdb/upcoming'
import { finishIngestRun, startIngestRun, upsertUpcomingReleases } from './upsert'

interface CliArgs {
  region: string
  days: number
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { region: 'US', days: 180 }

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]

    if (flag === '--region' && value) {
      args.region = value.toUpperCase()
      i += 1
      continue
    }
    if (flag === '--days' && value) {
      const days = Number(value)
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        throw new Error(`Invalid --days value: ${value}`)
      }
      args.days = days
      i += 1
      continue
    }
    if (flag === '--help' || flag === '-h') {
      console.log(`Usage:
  bun run ingest:tmdb [--region US] [--days 180]
`)
      process.exit(0)
    }

    throw new Error(`Unknown argument: ${flag}`)
  }

  return args
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    throw new Error('TMDB_API_KEY is not set')
  }

  const fromDate = isoDate(new Date())
  const to = new Date()
  to.setUTCDate(to.getUTCDate() + args.days)
  const toDate = isoDate(to)

  const db = openLocalDatabase()
  const runId = await startIngestRun(db, TMDB_SOURCE, { ...args, fromDate, toDate })
  const client = new TmdbClient({ apiKey })

  let urlCount = 0
  let rowCount = 0

  try {
    const candidates = new Map<number, TheatricalCandidate>()
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const discover = await client.discoverTheatrical({
        region: args.region,
        fromDate,
        toDate,
        page,
      })
      urlCount += 1
      totalPages = Math.min(discover.total_pages, 25)

      for (const result of discover.results) {
        candidates.set(result.id, {
          tmdbId: result.id,
          title: result.title,
          popularity: result.popularity ?? null,
          primaryReleaseDate: result.release_date?.match(/^\d{4}-\d{2}-\d{2}$/)
            ? result.release_date
            : null,
        })
      }
      page += 1
    }

    console.log(`discover: ${candidates.size} candidates ${fromDate} → ${toDate} (${args.region})`)

    const retrievedAt = new Date().toISOString()
    let confirmedMovies = 0

    for (const candidate of candidates.values()) {
      const releaseDates = await client.movieReleaseDates(candidate.tmdbId)
      urlCount += 1

      const releases = extractTheatricalReleases(candidate, releaseDates, {
        region: args.region,
        fromDate,
        toDate,
      })

      if (releases.length === 0) {
        continue
      }

      confirmedMovies += 1
      rowCount += await upsertUpcomingReleases(db, releases, retrievedAt)
    }

    await finishIngestRun(db, runId, 'completed', urlCount, rowCount)
    console.log(
      `Done. candidates=${candidates.size} confirmed=${confirmedMovies} releases=${rowCount} requests=${urlCount}`,
    )
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await finishIngestRun(db, runId, 'failed', urlCount, rowCount, message)
    console.error(message)
    process.exitCode = 1
  }
}

main()
