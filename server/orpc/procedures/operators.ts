import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase, type AppDatabase } from '../../db/client'
import { companies, companyFacts } from '../../db/schema'
import {
  buildOperatorQuarterlyHistory,
  buildOperatorSnapshotEntry,
  type OperatorFactRow,
} from '../../ingest/operator-metrics'
import { pub } from '../context'

async function loadCompanyFactRows(
  db: AppDatabase,
  companyId: number,
): Promise<OperatorFactRow[]> {
  return await db
    .select({
      metric: companyFacts.metric,
      periodStart: companyFacts.periodStart,
      periodEnd: companyFacts.periodEnd,
      value: companyFacts.value,
      filedDate: companyFacts.filedDate,
      fiscalYear: companyFacts.fiscalYear,
      fiscalPeriod: companyFacts.fiscalPeriod,
      sourceUrl: companyFacts.sourceUrl,
      concept: companyFacts.concept,
    })
    .from(companyFacts)
    .where(eq(companyFacts.companyId, companyId))
}

const quarterSchema = z.object({
  periodEnd: z.string(),
  label: z.string(),
  periodStart: z.string(),
  fiscalYear: z.number().int().nullable(),
  fiscalPeriod: z.string().nullable(),
  calendarLabel: z.string(),
  revenueCents: z.number().int(),
  netIncomeCents: z.number().int().nullable(),
  attendanceCount: z.number().int().nullable(),
  admissionsRevenueCents: z.number().int().nullable(),
  foodBeverageRevenueCents: z.number().int().nullable(),
  averageTicketPriceCents: z.number().int().nullable(),
  foodBeveragePerPatronCents: z.number().int().nullable(),
  revenuePerPatronCents: z.number().int().nullable(),
  operatingIncomeCents: z.number().int().nullable(),
  operatingCashFlowCents: z.number().int().nullable(),
  capexCents: z.number().int().nullable(),
  freeCashFlowCents: z.number().int().nullable(),
  cashCents: z.number().int().nullable(),
  longTermDebtCents: z.number().int().nullable(),
  interestExpenseCents: z.number().int().nullable(),
  operatingLeaseCents: z.number().int().nullable(),
  sharesOutstanding: z.number().int().nullable(),
  theatreCount: z.number().int().nullable(),
  screenCount: z.number().int().nullable(),
  attendancePerScreen: z.number().int().nullable(),
})

export const operatorSnapshotSchema = z.object({
  operators: z.array(
    z.object({
      ticker: z.string(),
      name: z.string(),
      latestQuarterLabel: z.string().nullable(),
      latestQuarterEnd: z.string().nullable(),
      latestPeriodStart: z.string().nullable(),
      latestFiscalYear: z.number().int().nullable(),
      latestFiscalPeriod: z.string().nullable(),
      latestCalendarLabel: z.string().nullable(),
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
      theatreCount: z.number().int().nullable(),
      screenCount: z.number().int().nullable(),
      attendancePerScreen: z.number().int().nullable(),
      interestExpenseCents: z.number().int().nullable(),
      operatingCashFlowCents: z.number().int().nullable(),
      capexCents: z.number().int().nullable(),
      freeCashFlowCents: z.number().int().nullable(),
      operatingLeaseCents: z.number().int().nullable(),
      revenuePerPatronYoyRatio: z.number().nullable(),
      latestOperatingQuarterEnd: z.string().nullable(),
      perPatronQuality: z.enum(['reported', 'derived', 'estimated']).nullable(),
      attendanceYoyQuality: z.enum(['reported', 'derived', 'estimated']).nullable(),
      revenuePerPatronYoyQuality: z.enum(['reported', 'derived', 'estimated']).nullable(),
      revenueSourceUrl: z.string().url().nullable(),
      operatingSourceUrl: z.string().url().nullable(),
      netDebtCents: z.number().int().nullable(),
      leaseAdjustedNetDebtCents: z.number().int().nullable(),
      interestCoverageRatio: z.number().nullable(),
      geographyNote: z.string().nullable(),
      attendanceUsShare: z.number().nullable(),
      admissionsRevenueUsShare: z.number().nullable(),
    }),
  ),
})

export type OperatorSnapshotResult = z.infer<typeof operatorSnapshotSchema>

export const snapshot = pub
  .output(operatorSnapshotSchema)
  .handler(async ({ context }) => {
    const db = await getDatabase(context.event)

    if (!db) {
      return { operators: [] }
    }

    const companyRows = await db
      .select({ id: companies.id, ticker: companies.ticker, name: companies.name })
      .from(companies)
      .orderBy(companies.ticker)

    const operators = []
    for (const company of companyRows) {
      const factRows = await loadCompanyFactRows(db, company.id)
      operators.push(buildOperatorSnapshotEntry(company, factRows))
    }

    return operatorSnapshotSchema.parse({ operators })
  })

export const operatorHistorySchema = z.object({
  operators: z.array(
    z.object({
      ticker: z.string(),
      name: z.string(),
      quarters: z.array(quarterSchema),
    }),
  ),
})

export type OperatorHistoryResult = z.infer<typeof operatorHistorySchema>

export const history = pub
  .output(operatorHistorySchema)
  .handler(async ({ context }) => {
    const db = await getDatabase(context.event)

    if (!db) {
      return { operators: [] }
    }

    const companyRows = await db
      .select({ id: companies.id, ticker: companies.ticker, name: companies.name })
      .from(companies)
      .orderBy(companies.ticker)

    const operators = []
    for (const company of companyRows) {
      const factRows = await loadCompanyFactRows(db, company.id)
      operators.push({
        ticker: company.ticker,
        name: company.name,
        quarters: buildOperatorQuarterlyHistory(factRows),
      })
    }

    return operatorHistorySchema.parse({ operators })
  })

export const operatorDetailSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  latest: operatorSnapshotSchema.shape.operators.element.nullable(),
  quarters: z.array(quarterSchema),
})

export type OperatorDetailResult = z.infer<typeof operatorDetailSchema>

export const detail = pub
  .input(z.object({ ticker: z.string().min(1).max(10) }))
  .output(operatorDetailSchema)
  .handler(async ({ context, input }) => {
    const db = await getDatabase(context.event)
    const ticker = input.ticker.toUpperCase()

    if (!db) {
      return {
        ticker,
        name: ticker,
        latest: null,
        quarters: [],
      }
    }

    const company = await db
      .select({ id: companies.id, ticker: companies.ticker, name: companies.name })
      .from(companies)
      .where(eq(companies.ticker, ticker))
      .get()

    if (!company) {
      return {
        ticker,
        name: ticker,
        latest: null,
        quarters: [],
      }
    }

    const factRows = await loadCompanyFactRows(db, company.id)

    return operatorDetailSchema.parse({
      ticker: company.ticker,
      name: company.name,
      latest: buildOperatorSnapshotEntry(company, factRows),
      quarters: buildOperatorQuarterlyHistory(factRows, 16),
    })
  })
