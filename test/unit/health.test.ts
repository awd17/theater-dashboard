import { describe, expect, it } from 'vitest'
import { databaseHealth, healthResultSchema } from '../../server/orpc/procedures/health'

describe('databaseHealth', () => {
  it('reports a connected database', () => {
    const result = databaseHealth(true)

    expect(result).toEqual({
      ok: true,
      database: 'connected',
    })
    expect(healthResultSchema.parse(result)).toEqual(result)
  })

  it('reports an unavailable database', () => {
    const result = databaseHealth(false)

    expect(result).toEqual({
      ok: true,
      database: 'unavailable',
    })
    expect(healthResultSchema.parse(result)).toEqual(result)
  })
})
