import { createRouterClient } from '@orpc/server'
import { router } from '../../server/orpc/router'

export default defineNuxtPlugin(() => {
  const event = useRequestEvent()

  if (!event) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Request event is unavailable',
    })
  }

  const client = createRouterClient(router, {
    context: {
      event,
    },
  })

  return {
    provide: {
      orpc: client,
    },
  }
})
