import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  attendanceStrategyExists,
  parseFilingAttendance,
} from '../../server/ingest/sources/sec/filing-attendance'

const fixturesDir = join(__dirname, '..', 'fixtures', 'sec')
const amcHtml = readFileSync(join(fixturesDir, 'attendance-table-amc.html'), 'utf8')
const cnkHtml = readFileSync(join(fixturesDir, 'attendance-table-cnk.html'), 'utf8')

describe('parseFilingAttendance', () => {
  it('reads AMC consolidated quarterly attendance in thousands', () => {
    const result = parseFilingAttendance(amcHtml, 'AMC', '2026-06-30')
    expect(result).toEqual({
      currentQuarter: { periodStart: '2026-04-01', periodEnd: '2026-06-30', value: 71_290_000 },
      priorYearQuarter: { periodStart: '2025-04-01', periodEnd: '2025-06-30', value: 62_807_000 },
    })
  })

  it('reads Cinemark consolidated attendance from the last segment group in millions', () => {
    const result = parseFilingAttendance(cnkHtml, 'CNK', '2026-06-30')
    expect(result).toEqual({
      currentQuarter: { periodStart: '2026-04-01', periodEnd: '2026-06-30', value: 63_700_000 },
      priorYearQuarter: { periodStart: '2025-04-01', periodEnd: '2025-06-30', value: 57_900_000 },
    })
  })

  it('maps report dates in other quarters to the right period starts', () => {
    const result = parseFilingAttendance(amcHtml, 'AMC', '2026-09-30')
    expect(result?.currentQuarter.periodStart).toBe('2026-07-01')
    expect(result?.priorYearQuarter.periodEnd).toBe('2025-09-30')
  })

  it('returns null for companies without an extraction strategy', () => {
    expect(attendanceStrategyExists('MCS')).toBe(false)
    expect(parseFilingAttendance(amcHtml, 'MCS', '2026-06-30')).toBeNull()
  })

  it('returns null when no attendance row is present', () => {
    const html = '<html><body><table><tr><td>Revenues</td><td>1,000</td></tr></table></body></html>'
    expect(parseFilingAttendance(html, 'AMC', '2026-06-30')).toBeNull()
  })

  it('rejects implausible attendance values instead of storing garbage', () => {
    const html = '<html><body><table><tr><td>Attendance (in thousands)</td><td>3</td><td>2</td></tr></table></body></html>'
    expect(parseFilingAttendance(html, 'AMC', '2026-06-30')).toBeNull()
  })
})
