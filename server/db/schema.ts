import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const movies = sqliteTable('movies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  canonicalTitle: text('canonical_title').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const movieExternalIds = sqliteTable(
  'movie_external_ids',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    movieId: integer('movie_id')
      .notNull()
      .references(() => movies.id),
    source: text('source').notNull(),
    externalId: text('external_id').notNull(),
    sourceUrl: text('source_url'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('movie_external_ids_source_external_id_uidx').on(
      table.source,
      table.externalId,
    ),
    index('movie_external_ids_movie_id_idx').on(table.movieId),
  ],
)

export const boxOfficeDaily = sqliteTable(
  'box_office_daily',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    movieId: integer('movie_id')
      .notNull()
      .references(() => movies.id),
    source: text('source').notNull(),
    observationDate: text('observation_date').notNull(),
    territory: text('territory').notNull(),
    rank: integer('rank'),
    grossCents: integer('gross_cents'),
    theaterCount: integer('theater_count'),
    perTheaterAverageCents: integer('per_theater_average_cents'),
    cumulativeGrossCents: integer('cumulative_gross_cents'),
    daysInRelease: integer('days_in_release'),
    sourceUrl: text('source_url').notNull(),
    retrievedAt: text('retrieved_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('box_office_daily_source_movie_date_territory_uidx').on(
      table.source,
      table.movieId,
      table.observationDate,
      table.territory,
    ),
    index('box_office_daily_observation_date_idx').on(table.observationDate),
    index('box_office_daily_movie_id_idx').on(table.movieId),
  ],
)

export const marketPeriod = sqliteTable(
  'market_period',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    source: text('source').notNull(),
    periodKind: text('period_kind').notNull(),
    periodLabel: text('period_label').notNull(),
    periodStart: text('period_start'),
    periodEnd: text('period_end'),
    geography: text('geography').notNull(),
    currency: text('currency').notNull(),
    boxOfficeCents: integer('box_office_cents'),
    ticketsSold: integer('tickets_sold'),
    averageTicketPriceCents: integer('average_ticket_price_cents'),
    isPartial: integer('is_partial', { mode: 'boolean' }),
    sourceUrl: text('source_url').notNull(),
    retrievedAt: text('retrieved_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('market_period_source_kind_label_geography_uidx').on(
      table.source,
      table.periodKind,
      table.periodLabel,
      table.geography,
    ),
  ],
)

export const marketDistributorYear = sqliteTable(
  'market_distributor_year',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    source: text('source').notNull(),
    periodLabel: text('period_label').notNull(),
    geography: text('geography').notNull(),
    distributor: text('distributor').notNull(),
    boxOfficeCents: integer('box_office_cents').notNull(),
    ticketsSold: integer('tickets_sold'),
    titleCount: integer('title_count').notNull(),
    isPartial: integer('is_partial', { mode: 'boolean' }),
    sourceUrl: text('source_url').notNull(),
    retrievedAt: text('retrieved_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('market_distributor_year_source_label_geo_distributor_uidx').on(
      table.source,
      table.periodLabel,
      table.geography,
      table.distributor,
    ),
    index('market_distributor_year_period_label_idx').on(table.periodLabel),
  ],
)

export const upcomingReleases = sqliteTable(
  'upcoming_releases',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    movieId: integer('movie_id')
      .notNull()
      .references(() => movies.id),
    source: text('source').notNull(),
    region: text('region').notNull(),
    releaseDate: text('release_date').notNull(),
    releaseType: text('release_type').notNull(),
    certification: text('certification'),
    popularity: real('popularity'),
    primaryReleaseDate: text('primary_release_date'),
    sourceUrl: text('source_url').notNull(),
    retrievedAt: text('retrieved_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('upcoming_releases_source_movie_region_date_type_uidx').on(
      table.source,
      table.movieId,
      table.region,
      table.releaseDate,
      table.releaseType,
    ),
    index('upcoming_releases_release_date_idx').on(table.releaseDate),
  ],
)

export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticker: text('ticker').notNull().unique(),
  name: text('name').notNull(),
  cik: text('cik').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const companyFacts = sqliteTable(
  'company_facts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    metric: text('metric').notNull(),
    concept: text('concept').notNull(),
    unit: text('unit').notNull(),
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    value: integer('value').notNull(),
    fiscalYear: integer('fiscal_year'),
    fiscalPeriod: text('fiscal_period'),
    form: text('form').notNull(),
    filedDate: text('filed_date').notNull(),
    accession: text('accession').notNull(),
    sourceUrl: text('source_url').notNull(),
    retrievedAt: text('retrieved_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('company_facts_concept_period_accession_uidx').on(
      table.companyId,
      table.concept,
      table.unit,
      table.periodStart,
      table.periodEnd,
      table.accession,
    ),
    index('company_facts_company_metric_period_end_idx').on(
      table.companyId,
      table.metric,
      table.periodEnd,
    ),
  ],
)

export const ingestRun = sqliteTable('ingest_run', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(),
  status: text('status').notNull(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  urlCount: integer('url_count').notNull().default(0),
  rowCount: integer('row_count').notNull().default(0),
  errorMessage: text('error_message'),
  metaJson: text('meta_json'),
})

export type Movie = typeof movies.$inferSelect
export type MovieExternalId = typeof movieExternalIds.$inferSelect
export type BoxOfficeDaily = typeof boxOfficeDaily.$inferSelect
export type MarketPeriod = typeof marketPeriod.$inferSelect
export type MarketDistributorYear = typeof marketDistributorYear.$inferSelect
export type UpcomingRelease = typeof upcomingReleases.$inferSelect
export type Company = typeof companies.$inferSelect
export type CompanyFact = typeof companyFacts.$inferSelect
export type IngestRun = typeof ingestRun.$inferSelect
