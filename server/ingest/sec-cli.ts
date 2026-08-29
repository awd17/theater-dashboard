import { openLocalDatabase } from './local-db'
import { parseCompanyFacts } from './sources/sec/company-facts'
import {
  companyFactsUrl,
  filingDocumentUrl,
  SEC_COMPANIES,
  SEC_SOURCE,
  secUserAgent,
  submissionsUrl,
  type SecCompany,
} from './sources/sec/constants'
import {
  attendanceStrategyExists,
  parseFilingAttendance,
} from './sources/sec/filing-attendance'
import { findLatestFiling } from './sources/sec/submissions'
import {
  finishIngestRun,
  resolveCompanyId,
  startIngestRun,
  upsertCompanyFacts,
} from './upsert'

const REQUEST_INTERVAL_MS = 500

async function fetchSec(url: string, accept: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { 'user-agent': secUserAgent(), accept },
  })
  if (!response.ok) {
    throw new Error(`SEC request ${url} failed with status ${response.status}`)
  }
  return response
}

async function ingestAttendance(
  db: Awaited<ReturnType<typeof openLocalDatabase>>,
  company: SecCompany,
  companyId: number,
): Promise<{ urls: number, rows: number }> {
  if (!attendanceStrategyExists(company.ticker)) {
    console.log(`${company.ticker}: attendance not disclosed in filings, skipping`)
    return { urls: 0, rows: 0 }
  }

  const submissions = await (await fetchSec(submissionsUrl(company.cik), 'application/json')).json()
  const filing = findLatestFiling(submissions, ['10-Q'])
  if (!filing) {
    console.log(`${company.ticker}: no recent 10-Q found`)
    return { urls: 1, rows: 0 }
  }

  await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS))
  const documentUrl = filingDocumentUrl(company.cik, filing.accession, filing.primaryDocument)
  const html = await (await fetchSec(documentUrl, 'text/html')).text()
  const retrievedAt = new Date().toISOString()

  const attendance = parseFilingAttendance(html, company.ticker, filing.reportDate)
  if (!attendance) {
    console.log(`${company.ticker}: attendance table not found in ${filing.form} ${filing.accession}`)
    return { urls: 2, rows: 0 }
  }

  const facts = [attendance.currentQuarter, attendance.priorYearQuarter].map((quarter) => ({
    metric: 'attendance',
    concept: 'filing_text:Attendance',
    unit: 'count',
    periodStart: quarter.periodStart,
    periodEnd: quarter.periodEnd,
    value: quarter.value,
    fiscalYear: null,
    fiscalPeriod: null,
    form: filing.form,
    filedDate: filing.filingDate,
    accession: filing.accession,
  }))

  const rows = await upsertCompanyFacts(db, companyId, facts, documentUrl, retrievedAt)
  console.log(
    `${company.ticker}: attendance ${(attendance.currentQuarter.value / 1e6).toFixed(1)}M`
    + ` (prior year ${(attendance.priorYearQuarter.value / 1e6).toFixed(1)}M)`,
  )
  return { urls: 2, rows }
}

async function main(): Promise<void> {
  const db = openLocalDatabase()
  const runId = await startIngestRun(db, SEC_SOURCE, {
    companies: SEC_COMPANIES.map((company) => company.ticker),
  })

  let urlCount = 0
  let rowCount = 0

  try {
    for (const company of SEC_COMPANIES) {
      const url = companyFactsUrl(company.cik)
      const response = await fetchSec(url, 'application/json')
      urlCount += 1
      const retrievedAt = new Date().toISOString()

      const parsed = parseCompanyFacts(await response.json())
      const companyId = await resolveCompanyId(db, company)
      const upserted = await upsertCompanyFacts(db, companyId, parsed.facts, url, retrievedAt)
      rowCount += upserted

      console.log(`${company.ticker} (${parsed.entityName}): ${upserted} facts`)
      await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS))

      const attendanceResult = await ingestAttendance(db, company, companyId)
      urlCount += attendanceResult.urls
      rowCount += attendanceResult.rows
      await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS))
    }

    await finishIngestRun(db, runId, 'completed', urlCount, rowCount)
    console.log(`Done. companies=${SEC_COMPANIES.length} facts=${rowCount}`)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await finishIngestRun(db, runId, 'failed', urlCount, rowCount, message)
    console.error(message)
    process.exitCode = 1
  }
}

main()
