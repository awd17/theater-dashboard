import { openLocalDatabase } from './local-db'
import { parseCompanyFacts } from './sources/sec/company-facts'
import {
  companyFactsUrl,
  SEC_COMPANIES,
  SEC_SOURCE,
  secUserAgent,
} from './sources/sec/constants'
import {
  finishIngestRun,
  resolveCompanyId,
  startIngestRun,
  upsertCompanyFacts,
} from './upsert'

const REQUEST_INTERVAL_MS = 500

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
      const response = await fetch(url, {
        headers: { 'user-agent': secUserAgent(), accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`SEC companyfacts for ${company.ticker} failed with status ${response.status}`)
      }
      urlCount += 1
      const retrievedAt = new Date().toISOString()

      const parsed = parseCompanyFacts(await response.json())
      const companyId = await resolveCompanyId(db, company)
      const upserted = await upsertCompanyFacts(db, companyId, parsed.facts, url, retrievedAt)
      rowCount += upserted

      console.log(`${company.ticker} (${parsed.entityName}): ${upserted} facts`)
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
