import { describe, expect, it } from 'vitest'
import { firstRow } from '../../server/ingest/db-helpers'

describe('firstRow', () => {
  it('reads drizzle-style get() results', async () => {
    await expect(firstRow({ get: () => ({ id: 7 }) })).resolves.toEqual({ id: 7 })
  })

  it('reads promise array results used by D1', async () => {
    await expect(firstRow(Promise.resolve([{ id: 3 }]))).resolves.toEqual({ id: 3 })
    await expect(firstRow(Promise.resolve([]))).resolves.toBeUndefined()
  })
})
