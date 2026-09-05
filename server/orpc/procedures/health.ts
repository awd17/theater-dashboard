import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '../../db/client'
import { boxOfficeDaily, ingestRun, marketPeriod } from '../../db/schema'
import { MARKET_PERIOD_KIND } from '../../ingest/sources/the-numbers/constants'
import { pub } from '../context'

export const ingestSourceStatusSchema = z.object({
  source: z.string(),
  status: z.string(),
  finishedAt: z.string().nullable(),
  rowCount: z.number().int().nullable(),
})

export const healthCoverageSchema = z.object({
  dailyLatestDate: z.string().nullable(),
  marketLatestLabel: z.string().nullable(),
})

export const healthResultSchema = z.object({
  ok: z.literal(true),
  database: z.enum(['connected', 'unavailable']),
  ingestSources: z.array(ingestSourceStatusSchema),
  coverage: healthCoverageSchema,
})

export type HealthResult = z.infer<typeof healthResultSchema>

const emptyHealthCoverage = { dailyLatestDate: null, marketLatestLabel: null }

export const health = pub
  .output(healthResultSchema)
  .handler(async ({ context }) => {
    const db = await getDatabase(context.event)

    if (!db) {
      return {
        ok: true as const,
        database: 'unavailable' as const,
        ingestSources: [],
        coverage: emptyHealthCoverage,
      }
    }

    await db.run(sql`SELECT 1`)

    try {
      const runs = await db
        .select({
          source: ingestRun.source,
          status: ingestRun.status,
          finishedAt: ingestRun.finishedAt,
          rowCount: ingestRun.rowCount,
        })
        .from(ingestRun)
        .orderBy(desc(ingestRun.id))
        .limit(50)

      const latestBySource: Record<string, { source: string, status: string, finishedAt: string | null, rowCount: number | null }> = {}
      for (const run of runs) {
        if (!(run.source in latestBySource)) {
          latestBySource[run.source] = {
            source: run.source,
            status: run.status,
            finishedAt: run.finishedAt,
            rowCount: run.rowCount,
          }
        }
      }
      const ingestSources = Object.values(latestBySource)
        .sort((a, b) => a.source.localeCompare(b.source))

      const dailyRows = await db
        .select({ observationDate: boxOfficeDaily.observationDate })
        .from(boxOfficeDaily)
        .orderBy(desc(boxOfficeDaily.observationDate))
        .limit(1)

      const marketRows = await db
        .select({ periodLabel: marketPeriod.periodLabel })
        .from(marketPeriod)
        .where(eq(marketPeriod.periodKind, MARKET_PERIOD_KIND))
        .orderBy(desc(marketPeriod.periodLabel))
        .limit(1)
      return healthResultSchema.parse({
        ok: true,
        database: 'connected',
        ingestSources,
        coverage: {
          dailyLatestDate: dailyRows[0]?.observationDate ?? null,
          marketLatestLabel: marketRows[0]?.periodLabel ?? null,
        },
      })
    }
    catch {
      return {
        ok: true as const,
        database: 'connected' as const,
        ingestSources: [],
        coverage: emptyHealthCoverage,
      }
    }
  })
