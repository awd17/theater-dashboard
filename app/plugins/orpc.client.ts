import type { RouterClient } from '@orpc/server'
import type { router } from '../../server/orpc/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export default defineNuxtPlugin(() => {
  const link = new RPCLink({
    url: '/rpc',
  })

  const client: RouterClient<typeof router> = createORPCClient(link)

  return {
    provide: {
      orpc: client,
    },
  }
})
