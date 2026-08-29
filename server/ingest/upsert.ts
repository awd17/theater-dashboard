import { and, eq } from 'drizzle-orm'
import {
  boxOfficeDaily,
  ingestRun,
  marketPeriod,
  movieExternalIds,
  movies,
} from '../db/schema'
import type { LocalDatabase } from './local-db'
import {
  absoluteTheNumbersUrl,
  DOMESTIC_TERRITORY,
  MARKET_PERIOD_KIND,
  THE_NUMBERS_SOURCE,
  USD,
} from './sources/the-numbers/constants'
import type { DailyChart } from './sources/the-numbers/daily-chart'
import type { MarketYear } from './sources/the-numbers/market-summary'

async function resolveMovieId(
  db: LocalDatabase,
  title: string,
  externalId: string,
  sourceUrl: string,
): Promise<number> {
  const existing = await db
    .select()
    .from(movieExternalIds)
    .where(
      and(
        eq(movieExternalIds.source, THE_NUMBERS_SOURCE),
        eq(movieExternalIds.externalId, externalId),
      ),
    )
    .get()

  if (existing) {
    return existing.movieId
  }

  const inserted = await db
    .insert(movies)
    .values({ canonicalTitle: title })
    .returning({ id: movies.id })
    .get()

  await db.insert(movieExternalIds).values({
    movieId: inserted.id,
    source: THE_NUMBERS_SOURCE,
    externalId,
    sourceUrl,
  })

  return inserted.id
}

export async function upsertDailyChart(
  db: LocalDatabase,
  chart: DailyChart,
  sourceUrl: string,
  retrievedAt: string,
): Promise<number> {
  let rowCount = 0

  for (const row of chart.rows) {
    const movieId = await resolveMovieId(
      db,
      row.title,
      row.externalId,
      absoluteTheNumbersUrl(row.moviePath),
    )

    await db
      .insert(boxOfficeDaily)
      .values({
        movieId,
        source: THE_NUMBERS_SOURCE,
        observationDate: chart.observationDate,
        territory: DOMESTIC_TERRITORY,
        rank: row.rank,
        grossCents: row.grossCents,
        theaterCount: row.theaterCount,
        perTheaterAverageCents: row.perTheaterAverageCents,
        cumulativeGrossCents: row.cumulativeGrossCents,
        daysInRelease: row.daysInRelease,
        sourceUrl,
        retrievedAt,
      })
      .onConflictDoUpdate({
        target: [
          boxOfficeDaily.source,
          boxOfficeDaily.movieId,
          boxOfficeDaily.observationDate,
          boxOfficeDaily.territory,
        ],
        set: {
          rank: row.rank,
          grossCents: row.grossCents,
          theaterCount: row.theaterCount,
          perTheaterAverageCents: row.perTheaterAverageCents,
          cumulativeGrossCents: row.cumulativeGrossCents,
          daysInRelease: row.daysInRelease,
          sourceUrl,
          retrievedAt,
        },
      })

    rowCount += 1
  }

  return rowCount
}

export async function upsertMarketYear(
  db: LocalDatabase,
  year: MarketYear,
  sourceUrl: string,
  retrievedAt: string,
): Promise<number> {
  await db
    .insert(marketPeriod)
    .values({
      source: THE_NUMBERS_SOURCE,
      periodKind: MARKET_PERIOD_KIND,
      periodLabel: year.periodLabel,
      periodStart: null,
      periodEnd: null,
      geography: DOMESTIC_TERRITORY,
      currency: USD,
      boxOfficeCents: year.boxOfficeCents,
      ticketsSold: year.ticketsSold,
      averageTicketPriceCents: year.averageTicketPriceCents,
      isPartial: year.isPartial,
      sourceUrl,
      retrievedAt,
    })
    .onConflictDoUpdate({
      target: [
        marketPeriod.source,
        marketPeriod.periodKind,
        marketPeriod.periodLabel,
        marketPeriod.geography,
      ],
      set: {
        boxOfficeCents: year.boxOfficeCents,
        ticketsSold: year.ticketsSold,
        averageTicketPriceCents: year.averageTicketPriceCents,
        isPartial: year.isPartial,
        sourceUrl,
        retrievedAt,
      },
    })

  return 1
}

export async function startIngestRun(
  db: LocalDatabase,
  source: string,
  meta: Record<string, unknown>,
): Promise<number> {
  const startedAt = new Date().toISOString()
  const row = await db
    .insert(ingestRun)
    .values({
      source,
      status: 'running',
      startedAt,
      metaJson: JSON.stringify(meta),
    })
    .returning({ id: ingestRun.id })
    .get()

  return row.id
}

export async function finishIngestRun(
  db: LocalDatabase,
  id: number,
  status: 'completed' | 'failed',
  urlCount: number,
  rowCount: number,
  errorMessage?: string,
): Promise<void> {
  await db
    .update(ingestRun)
    .set({
      status,
      finishedAt: new Date().toISOString(),
      urlCount,
      rowCount,
      errorMessage: errorMessage ?? null,
    })
    .where(eq(ingestRun.id, id))
}
