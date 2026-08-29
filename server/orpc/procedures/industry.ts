import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '../../db/client'
import { boxOfficeDaily, marketPeriod } from '../../db/schema'
import { buildIndustrySnapshot } from '../../ingest/metrics'
import {
  DOMESTIC_TERRITORY,
  MARKET_PERIOD_KIND,
  THE_NUMBERS_SOURCE,
} from '../../ingest/sources/the-numbers/constants'
import { pub } from '../context'

export const industrySnapshotSchema = z.object({
  latestObservationDate: z.string().nullable(),
  latestDailyTotalCents: z.number().int().nullable(),
  ytdBoxOfficeCents: z.number().int().nullable(),
  priorYearComparableYtdCents: z.number().int().nullable(),
  yoyGrowthRatio: z.number().nullable(),
  top10Concentration: z.number().nullable(),
  recoveryVs2019Ratio: z.number().nullable(),
  recoveryPeriodLabel: z.string().nullable(),
  recoveryBaselinePeriodLabel: z.string(),
  latestMarketYear: z
    .object({
      periodLabel: z.string(),
      boxOfficeCents: z.number().int().nullable(),
      ticketsSold: z.number().int().nullable(),
      averageTicketPriceCents: z.number().int().nullable(),
      isPartial: z.boolean().nullable(),
    })
    .nullable(),
})

export type IndustrySnapshotResult = z.infer<typeof industrySnapshotSchema>

const emptySnapshot: IndustrySnapshotResult = {
  latestObservationDate: null,
  latestDailyTotalCents: null,
  ytdBoxOfficeCents: null,
  priorYearComparableYtdCents: null,
  yoyGrowthRatio: null,
  top10Concentration: null,
  recoveryVs2019Ratio: null,
  recoveryPeriodLabel: null,
  recoveryBaselinePeriodLabel: '2019',
  latestMarketYear: null,
}

export const snapshot = pub
  .output(industrySnapshotSchema)
  .handler(async ({ context }) => {
    const db = getDatabase(context.event)

    if (!db) {
      return emptySnapshot
    }

    const dailyRows = await db
      .select({
        observationDate: boxOfficeDaily.observationDate,
        movieId: boxOfficeDaily.movieId,
        grossCents: boxOfficeDaily.grossCents,
        theaterCount: boxOfficeDaily.theaterCount,
        rank: boxOfficeDaily.rank,
      })
      .from(boxOfficeDaily)
      .where(
        and(
          eq(boxOfficeDaily.source, THE_NUMBERS_SOURCE),
          eq(boxOfficeDaily.territory, DOMESTIC_TERRITORY),
        ),
      )

    const periods = await db
      .select({
        periodLabel: marketPeriod.periodLabel,
        boxOfficeCents: marketPeriod.boxOfficeCents,
        ticketsSold: marketPeriod.ticketsSold,
        averageTicketPriceCents: marketPeriod.averageTicketPriceCents,
        isPartial: marketPeriod.isPartial,
      })
      .from(marketPeriod)
      .where(
        and(
          eq(marketPeriod.source, THE_NUMBERS_SOURCE),
          eq(marketPeriod.periodKind, MARKET_PERIOD_KIND),
          eq(marketPeriod.geography, DOMESTIC_TERRITORY),
        ),
      )

    return industrySnapshotSchema.parse(buildIndustrySnapshot(dailyRows, periods))
  })
