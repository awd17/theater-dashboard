import { z } from 'zod'
import {
  releaseTypeLabels,
  THEATRICAL_LIMITED,
  THEATRICAL_WIDE,
  type ReleaseDatesResponse,
} from './client'

export const upcomingTheatricalReleaseSchema = z.object({
  tmdbId: z.number().int(),
  title: z.string().min(1),
  region: z.string().length(2),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  releaseType: z.string().min(1),
  certification: z.string().nullable(),
  popularity: z.number().nullable(),
  primaryReleaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

export type UpcomingTheatricalRelease = z.infer<typeof upcomingTheatricalReleaseSchema>

export interface TheatricalCandidate {
  tmdbId: number
  title: string
  popularity: number | null
  primaryReleaseDate: string | null
}

export function extractTheatricalReleases(
  candidate: TheatricalCandidate,
  releaseDates: ReleaseDatesResponse,
  options: { region: string, fromDate: string, toDate: string },
): UpcomingTheatricalRelease[] {
  const regionEntry = releaseDates.results.find(
    (entry) => entry.iso_3166_1 === options.region,
  )
  if (!regionEntry) {
    return []
  }

  const releases: UpcomingTheatricalRelease[] = []

  for (const entry of regionEntry.release_dates) {
    if (entry.type !== THEATRICAL_LIMITED && entry.type !== THEATRICAL_WIDE) {
      continue
    }

    const releaseDate = entry.release_date.slice(0, 10)
    if (releaseDate < options.fromDate || releaseDate > options.toDate) {
      continue
    }

    releases.push(
      upcomingTheatricalReleaseSchema.parse({
        tmdbId: candidate.tmdbId,
        title: candidate.title,
        region: options.region,
        releaseDate,
        releaseType: releaseTypeLabels[entry.type],
        certification: entry.certification?.trim() ? entry.certification.trim() : null,
        popularity: candidate.popularity,
        primaryReleaseDate: candidate.primaryReleaseDate,
      }),
    )
  }

  return releases
}
