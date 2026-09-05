import { and, eq, gte } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '../../db/client'
import { marketDistributorYear, movies, upcomingReleases } from '../../db/schema'
import {
  buildForwardWindowComparison,
  buildHistoricalReleaseVolume,
  buildOutlookSnapshot,
  FORWARD_COMPARISON_WINDOW_DAYS,
} from '../../ingest/outlook-metrics'
import { TMDB_SOURCE } from '../../ingest/sources/tmdb/client'
import {
  DOMESTIC_TERRITORY,
  THE_NUMBERS_SOURCE,
} from '../../ingest/sources/the-numbers/constants'
import { pub } from '../context'

export const outlookSnapshotSchema = z.object({
  asOfDate: z.string(),
  region: z.string(),
  next30DayCount: z.number().int(),
  next90DayCount: z.number().int(),
  next180DayCount: z.number().int(),
  next90DayWideCount: z.number().int(),
  monthlyCounts: z.array(z.object({ month: z.string(), count: z.number().int() })),
  monthlySplit: z.array(z.object({
    month: z.string(),
    total: z.number().int(),
    wide: z.number().int(),
    limited: z.number().int(),
  })),
  mixByReleaseType: z.array(z.object({ releaseType: z.string(), count: z.number().int() })),
  mixByCertification: z.array(z.object({ certification: z.string(), count: z.number().int() })),
  historicalReleaseVolume: z.array(z.object({ periodLabel: z.string(), titleCount: z.number().int() })),
  forwardWindowComparison: z.object({
    windowDays: z.number().int(),
    currentCount: z.number().int(),
    priorYearSameWindowCount: z.number().nullable(),
  }),
  hasData: z.boolean(),
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
    const db = await getDatabase(context.event)

    if (!db) {
      return {
        asOfDate: input.asOfDate,
        region: REGION,
        next30DayCount: 0,
        next90DayCount: 0,
        next180DayCount: 0,
        next90DayWideCount: 0,
        monthlyCounts: [],
        monthlySplit: [],
        mixByReleaseType: [],
        mixByCertification: [],
        historicalReleaseVolume: [],
        forwardWindowComparison: {
          windowDays: FORWARD_COMPARISON_WINDOW_DAYS,
          currentCount: 0,
          priorYearSameWindowCount: null,
        },
        hasData: false,
        upcomingWideReleases: [],
      }
    }

    const rows = await db
      .select({
        movieId: upcomingReleases.movieId,
        title: movies.canonicalTitle,
        releaseDate: upcomingReleases.releaseDate,
        releaseType: upcomingReleases.releaseType,
        certification: upcomingReleases.certification,
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

    const distributorRows = await db
      .select({
        periodLabel: marketDistributorYear.periodLabel,
        titleCount: marketDistributorYear.titleCount,
        isPartial: marketDistributorYear.isPartial,
      })
      .from(marketDistributorYear)
      .where(
        and(
          eq(marketDistributorYear.source, THE_NUMBERS_SOURCE),
          eq(marketDistributorYear.geography, DOMESTIC_TERRITORY),
        ),
      )

    const snapshot = buildOutlookSnapshot(rows, input.asOfDate)
    return outlookSnapshotSchema.parse({
      ...snapshot,
      region: REGION,
      historicalReleaseVolume: buildHistoricalReleaseVolume(distributorRows),
      forwardWindowComparison: buildForwardWindowComparison(snapshot.next180DayCount, distributorRows),
    })
  })
