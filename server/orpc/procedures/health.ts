import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDatabase } from '../../db/client'
import { pub } from '../context'

export const healthResultSchema = z.object({
  ok: z.literal(true),
  database: z.enum(['connected', 'unavailable']),
})

export type HealthResult = z.infer<typeof healthResultSchema>

export function databaseHealth(connected: boolean): HealthResult {
  return {
    ok: true,
    database: connected ? 'connected' : 'unavailable',
  }
}

export const health = pub
  .output(healthResultSchema)
  .handler(async ({ context }) => {
    const db = getDatabase(context.event)

    if (!db) {
      return databaseHealth(false)
    }

    await db.run(sql`SELECT 1`)
    return databaseHealth(true)
  })
