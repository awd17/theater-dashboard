import type { LocalDatabase } from './local-db'

export type IngestDatabase = LocalDatabase

export async function firstRow<T>(
  query: Promise<T[]> | { get: () => T | Promise<T | undefined> | T | undefined } | T[],
): Promise<T | undefined> {
  if (query && typeof query === 'object' && 'get' in query && typeof query.get === 'function') {
    return await query.get()
  }

  const rows = await query
  return Array.isArray(rows) ? rows[0] : undefined
}
