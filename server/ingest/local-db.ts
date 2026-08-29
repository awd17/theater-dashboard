import { Database } from 'bun:sqlite'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from '../db/schema'

export type LocalDatabase = ReturnType<typeof openLocalDatabase>

function findLocalD1SqlitePath(cwd = process.cwd()): string {
  const fromEnv = process.env.D1_LOCAL_PATH
  if (fromEnv) {
    return fromEnv
  }

  const dir = join(cwd, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject')
  const files = readdirSync(dir).filter(
    (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
  )

  if (files.length === 0) {
    throw new Error(
      `No local D1 sqlite found in ${dir}. Run bun run db:migrate first.`,
    )
  }

  if (files.length > 1) {
    files.sort()
  }

  return join(dir, files[0]!)
}

export function openLocalDatabase(sqlitePath = findLocalD1SqlitePath()) {
  const sqlite = new Database(sqlitePath)
  sqlite.exec('PRAGMA foreign_keys = ON;')
  return drizzle(sqlite, { schema })
}
