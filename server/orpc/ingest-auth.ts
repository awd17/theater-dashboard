import { ORPCError } from '@orpc/server'
import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import type { CloudflareEnv } from '../types/bindings'

function timingSafeEqualString(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return mismatch === 0
}

function readIngestToken(event: H3Event): string | undefined {
  const fromCloudflare = event.context.cloudflare?.env.INGEST_TOKEN
  if (fromCloudflare) {
    return fromCloudflare
  }

  const config = useRuntimeConfig(event)
  const fromConfig = typeof config.ingestToken === 'string' ? config.ingestToken : ''
  return fromConfig.length > 0 ? fromConfig : undefined
}

export async function requireIngestAuth(event: H3Event): Promise<void> {
  const expected = readIngestToken(event)
  if (!expected) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Ingest token is not configured',
    })
  }

  const authorization = getHeader(event, 'authorization') ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  const provided = match?.[1]?.trim() ?? ''

  if (!provided || !timingSafeEqualString(provided, expected)) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Invalid ingest token',
    })
  }
}

export function cloudflareEnv(event: H3Event): CloudflareEnv | undefined {
  return event.context.cloudflare?.env
}
