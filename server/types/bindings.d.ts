/// <reference types="@cloudflare/workers-types" />

export interface CloudflareEnv {
  DB: D1Database
  INGEST_TOKEN?: string
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      env: CloudflareEnv
    }
  }
}
