export const QUARTER_MIN_DAYS = 70
export const QUARTER_MAX_DAYS = 100
export const YOY_WINDOW_DAYS = 20

export interface OperatorFactRow {
  metric: string
  periodStart: string
  periodEnd: string
  value: number
  filedDate: string
  fiscalYear: number | null
  fiscalPeriod: string | null
}

export interface OperatorSnapshotEntry {
  ticker: string
  name: string
  latestQuarterLabel: string | null
  latestQuarterEnd: string | null
  revenueCents: number | null
  revenueYoyRatio: number | null
  operatingIncomeCents: number | null
  netIncomeCents: number | null
  cashCents: number | null
  longTermDebtCents: number | null
  sharesOutstanding: number | null
}

function daysBetween(from: string, to: string): number {
  return (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) / 86_400_000
}

function isQuarterlyFlow(row: OperatorFactRow): boolean {
  const duration = daysBetween(row.periodStart, row.periodEnd)
  return duration >= QUARTER_MIN_DAYS && duration <= QUARTER_MAX_DAYS
}

function latestFiled(rows: OperatorFactRow[]): OperatorFactRow | null {
  let best: OperatorFactRow | null = null
  for (const row of rows) {
    if (!best || row.filedDate > best.filedDate) {
      best = row
    }
  }
  return best
}

function quarterlyFlowAt(rows: OperatorFactRow[], metric: string, periodEnd: string): OperatorFactRow | null {
  return latestFiled(
    rows.filter((row) => row.metric === metric && row.periodEnd === periodEnd && isQuarterlyFlow(row)),
  )
}

function instantAt(rows: OperatorFactRow[], metric: string, periodEnd: string): OperatorFactRow | null {
  return latestFiled(
    rows.filter((row) => row.metric === metric && row.periodEnd === periodEnd && row.periodStart === row.periodEnd),
  )
}

function quarterLabel(row: OperatorFactRow): string {
  if (row.fiscalPeriod && row.fiscalYear) {
    return `${row.fiscalPeriod} ${row.fiscalYear}`
  }
  return row.periodEnd
}

export function buildOperatorSnapshotEntry(
  company: { ticker: string, name: string },
  rows: OperatorFactRow[],
): OperatorSnapshotEntry {
  const empty: OperatorSnapshotEntry = {
    ticker: company.ticker,
    name: company.name,
    latestQuarterLabel: null,
    latestQuarterEnd: null,
    revenueCents: null,
    revenueYoyRatio: null,
    operatingIncomeCents: null,
    netIncomeCents: null,
    cashCents: null,
    longTermDebtCents: null,
    sharesOutstanding: null,
  }

  const quarterlyRevenues = rows.filter((row) => row.metric === 'revenue' && isQuarterlyFlow(row))
  if (quarterlyRevenues.length === 0) {
    return empty
  }

  const latestQuarterEnd = quarterlyRevenues
    .map((row) => row.periodEnd)
    .reduce((a, b) => (a > b ? a : b))

  const revenue = quarterlyFlowAt(rows, 'revenue', latestQuarterEnd)
  if (!revenue) {
    return empty
  }

  const priorYearRevenue = latestFiled(
    quarterlyRevenues.filter((row) => {
      const distance = daysBetween(row.periodEnd, latestQuarterEnd)
      return Math.abs(distance - 365) <= YOY_WINDOW_DAYS
    }),
  )

  const debtNoncurrent = instantAt(rows, 'long_term_debt_noncurrent', latestQuarterEnd)
  const debtCurrent = instantAt(rows, 'long_term_debt_current', latestQuarterEnd)

  const shares = latestFiled(
    rows.filter((row) => row.metric === 'shares_outstanding' && row.periodEnd >= latestQuarterEnd),
  )

  return {
    ticker: company.ticker,
    name: company.name,
    latestQuarterLabel: quarterLabel(revenue),
    latestQuarterEnd,
    revenueCents: revenue.value,
    revenueYoyRatio: priorYearRevenue && priorYearRevenue.value !== 0
      ? revenue.value / priorYearRevenue.value - 1
      : null,
    operatingIncomeCents: quarterlyFlowAt(rows, 'operating_income', latestQuarterEnd)?.value ?? null,
    netIncomeCents: quarterlyFlowAt(rows, 'net_income', latestQuarterEnd)?.value ?? null,
    cashCents: instantAt(rows, 'cash', latestQuarterEnd)?.value ?? null,
    longTermDebtCents: debtNoncurrent
      ? debtNoncurrent.value + (debtCurrent?.value ?? 0)
      : null,
    sharesOutstanding: shares?.value ?? null,
  }
}
