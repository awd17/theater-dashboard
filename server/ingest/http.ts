import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'

const USER_AGENT = 'TheaterIndustryDashboard/0.1 (+local-ingest; research)'
const DEFAULT_MIN_INTERVAL_MS = 1_000

let lastRequestAt = 0

export interface FetchHtmlResult {
  html: string
  url: string
  retrievedAt: string
  via: 'native' | 'cache' | 'firecrawl'
}

export class PageNotFoundError extends Error {
  constructor(url: string) {
    super(`Page not found: ${url}`)
    this.name = 'PageNotFoundError'
  }
}

function cachePathForUrl(cacheDir: string, url: string): string {
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 24)
  return join(cacheDir, `${hash}.html`)
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function respectRateLimit(minIntervalMs: number): Promise<void> {
  const elapsed = Date.now() - lastRequestAt
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed)
  }
  lastRequestAt = Date.now()
}

function looksBlocked(status: number, body: string): boolean {
  if (status === 403 || status === 429 || status === 503) {
    return true
  }
  const lowered = body.toLowerCase()
  return (
    lowered.includes('cf-mitigated')
    || lowered.includes('just a moment')
    || lowered.includes('attention required')
  )
}

const MIN_USABLE_HTML_LENGTH = 2_000

function isUsableHtml(html: string): boolean {
  return html.length >= MIN_USABLE_HTML_LENGTH && !looksBlocked(200, html)
}

async function fetchNative(url: string): Promise<{ status: number, html: string }> {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml',
    },
  })
  const html = await response.text()
  return { status: response.status, html }
}

async function fetchFirecrawl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error('Native fetch blocked and FIRECRAWL_API_KEY is not set')
  }

  const { Firecrawl } = await import('@mendable/firecrawl-js')
  const client = new Firecrawl({ apiKey })
  const result = await client.scrape(url, {
    formats: ['html'],
    onlyMainContent: false,
    waitFor: 3_000,
  })

  const html = typeof result.html === 'string' ? result.html : null
  if (!html || !isUsableHtml(html)) {
    throw new Error(`Firecrawl returned no usable HTML for ${url}`)
  }
  return html
}

export async function fetchHtml(
  url: string,
  options: {
    cacheDir?: string
    minIntervalMs?: number
    forceRefresh?: boolean
  } = {},
): Promise<FetchHtmlResult> {
  const cacheDir = options.cacheDir ?? join(process.cwd(), 'tmp/ingest')
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS
  const cachePath = cachePathForUrl(cacheDir, url)
  const retrievedAt = new Date().toISOString()

  if (!options.forceRefresh) {
    try {
      const html = await readFile(cachePath, 'utf8')
      if (isUsableHtml(html)) {
        return { html, url, retrievedAt, via: 'cache' }
      }
    }
    catch {
      // Cache miss — continue.
    }
  }

  await respectRateLimit(minIntervalMs)
  const native = await fetchNative(url)

  if (native.status === 404) {
    throw new PageNotFoundError(url)
  }

  if (
    native.status >= 200
    && native.status < 300
    && !looksBlocked(native.status, native.html)
    && isUsableHtml(native.html)
  ) {
    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, native.html, 'utf8')
    return { html: native.html, url, retrievedAt, via: 'native' }
  }

  await respectRateLimit(minIntervalMs)
  const html = await fetchFirecrawl(url)
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, html, 'utf8')
  return { html, url, retrievedAt, via: 'firecrawl' }
}
