import { describe, expect, it } from 'vitest'
import { findLatestFiling, findRecentFilings } from '../../server/ingest/sources/sec/submissions'

const submissions = {
  filings: {
    recent: {
      accessionNumber: ['a', 'b', 'c', 'd'],
      form: ['8-K', '10-Q', '10-K', '10-Q'],
      primaryDocument: ['a.htm', 'b.htm', 'c.htm', 'd.htm'],
      reportDate: ['2026-07-01', '2026-06-30', '2025-12-31', '2026-03-31'],
      filingDate: ['2026-07-20', '2026-07-23', '2026-02-20', '2026-05-01'],
    },
  },
}

describe('SEC submissions', () => {
  it('returns recent matching filings in submission order', () => {
    expect(findRecentFilings(submissions, ['10-Q'], 2)).toEqual([
      {
        accession: 'b',
        form: '10-Q',
        primaryDocument: 'b.htm',
        reportDate: '2026-06-30',
        filingDate: '2026-07-23',
      },
      {
        accession: 'd',
        form: '10-Q',
        primaryDocument: 'd.htm',
        reportDate: '2026-03-31',
        filingDate: '2026-05-01',
      },
    ])
  })

  it('includes 10-K filings when requested for annual coverage', () => {
    expect(findRecentFilings(submissions, ['10-Q', '10-K'], 3)).toEqual([
      {
        accession: 'b',
        form: '10-Q',
        primaryDocument: 'b.htm',
        reportDate: '2026-06-30',
        filingDate: '2026-07-23',
      },
      {
        accession: 'c',
        form: '10-K',
        primaryDocument: 'c.htm',
        reportDate: '2025-12-31',
        filingDate: '2026-02-20',
      },
      {
        accession: 'd',
        form: '10-Q',
        primaryDocument: 'd.htm',
        reportDate: '2026-03-31',
        filingDate: '2026-05-01',
      },
    ])
  })

  it('uses the first matching filing as the latest', () => {
    expect(findLatestFiling(submissions, ['10-Q'])?.accession).toBe('b')
    expect(findLatestFiling(submissions, ['10-K'])?.accession).toBe('c')
  })

  it('does not treat 8-K exhibits as operating filing coverage', () => {
    expect(findRecentFilings(submissions, ['10-Q', '10-K'], 8).map((filing) => filing.form))
      .not
      .toContain('8-K')
  })
})
