import { ORPCError } from '@orpc/server'
import { getDatabase } from '../../db/client'
import {
  deleteFilingTextFactsInputSchema,
  finishIngestRunInputSchema,
  finishIngestRunResultSchema,
  ingestMutationResultSchema,
  startIngestRunInputSchema,
  startIngestRunResultSchema,
  upsertCompanyFactsInputSchema,
  upsertDailyChartInputSchema,
  upsertMarketYearInputSchema,
  upsertUpcomingReleasesInputSchema,
} from '../../ingest/schemas'
import {
  deleteFilingTextFacts,
  finishIngestRun,
  hasActiveIngestRun,
  resolveCompanyId,
  startIngestRun,
  upsertCompanyFacts,
  upsertDailyChart,
  upsertMarketYear,
  upsertMarketYearDistributors,
  upsertUpcomingReleases,
} from '../../ingest/upsert'
import { pub } from '../context'
import { requireIngestAuth } from '../ingest-auth'

async function requireDatabase(event: Parameters<typeof getDatabase>[0]) {
  const db = await getDatabase(event)
  if (!db) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Database binding is unavailable',
    })
  }
  return db as unknown as import('../../ingest/db-helpers').IngestDatabase
}

export const startRun = pub
  .input(startIngestRunInputSchema)
  .output(startIngestRunResultSchema)
  .handler(async ({ input, context }) => {
    await requireIngestAuth(context.event)
    const db = await requireDatabase(context.event)

    if (await hasActiveIngestRun(db, input.source)) {
      throw new ORPCError('CONFLICT', {
        message: `Ingest already running for source ${input.source}`,
      })
    }

    const id = await startIngestRun(db, input.source, input.meta)
    return { id }
  })

export const finishRun = pub
  .input(finishIngestRunInputSchema)
  .output(finishIngestRunResultSchema)
  .handler(async ({ input, context }) => {
    await requireIngestAuth(context.event)
    const db = await requireDatabase(context.event)
    await finishIngestRun(
      db,
      input.id,
      input.status,
      input.urlCount,
      input.rowCount,
      input.errorMessage,
    )
    return { ok: true as const }
  })

export const upsertDaily = pub
  .input(upsertDailyChartInputSchema)
  .output(ingestMutationResultSchema)
  .handler(async ({ input, context }) => {
    await requireIngestAuth(context.event)
    const db = await requireDatabase(context.event)
    const rowCount = await upsertDailyChart(
      db,
      input.chart,
      input.sourceUrl,
      input.retrievedAt,
    )
    return { rowCount }
  })

export const upsertMarket = pub
  .input(upsertMarketYearInputSchema)
  .output(ingestMutationResultSchema)
  .handler(async ({ input, context }) => {
    await requireIngestAuth(context.event)
    const db = await requireDatabase(context.event)
    let rowCount = await upsertMarketYear(
      db,
      input.year,
      input.sourceUrl,
      input.retrievedAt,
    )
    rowCount += await upsertMarketYearDistributors(
      db,
      input.year,
      input.sourceUrl,
      input.retrievedAt,
    )
    return { rowCount }
  })

export const upsertUpcoming = pub
  .input(upsertUpcomingReleasesInputSchema)
  .output(ingestMutationResultSchema)
  .handler(async ({ input, context }) => {
    await requireIngestAuth(context.event)
    const db = await requireDatabase(context.event)
    const rowCount = await upsertUpcomingReleases(
      db,
      input.releases,
      input.retrievedAt,
    )
    return { rowCount }
  })

export const upsertFacts = pub
  .input(upsertCompanyFactsInputSchema)
  .output(ingestMutationResultSchema)
  .handler(async ({ input, context }) => {
    await requireIngestAuth(context.event)
    const db = await requireDatabase(context.event)
    const companyId = await resolveCompanyId(db, input.company)
    const rowCount = await upsertCompanyFacts(
      db,
      companyId,
      input.facts,
      input.sourceUrl,
      input.retrievedAt,
    )
    return { rowCount }
  })

export const deleteFilingFacts = pub
  .input(deleteFilingTextFactsInputSchema)
  .output(ingestMutationResultSchema)
  .handler(async ({ input, context }) => {
    await requireIngestAuth(context.event)
    const db = await requireDatabase(context.event)
    const companyId = await resolveCompanyId(db, input.company)
    await deleteFilingTextFacts(db, companyId, input.accession)
    return { rowCount: 0 }
  })
