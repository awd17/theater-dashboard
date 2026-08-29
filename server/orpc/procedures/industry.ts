import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '../../db/client'
import { boxOfficeDaily, marketDistributorYear, marketPeriod } from '../../db/schema'
import {
  buildDistributorShares,
  buildIndustrySnapshot,
  buildIndustryTrend,
} from '../../ingest/metrics'
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
  marketYears: z.array(
    z.object({
      periodLabel: z.string(),
      boxOfficeCents: z.number().int().nullable(),
      ticketsSold: z.number().int().nullable(),
      averageTicketPriceCents: z.number().int().nullable(),
      isPartial: z.boolean().nullable(),
      yoyGrowthRatio: z.number().nullable(),
    }),
  ),
  distributorShares: z
    .object({
      periodLabel: z.string(),
      isPartial: z.boolean(),
      totalBoxOfficeCents: z.number().int(),
      entries: z.array(
        z.object({
          distributor: z.string(),
          boxOfficeCents: z.number().int(),
          titleCount: z.number().int(),
          share: z.number(),
        }),
      ),
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
  marketYears: [],
  distributorShares: null,
}

export const snapshot = pub
  .output(industrySnapshotSchema)
  .handler(async ({ context }) => {
    const db = await getDatabase(context.event)

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

    const distributorRows = await db
      .select({
        periodLabel: marketDistributorYear.periodLabel,
        distributor: marketDistributorYear.distributor,
        boxOfficeCents: marketDistributorYear.boxOfficeCents,
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

    return industrySnapshotSchema.parse({
      ...buildIndustrySnapshot(dailyRows, periods),
      distributorShares: buildDistributorShares(distributorRows),
    })
  })

export const industryTrendSchema = z.object({
  asOfDate: z.string().nullable(),
  comparisonYears: z.array(z.number().int()),
  monthlyByYear: z.array(
    z.object({
      year: z.number().int(),
      months: z.array(
        z.object({
          month: z.string(),
          year: z.number().int(),
          monthNumber: z.number().int(),
          boxOfficeCents: z.number().int(),
        }),
      ),
      cumulativeByMonth: z.array(
        z.object({
          monthNumber: z.number().int(),
          cumulativeCents: z.number().int(),
        }),
      ),
    }),
  ),
})

export type IndustryTrendResult = z.infer<typeof industryTrendSchema>

const emptyTrend: IndustryTrendResult = {
  asOfDate: null,
  comparisonYears: [],
  monthlyByYear: [],
}

export const trend = pub
  .output(industryTrendSchema)
  .handler(async ({ context }) => {
    const db = await getDatabase(context.event)

    if (!db) {
      return emptyTrend
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

    return industryTrendSchema.parse(buildIndustryTrend(dailyRows))
  })
