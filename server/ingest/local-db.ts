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

  if (files.length === 1) {
    return join(dir, files[0]!)
  }

  const ranked = files
    .map((name) => {
      const path = join(dir, name)
      const sqlite = new Database(path, { readonly: true })
      try {
        const tables = sqlite
          .query(
            `SELECT count(*) AS c
             FROM sqlite_master
             WHERE type = 'table'
               AND name NOT LIKE 'sqlite_%'
               AND name NOT LIKE '_cf_%'
               AND name <> 'd1_migrations'`,
          )
          .get() as { c: number } | null
        const rows = sqlite
          .query(
            `SELECT
               COALESCE((SELECT count(*) FROM box_office_daily), 0)
               + COALESCE((SELECT count(*) FROM company_facts), 0)
               + COALESCE((SELECT count(*) FROM upcoming_releases), 0)
               AS c`,
          )
          .get() as { c: number } | null
        const stat = Bun.file(path).size
        const wal = Bun.file(`${path}-wal`).size
        return { path, tableCount: tables?.c ?? 0, rowCount: rows?.c ?? 0, freshness: stat + wal }
      }
      catch {
        return { path, tableCount: 0, rowCount: 0, freshness: 0 }
      }
      finally {
        sqlite.close()
      }
    })
    .sort((a, b) => b.freshness - a.freshness || b.rowCount - a.rowCount || b.tableCount - a.tableCount)

  const best = ranked[0]
  if (!best || best.tableCount === 0) {
    throw new Error(
      `No usable local D1 sqlite found in ${dir}. Run bun run db:migrate first.`,
    )
  }

  return best.path
}

export function openLocalDatabase(sqlitePath = findLocalD1SqlitePath()) {
  const sqlite = new Database(sqlitePath)
  sqlite.exec('PRAGMA foreign_keys = ON;')
  return drizzle(sqlite, { schema })
}
