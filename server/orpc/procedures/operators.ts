import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '../../db/client'
import { companies, companyFacts } from '../../db/schema'
import { buildOperatorSnapshotEntry } from '../../ingest/operator-metrics'
import { pub } from '../context'

export const operatorSnapshotSchema = z.object({
  operators: z.array(
    z.object({
      ticker: z.string(),
      name: z.string(),
      latestQuarterLabel: z.string().nullable(),
      latestQuarterEnd: z.string().nullable(),
      revenueCents: z.number().int().nullable(),
      revenueYoyRatio: z.number().nullable(),
      operatingIncomeCents: z.number().int().nullable(),
      netIncomeCents: z.number().int().nullable(),
      cashCents: z.number().int().nullable(),
      longTermDebtCents: z.number().int().nullable(),
      sharesOutstanding: z.number().int().nullable(),
      attendanceCount: z.number().int().nullable(),
      attendanceYoyRatio: z.number().nullable(),
      admissionsRevenueCents: z.number().int().nullable(),
      foodBeverageRevenueCents: z.number().int().nullable(),
      averageTicketPriceCents: z.number().int().nullable(),
      foodBeveragePerPatronCents: z.number().int().nullable(),
      revenuePerPatronCents: z.number().int().nullable(),
      interestExpenseCents: z.number().int().nullable(),
      operatingCashFlowCents: z.number().int().nullable(),
      capexCents: z.number().int().nullable(),
      freeCashFlowCents: z.number().int().nullable(),
      operatingLeaseCents: z.number().int().nullable(),
    }),
  ),
})

export type OperatorSnapshotResult = z.infer<typeof operatorSnapshotSchema>

export const snapshot = pub
  .output(operatorSnapshotSchema)
  .handler(async ({ context }) => {
    const db = getDatabase(context.event)

    if (!db) {
      return { operators: [] }
    }

    const companyRows = await db
      .select({ id: companies.id, ticker: companies.ticker, name: companies.name })
      .from(companies)
      .orderBy(companies.ticker)

    const operators = []
    for (const company of companyRows) {
      const factRows = await db
        .select({
          metric: companyFacts.metric,
          periodStart: companyFacts.periodStart,
          periodEnd: companyFacts.periodEnd,
          value: companyFacts.value,
          filedDate: companyFacts.filedDate,
          fiscalYear: companyFacts.fiscalYear,
          fiscalPeriod: companyFacts.fiscalPeriod,
        })
        .from(companyFacts)
        .where(eq(companyFacts.companyId, company.id))

      operators.push(buildOperatorSnapshotEntry(company, factRows))
    }

    return operatorSnapshotSchema.parse({ operators })
  })
