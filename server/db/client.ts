import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'

export function getDatabase(event: H3Event) {
  const d1 = event.context.cloudflare?.env.DB

  if (!d1) {
    return null
  }

  return drizzle(d1)
}
