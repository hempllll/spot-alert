import { describe, expect, it } from 'vitest'
import { getCurrentPosition, type GeolocationLike } from '../geolocation'

describe('getCurrentPosition', () => {
  it('resolves with coordinates on success', async () => {
    const geo: GeolocationLike = {
      getCurrentPosition: (success) =>
        success({ coords: { latitude: 54.3, longitude: 10.1 } }),
    }
    await expect(getCurrentPosition(geo)).resolves.toEqual({ lat: 54.3, lon: 10.1 })
  })

  it('rejects with the error message on failure', async () => {
    const geo: GeolocationLike = {
      getCurrentPosition: (_success, error) => error({ message: 'denied' }),
    }
    await expect(getCurrentPosition(geo)).rejects.toThrow('denied')
  })

  it('rejects when geolocation is unavailable', async () => {
    await expect(getCurrentPosition(undefined)).rejects.toThrow('not available')
  })
})
