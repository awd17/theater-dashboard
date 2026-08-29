import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { router } from '../../orpc/router'

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

export default defineEventHandler(async (event) => {
  const { response } = await handler.handle(toWebRequest(event), {
    prefix: '/rpc',
    context: {
      event,
    },
  })

  if (response) {
    return response
  }

  setResponseStatus(event, 404, 'Not Found')
  return 'Not found'
})
