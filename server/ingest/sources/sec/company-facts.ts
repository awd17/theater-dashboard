import { z } from 'zod'
import { SEC_METRIC_CONCEPTS, type OperatorMetric } from './constants'

const factEntrySchema = z.object({
  start: z.string().optional(),
  end: z.string(),
  val: z.number(),
  accn: z.string(),
  fy: z.number().int().nullish(),
  fp: z.string().nullish(),
  form: z.string(),
  filed: z.string(),
})

const conceptSchema = z.object({
  units: z.record(z.string(), z.array(factEntrySchema)),
})

const companyFactsResponseSchema = z.object({
  cik: z.number().int(),
  entityName: z.string(),
  facts: z.record(z.string(), z.record(z.string(), conceptSchema)),
})

export const extractedFactSchema = z.object({
  metric: z.string(),
  concept: z.string(),
  unit: z.enum(['usd_cents', 'shares']),
  periodStart: z.string(),
  periodEnd: z.string(),
  value: z.number().int(),
  fiscalYear: z.number().int().nullable(),
  fiscalPeriod: z.string().nullable(),
  form: z.string(),
  filedDate: z.string(),
  accession: z.string(),
})

export type ExtractedFact = z.infer<typeof extractedFactSchema>

export interface ParsedCompanyFacts {
  entityName: string
  facts: ExtractedFact[]
}

export function parseCompanyFacts(json: unknown): ParsedCompanyFacts {
  const response = companyFactsResponseSchema.parse(json)
  const facts: ExtractedFact[] = []

  for (const config of SEC_METRIC_CONCEPTS) {
    const concept = response.facts[config.taxonomy]?.[config.concept]
    if (!concept) {
      continue
    }

    const entries = concept.units[config.unit] ?? []
    for (const entry of entries) {
      facts.push(
        extractedFactSchema.parse({
          metric: config.metric satisfies OperatorMetric,
          concept: `${config.taxonomy}:${config.concept}`,
          unit: config.unit === 'USD' ? 'usd_cents' : 'shares',
          periodStart: entry.start ?? entry.end,
          periodEnd: entry.end,
          value: Math.round(config.unit === 'USD' ? entry.val * 100 : entry.val),
          fiscalYear: entry.fy ?? null,
          fiscalPeriod: entry.fp ?? null,
          form: entry.form,
          filedDate: entry.filed,
          accession: entry.accn,
        }),
      )
    }
  }

  return { entityName: response.entityName, facts }
}
