import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  filingMetricsConfigured,
  parseFilingOperatingMetrics,
} from '../../server/ingest/sources/sec/filing-operating-metrics'

const fixturesDir = join(__dirname, '..', 'fixtures', 'sec')
const amcHtml = readFileSync(join(fixturesDir, 'operating-tables-amc.html'), 'utf8')
const cnkHtml = readFileSync(join(fixturesDir, 'operating-tables-cnk.html'), 'utf8')
const mcsHtml = readFileSync(join(fixturesDir, 'operating-tables-mcs.html'), 'utf8')

function metric(metrics: ReturnType<typeof parseFilingOperatingMetrics>, name: string) {
  return metrics.find((entry) => entry.metric === name)
}

describe('parseFilingOperatingMetrics', () => {
  it('reads AMC attendance, admissions, and food & beverage revenue', () => {
    const metrics = parseFilingOperatingMetrics(amcHtml, 'AMC', '2026-06-30')

    expect(metric(metrics, 'attendance')?.currentQuarter.value).toBe(71_290_000)
    expect(metric(metrics, 'attendance')?.priorYearQuarter.value).toBe(62_807_000)
    expect(metric(metrics, 'admissions_revenue')?.currentQuarter.value).toBe(86_310_000_000)
    expect(metric(metrics, 'food_beverage_revenue')?.currentQuarter.value).toBe(57_610_000_000)
    expect(metric(metrics, 'food_beverage_revenue')?.priorYearQuarter.value).toBe(49_960_000_000)
  })

  it('reads AMC period-end theatre and screen counts as instants', () => {
    const metrics = parseFilingOperatingMetrics(amcHtml, 'AMC', '2026-06-30')
    const theatres = metric(metrics, 'theatre_count')
    const screens = metric(metrics, 'screen_count')

    expect(theatres?.currentQuarter.value).toBe(845)
    expect(theatres?.priorYearQuarter.value).toBe(864)
    expect(screens?.currentQuarter.value).toBe(9_530)
    expect(screens?.currentQuarter.periodStart).toBe('2026-06-30')
    expect(screens?.currentQuarter.periodEnd).toBe('2026-06-30')
    expect(screens?.priorYearQuarter.periodEnd).toBe('2025-06-30')
  })

  it('reads Cinemark consolidated attendance and revenue split', () => {
    const metrics = parseFilingOperatingMetrics(cnkHtml, 'CNK', '2026-06-30')

    expect(metric(metrics, 'attendance')?.currentQuarter.value).toBe(63_700_000)
    expect(metric(metrics, 'admissions_revenue')?.currentQuarter.value).toBe(54_000_000_000)
    expect(metric(metrics, 'food_beverage_revenue')?.currentQuarter.value).toBe(43_330_000_000)
    expect(metric(metrics, 'food_beverage_revenue')?.concept).toBe('filing_text:Concession')
  })

  it('reads Cinemark average screen count as a quarterly figure', () => {
    const metrics = parseFilingOperatingMetrics(cnkHtml, 'CNK', '2026-06-30')
    const screens = metric(metrics, 'screen_count')

    expect(screens?.currentQuarter.value).toBe(5_620)
    expect(screens?.currentQuarter.periodStart).toBe('2026-04-01')
    expect(screens?.concept).toBe('filing_text:AverageScreenCount')
    expect(metric(metrics, 'theatre_count')).toBeUndefined()
  })

  it('reads Marcus revenue split reported in thousands, with no attendance', () => {
    const metrics = parseFilingOperatingMetrics(mcsHtml, 'MCS', '2026-06-30')

    expect(metric(metrics, 'attendance')).toBeUndefined()
    expect(metric(metrics, 'admissions_revenue')?.currentQuarter.value).toBe(7_255_700_000)
    expect(metric(metrics, 'food_beverage_revenue')?.currentQuarter.value).toBe(6_526_400_000)
  })

  it('assigns quarter periods from the report date, shifting the prior year', () => {
    const metrics = parseFilingOperatingMetrics(amcHtml, 'AMC', '2026-09-30')
    const attendance = metric(metrics, 'attendance')

    expect(attendance?.currentQuarter.periodStart).toBe('2026-07-01')
    expect(attendance?.priorYearQuarter.periodEnd).toBe('2025-09-30')
  })

  it('returns nothing for companies without a configuration', () => {
    expect(filingMetricsConfigured('XYZ')).toBe(false)
    expect(parseFilingOperatingMetrics(amcHtml, 'XYZ', '2026-06-30')).toEqual([])
  })

  it('skips rows with implausible values instead of storing garbage', () => {
    const html = '<html><body><table><tr><td>Attendance (in thousands)</td><td>3</td><td>2</td></tr></table></body></html>'
    expect(parseFilingOperatingMetrics(html, 'AMC', '2026-06-30')).toEqual([])
  })
})
