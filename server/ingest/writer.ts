import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { router } from '../orpc/router'
import type { IngestDatabase } from './db-helpers'
import type { DailyChart } from './sources/the-numbers/daily-chart'
import type { MarketYear } from './sources/the-numbers/market-summary'
import type { UpcomingTheatricalRelease } from './sources/tmdb/upcoming'
import {
  deleteFilingTextFacts,
  finishIngestRun,
  resolveCompanyId,
  startIngestRun,
  upsertCompanyFacts,
  upsertDailyChart,
  upsertMarketYear,
  upsertMarketYearDistributors,
  upsertUpcomingReleases,
} from './upsert'

const DEFAULT_MAX_ATTEMPTS = 4
const UPCOMING_CHUNK_SIZE = 100
const FACTS_CHUNK_SIZE = 400

export interface IngestWriter {
  startRun: (source: string, meta: Record<string, unknown>) => Promise<number>
  finishRun: (
    id: number,
    status: 'completed' | 'failed',
    urlCount: number,
    rowCount: number,
    errorMessage?: string,
  ) => Promise<void>
  upsertDailyChart: (
    chart: DailyChart,
    sourceUrl: string,
    retrievedAt: string,
  ) => Promise<number>
  upsertMarketYear: (
    year: MarketYear,
    sourceUrl: string,
    retrievedAt: string,
  ) => Promise<number>
  upsertUpcomingReleases: (
    releases: UpcomingTheatricalRelease[],
    retrievedAt: string,
  ) => Promise<number>
  upsertCompanyFacts: (
    company: { ticker: string, name: string, cik: string },
    facts: Array<{
      metric: string
      concept: string
      unit: string
      periodStart: string
      periodEnd: string
      value: number
      fiscalYear: number | null
      fiscalPeriod: string | null
      form: string
      filedDate: string
      accession: string
    }>,
    sourceUrl: string,
    retrievedAt: string,
  ) => Promise<number>
  deleteFilingTextFacts: (
    company: { ticker: string, name: string, cik: string },
    accession: string,
  ) => Promise<void>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message.toLowerCase()
  return (
    message.includes('429')
    || message.includes('502')
    || message.includes('503')
    || message.includes('504')
    || message.includes('timeout')
    || message.includes('network')
    || message.includes('fetch failed')
  )
}

async function withRetries<T>(
  label: string,
  run: () => Promise<T>,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): Promise<T> {
  let attempt = 0
  let lastError: unknown

  while (attempt < maxAttempts) {
    attempt += 1
    try {
      return await run()
    }
    catch (error) {
      lastError = error
      if (!isRetryableError(error) || attempt >= maxAttempts) {
        throw error
      }
      const delayMs = 500 * 2 ** (attempt - 1)
      console.warn(`${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms`)
      await sleep(delayMs)
    }
  }

  throw lastError
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export function createLocalIngestWriter(db: IngestDatabase): IngestWriter {
  return {
    startRun: (source, meta) => startIngestRun(db, source, meta),
    finishRun: (id, status, urlCount, rowCount, errorMessage) =>
      finishIngestRun(db, id, status, urlCount, rowCount, errorMessage),
    upsertDailyChart: (chart, sourceUrl, retrievedAt) =>
      upsertDailyChart(db, chart, sourceUrl, retrievedAt),
    upsertMarketYear: async (year, sourceUrl, retrievedAt) => {
      let rowCount = await upsertMarketYear(db, year, sourceUrl, retrievedAt)
      rowCount += await upsertMarketYearDistributors(db, year, sourceUrl, retrievedAt)
      return rowCount
    },
    upsertUpcomingReleases: (releases, retrievedAt) =>
      upsertUpcomingReleases(db, releases, retrievedAt),
    upsertCompanyFacts: async (company, facts, sourceUrl, retrievedAt) => {
      const companyId = await resolveCompanyId(db, company)
      return upsertCompanyFacts(db, companyId, facts, sourceUrl, retrievedAt)
    },
    deleteFilingTextFacts: async (company, accession) => {
      const companyId = await resolveCompanyId(db, company)
      await deleteFilingTextFacts(db, companyId, accession)
    },
  }
}

export function createRemoteIngestWriter(options: {
  baseUrl: string
  token: string
}): IngestWriter {
  const link = new RPCLink({
    url: `${options.baseUrl.replace(/\/$/, '')}/rpc`,
    headers: () => ({
      authorization: `Bearer ${options.token}`,
    }),
  })
  const client: RouterClient<typeof router> = createORPCClient(link)

  return {
    startRun: (source, meta) =>
      withRetries('ingest.startRun', async () => {
        const result = await client.ingest.startRun({ source, meta })
        return result.id
      }),
    finishRun: (id, status, urlCount, rowCount, errorMessage) =>
      withRetries('ingest.finishRun', async () => {
        await client.ingest.finishRun({
          id,
          status,
          urlCount,
          rowCount,
          errorMessage,
        })
      }),
    upsertDailyChart: (chart, sourceUrl, retrievedAt) =>
      withRetries('ingest.upsertDaily', async () => {
        const result = await client.ingest.upsertDaily({
          chart,
          sourceUrl,
          retrievedAt,
        })
        return result.rowCount
      }),
    upsertMarketYear: (year, sourceUrl, retrievedAt) =>
      withRetries('ingest.upsertMarket', async () => {
        const result = await client.ingest.upsertMarket({
          year,
          sourceUrl,
          retrievedAt,
        })
        return result.rowCount
      }),
    upsertUpcomingReleases: async (releases, retrievedAt) => {
      let rowCount = 0
      for (const chunk of chunkArray(releases, UPCOMING_CHUNK_SIZE)) {
        rowCount += await withRetries('ingest.upsertUpcoming', async () => {
          const result = await client.ingest.upsertUpcoming({
            releases: chunk,
            retrievedAt,
          })
          return result.rowCount
        })
      }
      return rowCount
    },
    upsertCompanyFacts: async (company, facts, sourceUrl, retrievedAt) => {
      let rowCount = 0
      for (const chunk of chunkArray(facts, FACTS_CHUNK_SIZE)) {
        rowCount += await withRetries('ingest.upsertFacts', async () => {
          const result = await client.ingest.upsertFacts({
            company,
            facts: chunk,
            sourceUrl,
            retrievedAt,
          })
          return result.rowCount
        })
      }
      return rowCount
    },
    deleteFilingTextFacts: async (company, accession) => {
      await withRetries('ingest.deleteFilingFacts', async () => {
        await client.ingest.deleteFilingFacts({ company, accession })
      })
    },
  }
}

export function createIngestWriterFromEnv(localDb?: IngestDatabase): IngestWriter {
  const remoteUrl = process.env.INGEST_REMOTE_URL
  const token = process.env.INGEST_TOKEN

  if (remoteUrl) {
    if (!token) {
      throw new Error('INGEST_TOKEN is required when INGEST_REMOTE_URL is set')
    }
    return createRemoteIngestWriter({ baseUrl: remoteUrl, token })
  }

  if (!localDb) {
    throw new Error('Local database is required when INGEST_REMOTE_URL is not set')
  }

  return createLocalIngestWriter(localDb)
}
