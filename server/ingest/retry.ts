export const DEFAULT_INGEST_RETRY_ATTEMPTS = 5

export function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error
    ? `${error.name} ${error.message} ${error.cause ?? ''}`
    : String(error)
  const lowered = message.toLowerCase()

  return (
    lowered.includes('429')
    || lowered.includes('502')
    || lowered.includes('503')
    || lowered.includes('504')
    || lowered.includes('service unavailable')
    || lowered.includes('overloaded')
    || lowered.includes('timeout')
    || lowered.includes('timed out')
    || lowered.includes('network')
    || lowered.includes('fetch failed')
    || lowered.includes('econnreset')
    || lowered.includes('econnrefused')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withRetries<T>(
  label: string,
  run: () => Promise<T>,
  maxAttempts = DEFAULT_INGEST_RETRY_ATTEMPTS,
): Promise<T> {
  let attempt = 0
  let lastError: unknown

  while (attempt < maxAttempts) {
    attempt += 1
    try {
      return await run()
    }
    catch (error) {
      lastError = error
      if (!isRetryableError(error) || attempt >= maxAttempts) {
        throw error
      }
      const delayMs = 1_000 * 2 ** (attempt - 1)
      console.warn(`${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms`)
      await sleep(delayMs)
    }
  }

  throw lastError
}
