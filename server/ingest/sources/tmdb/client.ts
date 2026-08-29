import { z } from 'zod'

export const TMDB_SOURCE = 'tmdb' as const
export const TMDB_API_ORIGIN = 'https://api.themoviedb.org'

export const THEATRICAL_LIMITED = 2
export const THEATRICAL_WIDE = 3

export const releaseTypeLabels: Record<number, string> = {
  [THEATRICAL_LIMITED]: 'theatrical_limited',
  [THEATRICAL_WIDE]: 'theatrical_wide',
}

export function tmdbMovieUrl(tmdbId: number): string {
  return `https://www.themoviedb.org/movie/${tmdbId}`
}

export const discoverResultSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  original_title: z.string().optional(),
  release_date: z.string().optional(),
  popularity: z.number().optional(),
})

export const discoverPageSchema = z.object({
  page: z.number().int(),
  total_pages: z.number().int(),
  total_results: z.number().int(),
  results: z.array(discoverResultSchema),
})

export type DiscoverPage = z.infer<typeof discoverPageSchema>

export const releaseDateEntrySchema = z.object({
  type: z.number().int(),
  release_date: z.string(),
  certification: z.string().optional(),
  note: z.string().optional(),
})

export const releaseDatesResponseSchema = z.object({
  id: z.number().int(),
  results: z.array(
    z.object({
      iso_3166_1: z.string(),
      release_dates: z.array(releaseDateEntrySchema),
    }),
  ),
})

export type ReleaseDatesResponse = z.infer<typeof releaseDatesResponseSchema>

export interface TmdbClientOptions {
  apiKey: string
  minIntervalMs?: number
}

export class TmdbClient {
  private readonly apiKey: string
  private readonly minIntervalMs: number
  private lastRequestAt = 0

  constructor(options: TmdbClientOptions) {
    this.apiKey = options.apiKey
    this.minIntervalMs = options.minIntervalMs ?? 120
  }

  private async request(path: string, params: Record<string, string>): Promise<unknown> {
    const elapsed = Date.now() - this.lastRequestAt
    if (elapsed < this.minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed))
    }
    this.lastRequestAt = Date.now()

    const url = new URL(`${TMDB_API_ORIGIN}${path}`)
    url.searchParams.set('api_key', this.apiKey)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`TMDB ${path} failed with status ${response.status}`)
    }
    return response.json()
  }

  async discoverTheatrical(options: {
    region: string
    fromDate: string
    toDate: string
    page: number
  }): Promise<DiscoverPage> {
    const json = await this.request('/3/discover/movie', {
      'region': options.region,
      'with_release_type': `${THEATRICAL_LIMITED}|${THEATRICAL_WIDE}`,
      'release_date.gte': options.fromDate,
      'release_date.lte': options.toDate,
      'sort_by': 'popularity.desc',
      'include_adult': 'false',
      'include_video': 'false',
      'page': String(options.page),
    })
    return discoverPageSchema.parse(json)
  }

  async movieReleaseDates(tmdbId: number): Promise<ReleaseDatesResponse> {
    const json = await this.request(`/3/movie/${tmdbId}/release_dates`, {})
    return releaseDatesResponseSchema.parse(json)
  }
}
