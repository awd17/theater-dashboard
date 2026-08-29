import type { RouterClient } from '@orpc/server'
import type { router } from '../../server/orpc/router'

declare module '#app' {
  interface NuxtApp {
    $orpc: RouterClient<typeof router>
  }
}
