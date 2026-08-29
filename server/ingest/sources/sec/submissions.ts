import { z } from 'zod'

const recentFilingsSchema = z.object({
  accessionNumber: z.array(z.string()),
  form: z.array(z.string()),
  primaryDocument: z.array(z.string()),
  reportDate: z.array(z.string()),
  filingDate: z.array(z.string()),
})

const submissionsResponseSchema = z.object({
  filings: z.object({
    recent: recentFilingsSchema,
  }),
})

export interface LatestFiling {
  accession: string
  form: string
  primaryDocument: string
  reportDate: string
  filingDate: string
}

export function findLatestFiling(json: unknown, forms: string[]): LatestFiling | null {
  const response = submissionsResponseSchema.parse(json)
  const recent = response.filings.recent

  for (let i = 0; i < recent.form.length; i += 1) {
    if (forms.includes(recent.form[i]!) && recent.reportDate[i]) {
      return {
        accession: recent.accessionNumber[i]!,
        form: recent.form[i]!,
        primaryDocument: recent.primaryDocument[i]!,
        reportDate: recent.reportDate[i]!,
        filingDate: recent.filingDate[i]!,
      }
    }
  }

  return null
}
