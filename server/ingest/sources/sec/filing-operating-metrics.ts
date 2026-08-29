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
  unit: 'count' | 'usd_cents'
  currentQuarter: QuarterlyValue
  priorYearQuarter: QuarterlyValue
}

type PairPick = 'first_pair' | 'consolidated_group'

type PeriodShape = 'quarter' | 'instant'

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

function shiftYears(date: string, years: number): string {
  const [year, month, day] = date.split('-')
  return `${Number(year) + years}-${month}-${day}`
}

function pickPair(values: number[], pick: PairPick): { current: number, prior: number } | null {
  if (pick === 'consolidated_group') {
    return values.length >= 3
      ? { current: values[values.length - 3]!, prior: values[values.length - 2]! }
      : null
  }
  return values.length >= 2 ? { current: values[0]!, prior: values[1]! } : null
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
          .filter((text) => /^[\d,]+(\.\d+)?$/.test(text))
          .map((text) => Number(text.replaceAll(',', '')))
        if (values.length > 0) {
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

    const currentStart = config.periodShape === 'instant' ? reportDate : periodStart
    metrics.push({
      metric: config.metric,
      concept: config.concept,
      unit: config.unit,
      currentQuarter: { periodStart: currentStart, periodEnd: reportDate, value: current },
      priorYearQuarter: {
        periodStart: shiftYears(currentStart, -1),
        periodEnd: shiftYears(reportDate, -1),
        value: prior,
      },
    })
  }

  return metrics
}
