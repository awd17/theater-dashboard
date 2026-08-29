import { parse as parseHtml } from 'node-html-parser'
import { z } from 'zod'

export interface QuarterlyValue {
  periodStart: string
  periodEnd: string
  value: number
}

export interface FilingOperatingMetric {
  metric: string
  concept: string
  unit: 'count' | 'usd_cents' | 'ratio_micros'
  currentQuarter: QuarterlyValue
  priorYearQuarter: QuarterlyValue | null
}

type PairPick = 'first_pair' | 'consolidated_group' | 'theatre_segment'

type PeriodShape = 'quarter' | 'instant' | 'year_to_date'

interface FilingRowConfig {
  metric: string
  concept: string
  labelPattern: RegExp
  unit: 'count' | 'usd_cents'
  scale: number
  pick: PairPick
  periodShape: PeriodShape
  minValue: number
  maxValue: number
  includePrior?: boolean
}

const ATTENDANCE_BOUNDS = { minValue: 1_000_000, maxValue: 500_000_000 }
const QUARTERLY_REVENUE_CENTS_BOUNDS = { minValue: 100_000_000, maxValue: 1_000_000_000_000 }
const THEATRE_COUNT_BOUNDS = { minValue: 10, maxValue: 5_000 }
const SCREEN_COUNT_BOUNDS = { minValue: 100, maxValue: 50_000 }

const MILLIONS_TO_CENTS = 100_000_000
const THOUSANDS_TO_CENTS = 100_000

const companyConfigs: Record<string, FilingRowConfig[]> = {
  AMC: [
    {
      metric: 'attendance',
      concept: 'filing_text:Attendance',
      labelPattern: /^Attendance/i,
      unit: 'count',
      scale: 1_000,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...ATTENDANCE_BOUNDS,
    },
    {
      metric: 'admissions_revenue',
      concept: 'filing_text:Admissions',
      labelPattern: /^Admissions$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...QUARTERLY_REVENUE_CENTS_BOUNDS,
    },
    {
      metric: 'food_beverage_revenue',
      concept: 'filing_text:FoodAndBeverage',
      labelPattern: /^Food and beverage$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...QUARTERLY_REVENUE_CENTS_BOUNDS,
    },
    {
      metric: 'theatre_count',
      concept: 'filing_text:NumberOfTheatresOperated',
      labelPattern: /^Number of theatres operated$/i,
      unit: 'count',
      scale: 1,
      pick: 'first_pair',
      periodShape: 'instant',
      ...THEATRE_COUNT_BOUNDS,
    },
    {
      metric: 'screen_count',
      concept: 'filing_text:NumberOfScreensOperated',
      labelPattern: /^Number of screens operated$/i,
      unit: 'count',
      scale: 1,
      pick: 'first_pair',
      periodShape: 'instant',
      ...SCREEN_COUNT_BOUNDS,
    },
  ],
  CNK: [
    {
      metric: 'revenue',
      concept: 'filing_text:TotalRevenue',
      labelPattern: /^Total revenue$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...QUARTERLY_REVENUE_CENTS_BOUNDS,
    },
    {
      metric: 'operating_income',
      concept: 'filing_text:OperatingIncome',
      labelPattern: /^Operating income$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      minValue: -100_000_000_000,
      maxValue: 500_000_000_000,
    },
    {
      metric: 'net_income',
      concept: 'filing_text:NetIncome',
      labelPattern: /^Net income$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      minValue: -100_000_000_000,
      maxValue: 500_000_000_000,
    },
    {
      metric: 'cash',
      concept: 'filing_text:CashAndCashEquivalents',
      labelPattern: /^Cash and cash equivalents$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'instant',
      minValue: 0,
      maxValue: 1_000_000_000_000,
      includePrior: false,
    },
    {
      metric: 'long_term_debt_current',
      concept: 'filing_text:CurrentPortionOfLongTermDebt',
      labelPattern: /^Current portion of long-term debt$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'instant',
      minValue: 0,
      maxValue: 1_000_000_000_000,
      includePrior: false,
    },
    {
      metric: 'long_term_debt_noncurrent',
      concept: 'filing_text:LongTermDebtLessCurrentPortion',
      labelPattern: /^Long-term debt, less current portion$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'instant',
      minValue: 0,
      maxValue: 1_000_000_000_000,
      includePrior: false,
    },
    {
      metric: 'operating_lease_current',
      concept: 'filing_text:CurrentOperatingLeaseObligations',
      labelPattern: /^Current portion of operating lease obligations$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'instant',
      minValue: 0,
      maxValue: 1_000_000_000_000,
      includePrior: false,
    },
    {
      metric: 'operating_lease_noncurrent',
      concept: 'filing_text:OperatingLeaseObligationsLessCurrentPortion',
      labelPattern: /^Operating lease obligations, less current portion$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'instant',
      minValue: 0,
      maxValue: 1_000_000_000_000,
      includePrior: false,
    },
    {
      metric: 'operating_cash_flow',
      concept: 'filing_text:NetCashProvidedByOperatingActivities',
      labelPattern: /^Net cash (?:provided by|used for) operating activities$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'year_to_date',
      minValue: -1_000_000_000_000,
      maxValue: 1_000_000_000_000,
    },
    {
      metric: 'capex',
      concept: 'filing_text:TotalCapitalExpenditures',
      labelPattern: /^Total capital expenditures$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      minValue: 0,
      maxValue: 1_000_000_000_000,
    },
    {
      metric: 'attendance',
      concept: 'filing_text:Attendance',
      labelPattern: /^Attendance$/i,
      unit: 'count',
      scale: 1_000_000,
      pick: 'consolidated_group',
      periodShape: 'quarter',
      ...ATTENDANCE_BOUNDS,
    },
    {
      metric: 'admissions_revenue',
      concept: 'filing_text:Admissions',
      labelPattern: /^Admissions$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...QUARTERLY_REVENUE_CENTS_BOUNDS,
    },
    {
      metric: 'food_beverage_revenue',
      concept: 'filing_text:Concession',
      labelPattern: /^Concession$/i,
      unit: 'usd_cents',
      scale: MILLIONS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...QUARTERLY_REVENUE_CENTS_BOUNDS,
    },
    {
      metric: 'screen_count',
      concept: 'filing_text:AverageScreenCount',
      labelPattern: /^Average screen count/i,
      unit: 'count',
      scale: 1,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...SCREEN_COUNT_BOUNDS,
    },
  ],
  MCS: [
    {
      metric: 'theatre_revenue',
      concept: 'filing_text:TheatreSegmentRevenue',
      labelPattern: /^Total Revenues$/i,
      unit: 'usd_cents',
      scale: THOUSANDS_TO_CENTS,
      pick: 'theatre_segment',
      periodShape: 'quarter',
      ...QUARTERLY_REVENUE_CENTS_BOUNDS,
    },
    {
      metric: 'admissions_revenue',
      concept: 'filing_text:TheatreAdmissions',
      labelPattern: /^Theatre admissions$/i,
      unit: 'usd_cents',
      scale: THOUSANDS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...QUARTERLY_REVENUE_CENTS_BOUNDS,
    },
    {
      metric: 'food_beverage_revenue',
      concept: 'filing_text:TheatreConcessions',
      labelPattern: /^Theatre concessions$/i,
      unit: 'usd_cents',
      scale: THOUSANDS_TO_CENTS,
      pick: 'first_pair',
      periodShape: 'quarter',
      ...QUARTERLY_REVENUE_CENTS_BOUNDS,
    },
  ],
}

export function filingMetricsConfigured(ticker: string): boolean {
  return ticker in companyConfigs
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function quarterStartFor(quarterEnd: string): string {
  const end = new Date(`${quarterEnd}T00:00:00.000Z`)
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1))
  return start.toISOString().slice(0, 10)
}

function yearStartFor(periodEnd: string): string {
  return `${periodEnd.slice(0, 4)}-01-01`
}

function shiftYears(date: string, years: number): string {
  const [year, month, day] = date.split('-')
  return `${Number(year) + years}-${month}-${day}`
}

function pickPair(values: number[], pick: PairPick): { current: number, prior: number } | null {
  if (pick === 'theatre_segment') {
    return values.length >= 6
      ? { current: values[0]!, prior: values[3]! }
      : null
  }
  if (pick === 'consolidated_group') {
    return values.length >= 3
      ? { current: values[values.length - 3]!, prior: values[values.length - 2]! }
      : null
  }
  return values.length >= 2 ? { current: values[0]!, prior: values[1]! } : null
}

function parseNumericCell(text: string): number | null {
  const normalized = text.replaceAll('$', '').replaceAll(',', '').trim()
  const match = normalized.match(/^(\()?(-?\d+(?:\.\d+)?)\)?$/)
  if (!match) {
    return null
  }
  const value = Number(match[2])
  return match[1] ? -Math.abs(value) : value
}

function firstRowValuesPerMetric(
  html: string,
  configs: FilingRowConfig[],
): Map<string, number[]> {
  const root = parseHtml(html)
  const found = new Map<string, number[]>()

  for (const table of root.querySelectorAll('table')) {
    for (const tr of table.querySelectorAll('tr')) {
      const cellTexts = tr
        .querySelectorAll('td, th')
        .map((cell) => cell.text.replace(/\s+/g, ' ').trim())
      const label = cellTexts.find((text) => text.length > 0)
      if (!label) {
        continue
      }

      for (const config of configs) {
        if (found.has(config.metric) || !config.labelPattern.test(label)) {
          continue
        }
        const values = cellTexts
          .map(parseNumericCell)
          .filter((value): value is number => value !== null)
        if (values.length > 0 && pickPair(values, config.pick)) {
          found.set(config.metric, values)
        }
      }
    }
    if (found.size === configs.length) {
      break
    }
  }

  return found
}

function signedRatioMicros(direction: string, percentage: string): number {
  const sign = direction.toLowerCase() === 'decreased' ? -1 : 1
  return Math.round(sign * Number(percentage) * 10_000)
}

function narrativeMetrics(
  html: string,
  ticker: string,
  reportDate: string,
): FilingOperatingMetric[] {
  const text = parseHtml(html).structuredText.replace(/\s+/g, ' ').trim()
  const metrics: FilingOperatingMetric[] = []

  const addInstantCount = (metric: string, concept: string, value: number) => {
    metrics.push({
      metric,
      concept,
      unit: 'count',
      currentQuarter: { periodStart: reportDate, periodEnd: reportDate, value },
      priorYearQuarter: null,
    })
  }
  const addQuarterRatio = (metric: string, concept: string, value: number) => {
    metrics.push({
      metric,
      concept,
      unit: 'ratio_micros',
      currentQuarter: {
        periodStart: quarterStartFor(reportDate),
        periodEnd: reportDate,
        value,
      },
      priorYearQuarter: null,
    })
  }

  if (ticker === 'CNK') {
    const footprint = text.match(
      /We operated ([\d,]+) theaters with ([\d,]+) screens worldwide as of/i,
    )
    if (footprint) {
      addInstantCount('theatre_count', 'filing_text:NumberOfTheatresOperated', Number(footprint[1]!.replaceAll(',', '')))
      addInstantCount('screen_count', 'filing_text:NumberOfScreensOperated', Number(footprint[2]!.replaceAll(',', '')))
    }

    const shares = text.match(
      /shares issued and ([\d,]+) shares outstanding at [A-Z][a-z]+ \d{1,2}, \d{4}/i,
    )
    if (shares) {
      addInstantCount('shares_outstanding', 'filing_text:SharesOutstanding', Number(shares[1]!.replaceAll(',', '')))
    }
  }

  if (ticker === 'MCS') {
    const attendanceGrowth = text.match(
      /Total theatre attendance for our comparable theatres (increased|decreased) ([\d.]+)%/i,
    )
    if (attendanceGrowth) {
      addQuarterRatio(
        'attendance_yoy_ratio',
        'filing_text:ComparableAttendanceGrowth',
        signedRatioMicros(attendanceGrowth[1]!, attendanceGrowth[2]!),
      )
    }

    const ticketGrowth = text.match(
      /average ticket price (increased|decreased)(?: by)? ([\d.]+)%/i,
    )
    if (ticketGrowth) {
      addQuarterRatio(
        'average_ticket_price_yoy_ratio',
        'filing_text:AverageTicketPriceGrowth',
        signedRatioMicros(ticketGrowth[1]!, ticketGrowth[2]!),
      )
    }

    const concessionGrowth = text.match(
      /average concession revenues per person (increased|decreased)(?: by)? ([\d.]+)%/i,
    )
    if (concessionGrowth) {
      addQuarterRatio(
        'food_beverage_per_patron_yoy_ratio',
        'filing_text:ConcessionRevenuePerPersonGrowth',
        signedRatioMicros(concessionGrowth[1]!, concessionGrowth[2]!),
      )
    }

    const footprint = text.match(
      /with a total of ([\d,]+) company-owned screens in ([\d,]+) theatres and ([\d,]+) managed screens at (one|[\d,]+) theatre/i,
    )
    if (footprint) {
      const screens = Number(footprint[1]!.replaceAll(',', '')) + Number(footprint[3]!.replaceAll(',', ''))
      const managedTheatres = footprint[4]!.toLowerCase() === 'one'
        ? 1
        : Number(footprint[4]!.replaceAll(',', ''))
      const theatres = Number(footprint[2]!.replaceAll(',', '')) + managedTheatres
      addInstantCount('theatre_count', 'filing_text:NumberOfTheatresOperated', theatres)
      addInstantCount('screen_count', 'filing_text:NumberOfScreensOperated', screens)
    }

    const commonStock = text.match(
      /Common Stock, \$1 par;[^.]*?issued ([\d,]+) shares at [A-Z][a-z]+ \d{1,2}, \d{4}/i,
    )
    const classBStock = text.match(
      /Class B Common Stock, \$1 par;[^.]*?issued and outstanding ([\d,]+) shares at [A-Z][a-z]+ \d{1,2}, \d{4}/i,
    )
    const treasuryStock = text.match(
      /Less cost of Common Stock in treasury \(([\d,]+) shares at [A-Z][a-z]+ \d{1,2}, \d{4}/i,
    )
    if (commonStock && classBStock && treasuryStock) {
      const sharesOutstanding = Number(commonStock[1]!.replaceAll(',', ''))
        + Number(classBStock[1]!.replaceAll(',', ''))
        - Number(treasuryStock[1]!.replaceAll(',', ''))
      addInstantCount('shares_outstanding', 'filing_text:SharesOutstandingIncludingClassB', sharesOutstanding)
    }
  }

  return metrics
}

export function parseFilingOperatingMetrics(
  html: string,
  ticker: string,
  reportDate: string,
): FilingOperatingMetric[] {
  const configs = companyConfigs[ticker]
  if (!configs) {
    return []
  }

  isoDateSchema.parse(reportDate)

  const rowValues = firstRowValuesPerMetric(html, configs)
  const periodStart = quarterStartFor(reportDate)
  const metrics: FilingOperatingMetric[] = []

  for (const config of configs) {
    const values = rowValues.get(config.metric)
    if (!values) {
      continue
    }

    const pair = pickPair(values, config.pick)
    if (!pair) {
      continue
    }

    const current = Math.round(pair.current * config.scale)
    const prior = Math.round(pair.prior * config.scale)
    const plausible = (value: number) => value >= config.minValue && value <= config.maxValue
    if (!plausible(current) || !plausible(prior)) {
      continue
    }

    const currentStart = config.periodShape === 'instant'
      ? reportDate
      : config.periodShape === 'year_to_date'
        ? yearStartFor(reportDate)
        : periodStart
    metrics.push({
      metric: config.metric,
      concept: config.concept,
      unit: config.unit,
      currentQuarter: { periodStart: currentStart, periodEnd: reportDate, value: current },
      priorYearQuarter: config.includePrior === false
        ? null
        : {
            periodStart: shiftYears(currentStart, -1),
            periodEnd: shiftYears(reportDate, -1),
            value: prior,
          },
    })
  }

  for (const metric of narrativeMetrics(html, ticker, reportDate)) {
    const duplicate = metrics.some((entry) =>
      entry.metric === metric.metric
      && entry.currentQuarter.periodEnd === metric.currentQuarter.periodEnd,
    )
    if (!duplicate) {
      metrics.push(metric)
    }
  }

  return metrics
}
