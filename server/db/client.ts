import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import type { CloudflareEnv } from '../types/bindings'
import * as schema from './schema'

type GlobalEnv = CloudflareEnv | Promise<CloudflareEnv | undefined> | undefined

function readGlobalEnv(): GlobalEnv {
  return (globalThis as { __env__?: GlobalEnv }).__env__
}

export async function getDatabase(event: H3Event) {
  const fromEvent = event.context.cloudflare?.env.DB
  if (fromEvent) {
    return drizzle(fromEvent, { schema })
  }

  const globalEnv = readGlobalEnv()
  if (globalEnv) {
    const env = await Promise.resolve(globalEnv)
    if (env?.DB) {
      return drizzle(env.DB, { schema })
    }
  }

  return null
}

export type AppDatabase = NonNullable<Awaited<ReturnType<typeof getDatabase>>>
