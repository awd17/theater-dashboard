import { parse as parseHtml } from 'node-html-parser'
import { z } from 'zod'

export interface QuarterlyAttendance {
  periodStart: string
  periodEnd: string
  value: number
}

export interface FilingAttendance {
  currentQuarter: QuarterlyAttendance
  priorYearQuarter: QuarterlyAttendance
}

interface AttendanceStrategy {
  scale: number
  pickPair: (values: number[]) => { current: number, prior: number } | null
}

const strategies: Record<string, AttendanceStrategy> = {
  AMC: {
    scale: 1_000,
    pickPair: (values) =>
      values.length >= 2 ? { current: values[0]!, prior: values[1]! } : null,
  },
  CNK: {
    scale: 1_000_000,
    pickPair: (values) =>
      values.length >= 3
        ? { current: values[values.length - 3]!, prior: values[values.length - 2]! }
        : null,
  },
}

export function attendanceStrategyExists(ticker: string): boolean {
  return ticker in strategies
}

const MIN_QUARTERLY_ATTENDANCE = 1_000_000
const MAX_QUARTERLY_ATTENDANCE = 500_000_000

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

function firstAttendanceRowValues(html: string): number[] | null {
  const root = parseHtml(html)

  for (const table of root.querySelectorAll('table')) {
    for (const tr of table.querySelectorAll('tr')) {
      const cellTexts = tr
        .querySelectorAll('td, th')
        .map((cell) => cell.text.replace(/\s+/g, ' ').trim())
      const label = cellTexts.find((text) => text.length > 0)
      if (!label || !/^Attendance/i.test(label)) {
        continue
      }

      const values = cellTexts
        .filter((text) => /^[\d,]+(\.\d+)?$/.test(text))
        .map((text) => Number(text.replaceAll(',', '')))
      if (values.length > 0) {
        return values
      }
    }
  }

  return null
}

export function parseFilingAttendance(
  html: string,
  ticker: string,
  reportDate: string,
): FilingAttendance | null {
  const strategy = strategies[ticker]
  if (!strategy) {
    return null
  }

  isoDateSchema.parse(reportDate)

  const values = firstAttendanceRowValues(html)
  if (!values) {
    return null
  }

  const pair = strategy.pickPair(values)
  if (!pair) {
    return null
  }

  const current = Math.round(pair.current * strategy.scale)
  const prior = Math.round(pair.prior * strategy.scale)

  const plausible = (value: number) =>
    value >= MIN_QUARTERLY_ATTENDANCE && value <= MAX_QUARTERLY_ATTENDANCE
  if (!plausible(current) || !plausible(prior)) {
    return null
  }

  const periodStart = quarterStartFor(reportDate)

  return {
    currentQuarter: { periodStart, periodEnd: reportDate, value: current },
    priorYearQuarter: {
      periodStart: shiftYears(periodStart, -1),
      periodEnd: shiftYears(reportDate, -1),
      value: prior,
    },
  }
}
