import { describe, expect, it } from 'vitest'
import { parseFilingOperatingMetrics } from '../../server/ingest/sources/sec/filing-operating-metrics'

describe('10-K operating metric periods', () => {
  it('maps year-end 10-K report dates to fourth-quarter windows for quarterly rows', () => {
    const html = `
      <table>
        <tr><td>Attendance</td><td>71,290</td><td>62,807</td></tr>
        <tr><td>Admissions</td><td>863.1</td><td>760.2</td></tr>
        <tr><td>Food and beverage</td><td>576.1</td><td>499.6</td></tr>
        <tr><td>Number of theatres operated</td><td>845</td><td>864</td></tr>
        <tr><td>Number of screens operated</td><td>9,530</td><td>9,800</td></tr>
      </table>
    `

    const metrics = parseFilingOperatingMetrics(html, 'AMC', '2025-12-31')
    const attendance = metrics.find((entry) => entry.metric === 'attendance')

    expect(attendance?.currentQuarter).toMatchObject({
      periodStart: '2025-10-01',
      periodEnd: '2025-12-31',
      value: 71_290_000,
    })
    expect(attendance?.priorYearQuarter).toMatchObject({
      periodStart: '2024-10-01',
      periodEnd: '2024-12-31',
      value: 62_807_000,
    })
  })
})
