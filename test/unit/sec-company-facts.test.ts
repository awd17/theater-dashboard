import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCompanyFacts } from '../../server/ingest/sources/sec/company-facts'

const fixture = JSON.parse(
  readFileSync(join(import.meta.dirname, '../fixtures/sec/companyfacts-amc-trimmed.json'), 'utf8'),
)

describe('parseCompanyFacts', () => {
  const parsed = parseCompanyFacts(fixture)

  it('reads the entity name', () => {
    expect(parsed.entityName).toBe('AMC ENTERTAINMENT HOLDINGS, INC.')
  })

  it('extracts facts for configured metrics only', () => {
    const metrics = new Set(parsed.facts.map((fact) => fact.metric))
    expect(metrics).toContain('revenue')
    expect(metrics).toContain('net_income')
    expect(metrics).toContain('shares_outstanding')
  })

  it('converts USD values to integer cents', () => {
    const q2Revenue = parsed.facts.find(
      (fact) =>
        fact.concept === 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax'
        && fact.periodStart === '2026-04-01'
        && fact.periodEnd === '2026-06-30',
    )
    expect(q2Revenue).toBeDefined()
    expect(q2Revenue!.value).toBe(159_670_000_000)
    expect(q2Revenue!.unit).toBe('usd_cents')
    expect(q2Revenue!.form).toBe('10-Q')
    expect(q2Revenue!.fiscalPeriod).toBe('Q2')
  })

  it('keeps shares as raw counts with instant periods', () => {
    const shares = parsed.facts.filter((fact) => fact.metric === 'shares_outstanding')
    expect(shares.length).toBeGreaterThan(0)
    for (const fact of shares) {
      expect(fact.unit).toBe('shares')
      expect(fact.periodStart).toBe(fact.periodEnd)
    }
  })

  it('records provenance on every fact', () => {
    for (const fact of parsed.facts) {
      expect(fact.accession).toMatch(/^\d{10}-\d{2}-\d{6}$/)
      expect(fact.filedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(fact.form.length).toBeGreaterThan(0)
    }
  })
})
