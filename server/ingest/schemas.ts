import { z } from 'zod'
import { MARKET_PERIOD_KIND } from './sources/the-numbers/constants'

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const ingestRunMetaSchema = z.record(z.string(), z.unknown())

export const startIngestRunInputSchema = z.object({
  source: z.string().min(1),
  meta: ingestRunMetaSchema.default({}),
})

export const finishIngestRunInputSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['completed', 'failed']),
  urlCount: z.number().int().nonnegative(),
  rowCount: z.number().int().nonnegative(),
  errorMessage: z.string().optional(),
})

export const dailyChartRowInputSchema = z.object({
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

export const upsertDailyChartInputSchema = z.object({
  chart: z.object({
    observationDate: isoDateSchema,
    rows: z.array(dailyChartRowInputSchema).max(500),
    reportedTotalGrossCents: z.number().int().nullable(),
    reportingMovieCount: z.number().int().nullable(),
  }),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().datetime(),
})

export const marketDistributorInputSchema = z.object({
  distributor: z.string().min(1),
  boxOfficeCents: z.number().int(),
  ticketsSold: z.number().int().nullable(),
  titleCount: z.number().int(),
})

export const upsertMarketYearInputSchema = z.object({
  year: z.object({
    year: z.number().int(),
    periodKind: z.literal(MARKET_PERIOD_KIND),
    periodLabel: z.string().min(1),
    boxOfficeCents: z.number().int().nullable(),
    ticketsSold: z.number().int().nullable(),
    averageTicketPriceCents: z.number().int().nullable(),
    movieCount: z.number().int(),
    isPartial: z.boolean(),
    distributors: z.array(marketDistributorInputSchema).max(200),
  }),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().datetime(),
})

export const upcomingReleaseInputSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1),
  region: z.string().min(1),
  releaseDate: isoDateSchema,
  releaseType: z.string().min(1),
  certification: z.string().nullable(),
  popularity: z.number().nullable(),
  primaryReleaseDate: isoDateSchema.nullable(),
})

export const upsertUpcomingReleasesInputSchema = z.object({
  releases: z.array(upcomingReleaseInputSchema).max(200),
  retrievedAt: z.string().datetime(),
})

export const companyInputSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  cik: z.string().min(1),
})

export const companyFactInputSchema = z.object({
  metric: z.string().min(1),
  concept: z.string().min(1),
  unit: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  value: z.number().int(),
  fiscalYear: z.number().int().nullable(),
  fiscalPeriod: z.string().nullable(),
  form: z.string().min(1),
  filedDate: z.string().min(1),
  accession: z.string().min(1),
})

export const upsertCompanyFactsInputSchema = z.object({
  company: companyInputSchema,
  facts: z.array(companyFactInputSchema).max(2_000),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().datetime(),
})

export const deleteFilingTextFactsInputSchema = z.object({
  company: companyInputSchema,
  accession: z.string().min(1),
})

export const ingestMutationResultSchema = z.object({
  rowCount: z.number().int().nonnegative(),
})

export const startIngestRunResultSchema = z.object({
  id: z.number().int().positive(),
})

export const finishIngestRunResultSchema = z.object({
  ok: z.literal(true),
})
