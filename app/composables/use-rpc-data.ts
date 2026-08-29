import type { AsyncDataOptions, NuxtApp } from '#app'
import type { MaybeRefOrGetter } from 'vue'

export function useRpcData<T>(
  key: MaybeRefOrGetter<string>,
  handler: () => Promise<T>,
  options?: AsyncDataOptions<T>,
) {
  return useAsyncData(key, handler, {
    ...options,
    getCachedData(dataKey, nuxtApp: NuxtApp, context) {
      if (options?.getCachedData) {
        return options.getCachedData(dataKey, nuxtApp, context)
      }
      if (nuxtApp.isHydrating) {
        return nuxtApp.payload.data[dataKey] as T | undefined
      }
      return undefined
    },
  })
}
