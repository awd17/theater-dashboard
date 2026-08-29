import { and, eq, like } from 'drizzle-orm'
import {
  boxOfficeDaily,
  companies,
  companyFacts,
  ingestRun,
  marketDistributorYear,
  marketPeriod,
  movieExternalIds,
  movies,
  upcomingReleases,
} from '../db/schema'
import { firstRow, type IngestDatabase } from './db-helpers'
import {
  absoluteTheNumbersUrl,
  DOMESTIC_TERRITORY,
  MARKET_PERIOD_KIND,
  THE_NUMBERS_SOURCE,
  USD,
} from './sources/the-numbers/constants'
import type { DailyChart } from './sources/the-numbers/daily-chart'
import type { MarketYear } from './sources/the-numbers/market-summary'
import { TMDB_SOURCE, tmdbMovieUrl } from './sources/tmdb/client'
import type { UpcomingTheatricalRelease } from './sources/tmdb/upcoming'

async function resolveMovieIdBySource(
  db: IngestDatabase,
  source: string,
  title: string,
  externalId: string,
  sourceUrl: string,
): Promise<number> {
  const existing = await firstRow(
    db
      .select()
      .from(movieExternalIds)
      .where(
        and(
          eq(movieExternalIds.source, source),
          eq(movieExternalIds.externalId, externalId),
        ),
      ),
  )

  if (existing) {
    return existing.movieId
  }

  const inserted = await firstRow(
    db
      .insert(movies)
      .values({ canonicalTitle: title })
      .returning({ id: movies.id }),
  )

  if (!inserted) {
    throw new Error(`Failed to insert movie for ${source}:${externalId}`)
  }

  await db.insert(movieExternalIds).values({
    movieId: inserted.id,
    source,
    externalId,
    sourceUrl,
  })

  return inserted.id
}

function resolveMovieId(
  db: IngestDatabase,
  title: string,
  externalId: string,
  sourceUrl: string,
): Promise<number> {
  return resolveMovieIdBySource(db, THE_NUMBERS_SOURCE, title, externalId, sourceUrl)
}

export async function upsertDailyChart(
  db: IngestDatabase,
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
  db: IngestDatabase,
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

export async function upsertMarketYearDistributors(
  db: IngestDatabase,
  year: MarketYear,
  sourceUrl: string,
  retrievedAt: string,
): Promise<number> {
  let rowCount = 0

  for (const entry of year.distributors) {
    await db
      .insert(marketDistributorYear)
      .values({
        source: THE_NUMBERS_SOURCE,
        periodLabel: year.periodLabel,
        geography: DOMESTIC_TERRITORY,
        distributor: entry.distributor,
        boxOfficeCents: entry.boxOfficeCents,
        ticketsSold: entry.ticketsSold,
        titleCount: entry.titleCount,
        isPartial: year.isPartial,
        sourceUrl,
        retrievedAt,
      })
      .onConflictDoUpdate({
        target: [
          marketDistributorYear.source,
          marketDistributorYear.periodLabel,
          marketDistributorYear.geography,
          marketDistributorYear.distributor,
        ],
        set: {
          boxOfficeCents: entry.boxOfficeCents,
          ticketsSold: entry.ticketsSold,
          titleCount: entry.titleCount,
          isPartial: year.isPartial,
          sourceUrl,
          retrievedAt,
        },
      })

    rowCount += 1
  }

  return rowCount
}

export async function upsertUpcomingReleases(
  db: IngestDatabase,
  releases: UpcomingTheatricalRelease[],
  retrievedAt: string,
): Promise<number> {
  let rowCount = 0

  for (const release of releases) {
    const sourceUrl = tmdbMovieUrl(release.tmdbId)
    const movieId = await resolveMovieIdBySource(
      db,
      TMDB_SOURCE,
      release.title,
      String(release.tmdbId),
      sourceUrl,
    )

    await db
      .insert(upcomingReleases)
      .values({
        movieId,
        source: TMDB_SOURCE,
        region: release.region,
        releaseDate: release.releaseDate,
        releaseType: release.releaseType,
        certification: release.certification,
        popularity: release.popularity,
        primaryReleaseDate: release.primaryReleaseDate,
        sourceUrl,
        retrievedAt,
      })
      .onConflictDoUpdate({
        target: [
          upcomingReleases.source,
          upcomingReleases.movieId,
          upcomingReleases.region,
          upcomingReleases.releaseDate,
          upcomingReleases.releaseType,
        ],
        set: {
          certification: release.certification,
          popularity: release.popularity,
          primaryReleaseDate: release.primaryReleaseDate,
          sourceUrl,
          retrievedAt,
        },
      })

    rowCount += 1
  }

  return rowCount
}

export async function resolveCompanyId(
  db: IngestDatabase,
  company: { ticker: string, name: string, cik: string },
): Promise<number> {
  const existing = await firstRow(
    db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.ticker, company.ticker)),
  )

  if (existing) {
    return existing.id
  }

  const inserted = await firstRow(
    db
      .insert(companies)
      .values(company)
      .returning({ id: companies.id }),
  )

  if (!inserted) {
    throw new Error(`Failed to insert company ${company.ticker}`)
  }

  return inserted.id
}

export async function upsertCompanyFacts(
  db: IngestDatabase,
  companyId: number,
  facts: Array<{
    metric: string
    concept: string
    unit: string
    periodStart: string
    periodEnd: string
    value: number
    fiscalYear: number | null
    fiscalPeriod: string | null
    form: string
    filedDate: string
    accession: string
  }>,
  sourceUrl: string,
  retrievedAt: string,
): Promise<number> {
  let rowCount = 0

  for (const fact of facts) {
    await db
      .insert(companyFacts)
      .values({ ...fact, companyId, sourceUrl, retrievedAt })
      .onConflictDoUpdate({
        target: [
          companyFacts.companyId,
          companyFacts.concept,
          companyFacts.unit,
          companyFacts.periodStart,
          companyFacts.periodEnd,
          companyFacts.accession,
        ],
        set: {
          value: fact.value,
          fiscalYear: fact.fiscalYear,
          fiscalPeriod: fact.fiscalPeriod,
          form: fact.form,
          filedDate: fact.filedDate,
          sourceUrl,
          retrievedAt,
        },
      })
    rowCount += 1
  }

  return rowCount
}

export async function deleteFilingTextFacts(
  db: IngestDatabase,
  companyId: number,
  accession: string,
): Promise<void> {
  await db
    .delete(companyFacts)
    .where(
      and(
        eq(companyFacts.companyId, companyId),
        eq(companyFacts.accession, accession),
        like(companyFacts.concept, 'filing_text:%'),
      ),
    )
}

export async function startIngestRun(
  db: IngestDatabase,
  source: string,
  meta: Record<string, unknown>,
): Promise<number> {
  const startedAt = new Date().toISOString()
  const row = await firstRow(
    db
      .insert(ingestRun)
      .values({
        source,
        status: 'running',
        startedAt,
        metaJson: JSON.stringify(meta),
      })
      .returning({ id: ingestRun.id }),
  )

  if (!row) {
    throw new Error(`Failed to start ingest run for ${source}`)
  }

  return row.id
}

export async function finishIngestRun(
  db: IngestDatabase,
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

export async function hasActiveIngestRun(
  db: IngestDatabase,
  source: string,
): Promise<boolean> {
  const active = await firstRow(
    db
      .select({ id: ingestRun.id })
      .from(ingestRun)
      .where(and(eq(ingestRun.source, source), eq(ingestRun.status, 'running'))),
  )

  return active !== undefined
}
