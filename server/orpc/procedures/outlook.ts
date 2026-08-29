import { and, eq, gte } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '../../db/client'
import { movies, upcomingReleases } from '../../db/schema'
import { buildOutlookSnapshot } from '../../ingest/outlook-metrics'
import { TMDB_SOURCE } from '../../ingest/sources/tmdb/client'
import { pub } from '../context'

export const outlookSnapshotSchema = z.object({
  asOfDate: z.string(),
  region: z.string(),
  next30DayCount: z.number().int(),
  next90DayCount: z.number().int(),
  next180DayCount: z.number().int(),
  next90DayWideCount: z.number().int(),
  monthlyCounts: z.array(z.object({ month: z.string(), count: z.number().int() })),
  upcomingWideReleases: z.array(
    z.object({ title: z.string(), releaseDate: z.string() }),
  ),
})

export type OutlookSnapshotResult = z.infer<typeof outlookSnapshotSchema>

const REGION = 'US'

export const snapshot = pub
  .input(z.object({ asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .output(outlookSnapshotSchema)
  .handler(async ({ context, input }) => {
    const db = getDatabase(context.event)

    if (!db) {
      return {
        asOfDate: input.asOfDate,
        region: REGION,
        next30DayCount: 0,
        next90DayCount: 0,
        next180DayCount: 0,
        next90DayWideCount: 0,
        monthlyCounts: [],
        upcomingWideReleases: [],
      }
    }

    const rows = await db
      .select({
        movieId: upcomingReleases.movieId,
        title: movies.canonicalTitle,
        releaseDate: upcomingReleases.releaseDate,
        releaseType: upcomingReleases.releaseType,
        popularity: upcomingReleases.popularity,
        primaryReleaseDate: upcomingReleases.primaryReleaseDate,
      })
      .from(upcomingReleases)
      .innerJoin(movies, eq(upcomingReleases.movieId, movies.id))
      .where(
        and(
          eq(upcomingReleases.source, TMDB_SOURCE),
          eq(upcomingReleases.region, REGION),
          gte(upcomingReleases.releaseDate, input.asOfDate),
        ),
      )

    return outlookSnapshotSchema.parse({
      ...buildOutlookSnapshot(rows, input.asOfDate),
      region: REGION,
    })
  })
