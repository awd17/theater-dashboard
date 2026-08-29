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

    expect(metric(metrics, 'revenue')?.currentQuarter.value).toBe(108_640_000_000)
    expect(metric(metrics, 'attendance')?.currentQuarter.value).toBe(63_700_000)
    expect(metric(metrics, 'admissions_revenue')?.currentQuarter.value).toBe(54_000_000_000)
    expect(metric(metrics, 'food_beverage_revenue')?.currentQuarter.value).toBe(43_330_000_000)
    expect(metric(metrics, 'food_beverage_revenue')?.concept).toBe('filing_text:Concession')
  })

  it('supplements lagging Cinemark company facts from the latest filing', () => {
    const html = `
      <table>
        <tr><td>Operating income</td><td>233.0</td><td>173.5</td></tr>
        <tr><td>Net income</td><td>140.8</td><td>94.7</td></tr>
        <tr><td>Cash and cash equivalents</td><td>504.3</td><td>344.3</td></tr>
        <tr><td>Current portion of long-term debt</td><td>6.3</td><td>6.4</td></tr>
        <tr><td>Long-term debt, less current portion</td><td>1,870.5</td><td>1,869.2</td></tr>
        <tr><td>Current portion of operating lease obligations</td><td>215.2</td><td>215.0</td></tr>
        <tr><td>Operating lease obligations, less current portion</td><td>773.9</td><td>791.0</td></tr>
        <tr><td>Net cash provided by operating activities</td><td>339.7</td><td>156.8</td></tr>
        <tr><td>Total capital expenditures</td><td>61.6</td><td>30.1</td></tr>
      </table>
      <p>We operated 495 theaters with 5,620 screens worldwide as of June 30, 2026.</p>
      <p>Common stock: 152,040,303 shares issued and 115,914,689 shares outstanding at June 30, 2026.</p>
    `
    const metrics = parseFilingOperatingMetrics(html, 'CNK', '2026-06-30')

    expect(metric(metrics, 'operating_income')?.currentQuarter.value).toBe(23_300_000_000)
    expect(metric(metrics, 'net_income')?.currentQuarter.value).toBe(14_080_000_000)
    expect(metric(metrics, 'cash')?.currentQuarter.value).toBe(50_430_000_000)
    expect(metric(metrics, 'long_term_debt_current')?.currentQuarter.value).toBe(630_000_000)
    expect(metric(metrics, 'long_term_debt_noncurrent')?.currentQuarter.value).toBe(187_050_000_000)
    expect(metric(metrics, 'operating_lease_current')?.currentQuarter.value).toBe(21_520_000_000)
    expect(metric(metrics, 'operating_lease_noncurrent')?.currentQuarter.value).toBe(77_390_000_000)
    expect(metric(metrics, 'operating_cash_flow')?.currentQuarter).toMatchObject({
      periodStart: '2026-01-01',
      value: 33_970_000_000,
    })
    expect(metric(metrics, 'capex')?.currentQuarter).toMatchObject({
      periodStart: '2026-04-01',
      value: 6_160_000_000,
    })
    expect(metric(metrics, 'theatre_count')?.currentQuarter.value).toBe(495)
    expect(metric(metrics, 'shares_outstanding')?.currentQuarter.value).toBe(115_914_689)
  })

  it('preserves negative Cinemark operating cash flow from first-quarter filings', () => {
    const html = `
      <table>
        <tr><td>Net cash used for operating activities</td><td>(20.4</td><td>)</td><td>(119.1</td><td>)</td></tr>
      </table>
    `
    const metrics = parseFilingOperatingMetrics(html, 'CNK', '2026-03-31')

    expect(metric(metrics, 'operating_cash_flow')?.currentQuarter).toMatchObject({
      periodStart: '2026-01-01',
      value: -2_040_000_000,
    })
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

  it('reads Marcus reported growth, footprint, and multi-class shares', () => {
    const html = `
      <table>
        <tr>
          <td>Total Revenues</td>
          <td>150,648</td><td>80,984</td><td>231,632</td>
          <td>131,650</td><td>74,282</td><td>205,932</td>
        </tr>
      </table>
      <p>Total theatre attendance for our comparable theatres increased 10.9% during the second quarter.</p>
      <p>Our average ticket price increased 5.2% and 6.2% during the second quarter and first half.</p>
      <p>Our average concession revenues per person increased by 2.4% and 2.6% during the second quarter and first half.</p>
      <p>We ended the second quarter with a total of 961 company-owned screens in 76 theatres and 14 managed screens at one theatre.</p>
      <p>Common Stock, $1 par; authorized 50,000,000 shares; issued 25,369,054 shares at June 30, 2026.</p>
      <p>Class B Common Stock, $1 par; authorized 33,000,000 shares; issued and outstanding 6,984,584 shares at June 30, 2026.</p>
      <p>Less cost of Common Stock in treasury (1,569,624 shares at June 30, 2026).</p>
    `
    const metrics = parseFilingOperatingMetrics(html, 'MCS', '2026-06-30')

    expect(metric(metrics, 'theatre_revenue')?.currentQuarter.value).toBe(15_064_800_000)
    expect(metric(metrics, 'attendance_yoy_ratio')?.currentQuarter.value).toBe(109_000)
    expect(metric(metrics, 'average_ticket_price_yoy_ratio')?.currentQuarter.value).toBe(52_000)
    expect(metric(metrics, 'food_beverage_per_patron_yoy_ratio')?.currentQuarter.value).toBe(24_000)
    expect(metric(metrics, 'theatre_count')?.currentQuarter.value).toBe(77)
    expect(metric(metrics, 'screen_count')?.currentQuarter.value).toBe(975)
    expect(metric(metrics, 'shares_outstanding')?.currentQuarter.value).toBe(30_784_014)
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
