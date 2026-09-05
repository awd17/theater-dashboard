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
  sourceUrl?: string
  concept?: string | null
}

export type MetricQuality = 'reported' | 'derived' | 'estimated'

export interface OperatorSnapshotEntry {
  ticker: string
  name: string
  latestQuarterLabel: string | null
  latestQuarterEnd: string | null
  latestPeriodStart: string | null
  latestFiscalYear: number | null
  latestFiscalPeriod: string | null
  latestCalendarLabel: string | null
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
  latestOperatingQuarterEnd: string | null
  perPatronQuality: MetricQuality | null
  attendanceYoyQuality: MetricQuality | null
  revenuePerPatronYoyQuality: MetricQuality | null
  revenueSourceUrl: string | null
  operatingSourceUrl: string | null
  netDebtCents: number | null
  leaseAdjustedNetDebtCents: number | null
  interestCoverageRatio: number | null
  geographyNote: string | null
  attendanceUsShare: number | null
  admissionsRevenueUsShare: number | null
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
  return calendarQuarterLabel(row.periodEnd)
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
  periodStart: string
  fiscalYear: number | null
  fiscalPeriod: string | null
  calendarLabel: string
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
  attendancePerScreen: number | null
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
export function leaseAdjustedNetDebt(
  debtCents: number | null,
  leaseCents: number | null,
  cashCents: number | null,
): number | null {
  if (debtCents === null || leaseCents === null || cashCents === null) {
    return null
  }
  return debtCents + leaseCents - cashCents
}

export function interestCoverage(
  operatingIncomeCents: number | null,
  interestExpenseCents: number | null,
): number | null {
  if (operatingIncomeCents === null || interestExpenseCents === null || interestExpenseCents === 0) {
    return null
  }
  return operatingIncomeCents / interestExpenseCents
}

function segmentKind(concept: string | null | undefined): 'us' | 'intl' | null {
  const qualifier = !concept
    ? ''
    : concept.includes(':')
      ? concept.slice(concept.indexOf(':') + 1)
      : concept
  const spaced = qualifier.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.]/g, ' ')
  const tokens = spaced.toLowerCase().split(/[^a-z]+/).filter((token) => token.length > 0)
  const isUs = ['domestic', 'us', 'usa'].some((name) => tokens.includes(name))
    || tokens.join(' ').includes('u s')
    || (tokens.includes('united') && tokens.includes('states'))
    || (tokens.includes('north') && tokens.includes('america'))
  if (isUs) {
    return 'us'
  }
  const isIntl = ['international', 'foreign', 'overseas', 'europe', 'emea', 'apac', 'latam'].some((name) => tokens.includes(name))
    || (tokens.includes('latin') && tokens.includes('america'))
    || (tokens.includes('asia') && tokens.includes('pacific'))
    || (tokens.includes('rest') && tokens.includes('world'))
  if (isIntl) {
    return 'intl'
  }
  return null
}

function segmentUsShareAt(rows: OperatorFactRow[], metric: string, periodEnd: string): number | null {
  const flows = rows.filter((row) => row.metric === metric && row.periodEnd === periodEnd && isQuarterlyFlow(row))
  const total = latestFiled(flows.filter((row) => segmentKind(row.concept) === null))
  const usPortion = latestFiled(flows.filter((row) => segmentKind(row.concept) === 'us'))
  const intlPortion = latestFiled(flows.filter((row) => segmentKind(row.concept) === 'intl'))
  if (usPortion && total && usPortion.concept !== total.concept && total.value !== 0) {
    return usPortion.value / total.value
  }
  if (usPortion && intlPortion && usPortion.concept !== intlPortion.concept && usPortion.value + intlPortion.value !== 0) {
    return usPortion.value / (usPortion.value + intlPortion.value)
  }
  return null
}

function geographyNoteAt(rows: OperatorFactRow[], periodEnd: string): string | null {
  const seen: Record<string, true> = {}
  for (const row of rows) {
    if (row.periodEnd !== periodEnd) {
      continue
    }
    if (row.concept === null || row.concept === undefined) {
      continue
    }
    if (segmentKind(row.concept) === null) {
      continue
    }
    seen[row.concept] = true
  }
  const concepts = Object.keys(seen).sort()
  return concepts.length > 0 ? `SEC segment disclosure: ${concepts.join(', ')}` : null
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

function ratioMicrosAt(
  rows: OperatorFactRow[],
  metric: string,
  periodEnd: string,
): number | null {
  const row = latestFiled(
    rows.filter((entry) => entry.metric === metric && entry.periodEnd === periodEnd),
  )
  return row ? row.value / 1_000_000 : null
}

function priorYearQuarterlyValue(
  rows: OperatorFactRow[],
  metric: string,
  currentEnd: string,
): number | null {
  const row = latestFiled(
    rows.filter((entry) => {
      if (entry.metric !== metric || !isQuarterlyFlow(entry)) {
        return false
      }
      const distance = daysBetween(entry.periodEnd, currentEnd)
      return Math.abs(distance - 365) <= YOY_WINDOW_DAYS
    }),
  )
  return row?.value ?? null
}

function estimatedCoreRevenuePerPatronGrowth(
  rows: OperatorFactRow[],
  periodEnd: string,
): number | null {
  const ticketGrowth = ratioMicrosAt(rows, 'average_ticket_price_yoy_ratio', periodEnd)
  const foodBeverageGrowth = ratioMicrosAt(rows, 'food_beverage_per_patron_yoy_ratio', periodEnd)
  const priorAdmissions = priorYearQuarterlyValue(rows, 'admissions_revenue', periodEnd)
  const priorFoodBeverage = priorYearQuarterlyValue(rows, 'food_beverage_revenue', periodEnd)

  if (
    ticketGrowth === null
    || foodBeverageGrowth === null
    || priorAdmissions === null
    || priorFoodBeverage === null
  ) {
    return null
  }

  const priorCoreRevenue = priorAdmissions + priorFoodBeverage
  if (priorCoreRevenue === 0) {
    return null
  }

  return (
    priorAdmissions * ticketGrowth
    + priorFoodBeverage * foodBeverageGrowth
  ) / priorCoreRevenue
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
      const attendanceRow = quarterlyFlowAt(rows, 'attendance', periodEnd)
      const attendanceCount = attendanceRow?.value ?? null
      const admissionsRevenueCents = quarterlyFlowAt(rows, 'admissions_revenue', periodEnd)?.value ?? null
      const foodBeverageRevenueCents = quarterlyFlowAt(rows, 'food_beverage_revenue', periodEnd)?.value ?? null
      const operatingCashFlowCents = quarterlyFlowOrYtdDifference(rows, 'operating_cash_flow', periodEnd)
      const capexCents = quarterlyFlowOrYtdDifference(rows, 'capex', periodEnd)
      const shares = latestFiled(
        rows.filter((row) => row.metric === 'shares_outstanding' && row.periodEnd === periodEnd),
      )
      const screenRow = latestFiled(
        rows.filter((row) => row.metric === 'screen_count' && row.periodEnd === periodEnd),
      )
      const screenCount = screenRow?.value ?? null
      const attendancePerScreen = attendanceRow && screenRow && screenRow.periodEnd === attendanceRow.periodEnd && screenRow.value !== 0
        ? Math.round(attendanceRow.value / screenRow.value)
        : null
      const revenueAnchor = quarterlyFlowAt(rows, 'revenue', periodEnd)
      return {
        periodEnd,
        label: calendarQuarterLabel(periodEnd),
        periodStart: revenueAnchor?.periodStart ?? periodEnd,
        fiscalYear: revenueAnchor?.fiscalYear ?? null,
        fiscalPeriod: revenueAnchor?.fiscalPeriod ?? null,
        calendarLabel: calendarQuarterLabel(periodEnd),
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
        screenCount,
        attendancePerScreen,
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
    latestPeriodStart: null,
    latestFiscalYear: null,
    latestFiscalPeriod: null,
    latestCalendarLabel: null,
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
    latestOperatingQuarterEnd: null,
    perPatronQuality: null,
    attendanceYoyQuality: null,
    revenuePerPatronYoyQuality: null,
    revenueSourceUrl: null,
    operatingSourceUrl: null,
    netDebtCents: null,
    leaseAdjustedNetDebtCents: null,
    interestCoverageRatio: null,
    geographyNote: null,
    attendanceUsShare: null,
    admissionsRevenueUsShare: null,
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
  const latestReportedAttendanceGrowthEnd = latestFilingMetricEnd('attendance_yoy_ratio')
  const latestOperatingQuarterEnd = [latestAttendanceEnd, latestReportedAttendanceGrowthEnd]
    .filter((periodEnd): periodEnd is string => periodEnd !== null)
    .sort((a, b) => b.localeCompare(a))[0] ?? null
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
  const derivedRevenuePerPatronYoyRatio = latestAttendanceEnd
    ? priorYearComparable(history, latestAttendanceEnd, (entry) => entry.revenuePerPatronCents)
    : null
  const estimatedRevenuePerPatronYoyRatio = latestOperatingQuarterEnd
    ? estimatedCoreRevenuePerPatronGrowth(rows, latestOperatingQuarterEnd)
    : null
  const revenuePerPatronYoyRatio = derivedRevenuePerPatronYoyRatio
    ?? estimatedRevenuePerPatronYoyRatio
  const reportedAttendanceYoyRatio = latestOperatingQuarterEnd
    ? ratioMicrosAt(rows, 'attendance_yoy_ratio', latestOperatingQuarterEnd)
    : null
  const attendanceYoyRatio = attendance && latestAttendanceEnd
    ? yoyRatio(rows, 'attendance', latestAttendanceEnd, attendance.value)
    : reportedAttendanceYoyRatio
  const operatingSource = latestOperatingQuarterEnd
    ? latestFiled(rows.filter((row) =>
        row.periodEnd === latestOperatingQuarterEnd
        && (row.metric === 'attendance' || row.metric === 'attendance_yoy_ratio'),
      ))
    : null

  const operatingIncomeCents = quarterlyFlowOrYtdDifference(rows, 'operating_income', latestQuarterEnd)
  const cashCents = instantAt(rows, 'cash', latestQuarterEnd)?.value ?? null
  const longTermDebtCents = debtNoncurrent
    ? debtNoncurrent.value + (debtCurrent?.value ?? 0)
    : null
  const operatingLeaseCents = leaseNoncurrent
    ? leaseNoncurrent.value + (leaseCurrent?.value ?? 0)
    : null
  const interestExpenseCents = quarterlyFlowAt(rows, 'interest_expense', latestQuarterEnd)?.value ?? null
  return {
    ticker: company.ticker,
    name: company.name,
    latestQuarterLabel: quarterLabel(revenue),
    latestQuarterEnd,
    latestPeriodStart: revenue.periodStart,
    latestFiscalYear: revenue.fiscalYear,
    latestFiscalPeriod: revenue.fiscalPeriod,
    latestCalendarLabel: calendarQuarterLabel(latestQuarterEnd),
    revenueCents: revenue.value,
    revenueYoyRatio: yoyRatio(rows, 'revenue', latestQuarterEnd, revenue.value),
    operatingIncomeCents,
    netIncomeCents: quarterlyFlowOrYtdDifference(rows, 'net_income', latestQuarterEnd),
    cashCents,
    longTermDebtCents,
    sharesOutstanding: shares?.value ?? null,
    attendanceCount: attendance?.value ?? null,
    attendanceYoyRatio,
    admissionsRevenueCents: admissions?.value ?? null,
    foodBeverageRevenueCents: foodBeverage?.value ?? null,
    averageTicketPriceCents: perPatron(admissions),
    foodBeveragePerPatronCents: perPatron(foodBeverage),
    revenuePerPatronCents: perPatron(revenueForAttendancePeriod),
    theatreCount: theatres?.value ?? null,
    screenCount: screens?.value ?? null,
    attendancePerScreen,
    interestExpenseCents,
    operatingCashFlowCents,
    capexCents,
    freeCashFlowCents: operatingCashFlowCents !== null && capexCents !== null
      ? operatingCashFlowCents - capexCents
      : null,
    operatingLeaseCents,
    revenuePerPatronYoyRatio,
    latestOperatingQuarterEnd,
    perPatronQuality: attendance ? 'derived' : null,
    attendanceYoyQuality: attendanceYoyRatio === null
      ? null
      : attendance
        ? 'derived'
        : 'reported',
    revenuePerPatronYoyQuality: revenuePerPatronYoyRatio === null
      ? null
      : derivedRevenuePerPatronYoyRatio !== null
        ? 'derived'
        : 'estimated',
    revenueSourceUrl: revenue.sourceUrl ?? null,
    operatingSourceUrl: operatingSource?.sourceUrl ?? null,
    netDebtCents: longTermDebtCents !== null && cashCents !== null ? longTermDebtCents - cashCents : null,
    leaseAdjustedNetDebtCents: leaseAdjustedNetDebt(longTermDebtCents, operatingLeaseCents, cashCents),
    interestCoverageRatio: interestCoverage(operatingIncomeCents, interestExpenseCents),
    geographyNote: latestOperatingQuarterEnd ? geographyNoteAt(rows, latestOperatingQuarterEnd) : null,
    attendanceUsShare: latestAttendanceEnd ? segmentUsShareAt(rows, 'attendance', latestAttendanceEnd) : null,
    admissionsRevenueUsShare: latestAdmissionsEnd ? segmentUsShareAt(rows, 'admissions_revenue', latestAdmissionsEnd) : null,
  }
}
