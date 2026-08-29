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
  attendanceCount: number | null
  attendanceYoyRatio: number | null
  admissionsRevenueCents: number | null
  foodBeverageRevenueCents: number | null
  averageTicketPriceCents: number | null
  foodBeveragePerPatronCents: number | null
  revenuePerPatronCents: number | null
  theatreCount: number | null
  screenCount: number | null
  attendancePerScreen: number | null
  interestExpenseCents: number | null
  operatingCashFlowCents: number | null
  capexCents: number | null
  freeCashFlowCents: number | null
  operatingLeaseCents: number | null
  revenuePerPatronYoyRatio: number | null
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

function quarterlyFlowOrYtdDifference(
  rows: OperatorFactRow[],
  metric: string,
  periodEnd: string,
): number | null {
  const direct = quarterlyFlowAt(rows, metric, periodEnd)
  if (direct) {
    return direct.value
  }

  const ytd = latestFiled(
    rows.filter((row) => {
      if (row.metric !== metric || row.periodEnd !== periodEnd) {
        return false
      }
      return daysBetween(row.periodStart, row.periodEnd) > QUARTER_MAX_DAYS
    }),
  )
  if (!ytd) {
    return null
  }

  const previousYtd = latestFiled(
    rows.filter((row) => {
      if (row.metric !== metric || row.periodStart !== ytd.periodStart) {
        return false
      }
      const gap = daysBetween(row.periodEnd, periodEnd)
      return gap >= QUARTER_MIN_DAYS && gap <= QUARTER_MAX_DAYS
    }),
  )
  return previousYtd ? ytd.value - previousYtd.value : null
}

function quarterLabel(row: OperatorFactRow): string {
  if (row.fiscalPeriod && row.fiscalYear) {
    return `${row.fiscalPeriod} ${row.fiscalYear}`
  }
  return row.periodEnd
}

function yoyRatio(
  rows: OperatorFactRow[],
  metric: string,
  currentEnd: string,
  currentValue: number,
): number | null {
  const prior = latestFiled(
    rows.filter((row) => {
      if (row.metric !== metric || !isQuarterlyFlow(row)) {
        return false
      }
      const distance = daysBetween(row.periodEnd, currentEnd)
      return Math.abs(distance - 365) <= YOY_WINDOW_DAYS
    }),
  )
  return prior && prior.value !== 0 ? currentValue / prior.value - 1 : null
}

export interface OperatorQuarterEntry {
  periodEnd: string
  label: string
  revenueCents: number
  netIncomeCents: number | null
  attendanceCount: number | null
  admissionsRevenueCents: number | null
  foodBeverageRevenueCents: number | null
  averageTicketPriceCents: number | null
  foodBeveragePerPatronCents: number | null
  revenuePerPatronCents: number | null
  operatingIncomeCents: number | null
  operatingCashFlowCents: number | null
  capexCents: number | null
  freeCashFlowCents: number | null
  cashCents: number | null
  longTermDebtCents: number | null
  interestExpenseCents: number | null
  operatingLeaseCents: number | null
  sharesOutstanding: number | null
  theatreCount: number | null
  screenCount: number | null
}

export function calendarQuarterLabel(periodEnd: string): string {
  const [year, month] = periodEnd.split('-')
  return `Q${Math.ceil(Number(month) / 3)} ${year}`
}

function debtTotalAt(rows: OperatorFactRow[], periodEnd: string): number | null {
  const debtNoncurrent = instantAt(rows, 'long_term_debt_noncurrent', periodEnd)
  const debtCurrent = instantAt(rows, 'long_term_debt_current', periodEnd)
  return debtNoncurrent
    ? debtNoncurrent.value + (debtCurrent?.value ?? 0)
    : null
}

function leaseTotalAt(rows: OperatorFactRow[], periodEnd: string): number | null {
  const leaseNoncurrent = instantAt(rows, 'operating_lease_noncurrent', periodEnd)
  const leaseCurrent = instantAt(rows, 'operating_lease_current', periodEnd)
  return leaseNoncurrent
    ? leaseNoncurrent.value + (leaseCurrent?.value ?? 0)
    : null
}

function perPatronAt(
  attendance: number | null,
  revenueCents: number | null,
): number | null {
  if (attendance === null || attendance === 0 || revenueCents === null) {
    return null
  }
  return Math.round(revenueCents / attendance)
}

export function buildOperatorQuarterlyHistory(
  rows: OperatorFactRow[],
  limit = 8,
): OperatorQuarterEntry[] {
  const revenueRows = rows.filter((row) => row.metric === 'revenue')
  const quarterEnds = new Set(
    revenueRows.filter(isQuarterlyFlow).map((row) => row.periodEnd),
  )
  for (const row of revenueRows) {
    if (
      !quarterEnds.has(row.periodEnd)
      && quarterlyFlowOrYtdDifference(rows, 'revenue', row.periodEnd) !== null
    ) {
      quarterEnds.add(row.periodEnd)
    }
  }

  return [...quarterEnds]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
    .map((periodEnd) => {
      const revenueCents = quarterlyFlowOrYtdDifference(rows, 'revenue', periodEnd)
      if (revenueCents === null) {
        return null
      }
      const attendanceCount = quarterlyFlowAt(rows, 'attendance', periodEnd)?.value ?? null
      const admissionsRevenueCents = quarterlyFlowAt(rows, 'admissions_revenue', periodEnd)?.value ?? null
      const foodBeverageRevenueCents = quarterlyFlowAt(rows, 'food_beverage_revenue', periodEnd)?.value ?? null
      const operatingCashFlowCents = quarterlyFlowOrYtdDifference(rows, 'operating_cash_flow', periodEnd)
      const capexCents = quarterlyFlowOrYtdDifference(rows, 'capex', periodEnd)
      const shares = latestFiled(
        rows.filter((row) => row.metric === 'shares_outstanding' && row.periodEnd === periodEnd),
      )

      return {
        periodEnd,
        label: calendarQuarterLabel(periodEnd),
        revenueCents,
        netIncomeCents: quarterlyFlowOrYtdDifference(rows, 'net_income', periodEnd),
        attendanceCount,
        admissionsRevenueCents,
        foodBeverageRevenueCents,
        averageTicketPriceCents: perPatronAt(attendanceCount, admissionsRevenueCents),
        foodBeveragePerPatronCents: perPatronAt(attendanceCount, foodBeverageRevenueCents),
        revenuePerPatronCents: perPatronAt(attendanceCount, revenueCents),
        operatingIncomeCents: quarterlyFlowOrYtdDifference(rows, 'operating_income', periodEnd),
        operatingCashFlowCents,
        capexCents,
        freeCashFlowCents: operatingCashFlowCents !== null && capexCents !== null
          ? operatingCashFlowCents - capexCents
          : null,
        cashCents: instantAt(rows, 'cash', periodEnd)?.value ?? null,
        longTermDebtCents: debtTotalAt(rows, periodEnd),
        interestExpenseCents: quarterlyFlowAt(rows, 'interest_expense', periodEnd)?.value ?? null,
        operatingLeaseCents: leaseTotalAt(rows, periodEnd),
        sharesOutstanding: shares?.value ?? null,
        theatreCount: latestFiled(
          rows.filter((row) => row.metric === 'theatre_count' && row.periodEnd === periodEnd),
        )?.value ?? null,
        screenCount: latestFiled(
          rows.filter((row) => row.metric === 'screen_count' && row.periodEnd === periodEnd),
        )?.value ?? null,
      }
    })
    .filter((entry) => entry !== null)
    .reverse()
}

function priorYearComparable(
  history: OperatorQuarterEntry[],
  currentEnd: string,
  pick: (entry: OperatorQuarterEntry) => number | null,
): number | null {
  const current = history.find((entry) => entry.periodEnd === currentEnd)
  if (!current) {
    return null
  }
  const currentValue = pick(current)
  if (currentValue === null) {
    return null
  }

  const prior = history.find((entry) => {
    const distance = daysBetween(entry.periodEnd, currentEnd)
    return Math.abs(distance - 365) <= YOY_WINDOW_DAYS
  })
  const priorValue = prior ? pick(prior) : null
  if (priorValue === null || priorValue === 0) {
    return null
  }
  return currentValue / priorValue - 1
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
    attendanceCount: null,
    attendanceYoyRatio: null,
    admissionsRevenueCents: null,
    foodBeverageRevenueCents: null,
    averageTicketPriceCents: null,
    foodBeveragePerPatronCents: null,
    revenuePerPatronCents: null,
    theatreCount: null,
    screenCount: null,
    attendancePerScreen: null,
    interestExpenseCents: null,
    operatingCashFlowCents: null,
    capexCents: null,
    freeCashFlowCents: null,
    operatingLeaseCents: null,
    revenuePerPatronYoyRatio: null,
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

  const debtNoncurrent = instantAt(rows, 'long_term_debt_noncurrent', latestQuarterEnd)
  const debtCurrent = instantAt(rows, 'long_term_debt_current', latestQuarterEnd)

  const shares = latestFiled(
    rows.filter((row) => row.metric === 'shares_outstanding' && row.periodEnd >= latestQuarterEnd),
  )

  const latestFilingMetricEnd = (metric: string): string | null => {
    const flows = rows.filter((row) => row.metric === metric && isQuarterlyFlow(row))
    return flows.length > 0
      ? flows.map((row) => row.periodEnd).reduce((a, b) => (a > b ? a : b))
      : null
  }

  const latestAttendanceEnd = latestFilingMetricEnd('attendance')
  const attendance = latestAttendanceEnd
    ? quarterlyFlowAt(rows, 'attendance', latestAttendanceEnd)
    : null
  const revenueForAttendancePeriod = latestAttendanceEnd
    ? quarterlyFlowAt(rows, 'revenue', latestAttendanceEnd)
    : null

  const latestAdmissionsEnd = latestFilingMetricEnd('admissions_revenue')
  const admissions = latestAdmissionsEnd
    ? quarterlyFlowAt(rows, 'admissions_revenue', latestAdmissionsEnd)
    : null
  const latestFoodBeverageEnd = latestFilingMetricEnd('food_beverage_revenue')
  const foodBeverage = latestFoodBeverageEnd
    ? quarterlyFlowAt(rows, 'food_beverage_revenue', latestFoodBeverageEnd)
    : null

  const perPatron = (revenueRow: OperatorFactRow | null): number | null =>
    attendance && revenueRow && revenueRow.periodEnd === attendance.periodEnd
      ? Math.round(revenueRow.value / attendance.value)
      : null

  const latestCount = (metric: string): OperatorFactRow | null => {
    const counts = rows.filter((row) => row.metric === metric)
    if (counts.length === 0) {
      return null
    }
    const latestEnd = counts.map((row) => row.periodEnd).reduce((a, b) => (a > b ? a : b))
    return latestFiled(counts.filter((row) => row.periodEnd === latestEnd))
  }

  const theatres = latestCount('theatre_count')
  const screens = latestCount('screen_count')
  const attendancePerScreen = attendance && screens && screens.periodEnd === attendance.periodEnd
    ? Math.round(attendance.value / screens.value)
    : null

  const operatingCashFlowCents = quarterlyFlowOrYtdDifference(rows, 'operating_cash_flow', latestQuarterEnd)
  const capexCents = quarterlyFlowOrYtdDifference(rows, 'capex', latestQuarterEnd)

  const leaseNoncurrent = instantAt(rows, 'operating_lease_noncurrent', latestQuarterEnd)
  const leaseCurrent = instantAt(rows, 'operating_lease_current', latestQuarterEnd)

  const history = buildOperatorQuarterlyHistory(rows, 12)
  const revenuePerPatronYoyRatio = latestAttendanceEnd
    ? priorYearComparable(history, latestAttendanceEnd, (entry) => entry.revenuePerPatronCents)
    : null

  return {
    ticker: company.ticker,
    name: company.name,
    latestQuarterLabel: quarterLabel(revenue),
    latestQuarterEnd,
    revenueCents: revenue.value,
    revenueYoyRatio: yoyRatio(rows, 'revenue', latestQuarterEnd, revenue.value),
    operatingIncomeCents: quarterlyFlowOrYtdDifference(rows, 'operating_income', latestQuarterEnd),
    netIncomeCents: quarterlyFlowOrYtdDifference(rows, 'net_income', latestQuarterEnd),
    cashCents: instantAt(rows, 'cash', latestQuarterEnd)?.value ?? null,
    longTermDebtCents: debtNoncurrent
      ? debtNoncurrent.value + (debtCurrent?.value ?? 0)
      : null,
    sharesOutstanding: shares?.value ?? null,
    attendanceCount: attendance?.value ?? null,
    attendanceYoyRatio: attendance && latestAttendanceEnd
      ? yoyRatio(rows, 'attendance', latestAttendanceEnd, attendance.value)
      : null,
    admissionsRevenueCents: admissions?.value ?? null,
    foodBeverageRevenueCents: foodBeverage?.value ?? null,
    averageTicketPriceCents: perPatron(admissions),
    foodBeveragePerPatronCents: perPatron(foodBeverage),
    revenuePerPatronCents: perPatron(revenueForAttendancePeriod),
    theatreCount: theatres?.value ?? null,
    screenCount: screens?.value ?? null,
    attendancePerScreen,
    interestExpenseCents: quarterlyFlowAt(rows, 'interest_expense', latestQuarterEnd)?.value ?? null,
    operatingCashFlowCents,
    capexCents,
    freeCashFlowCents: operatingCashFlowCents !== null && capexCents !== null
      ? operatingCashFlowCents - capexCents
      : null,
    operatingLeaseCents: leaseNoncurrent
      ? leaseNoncurrent.value + (leaseCurrent?.value ?? 0)
      : null,
    revenuePerPatronYoyRatio,
  }
}
