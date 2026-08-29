import type { H3Event } from 'h3'
import { os } from '@orpc/server'

export interface RpcContext {
  event: H3Event
}

export const pub = os.$context<RpcContext>()
