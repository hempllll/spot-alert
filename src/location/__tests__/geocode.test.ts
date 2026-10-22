import { describe, expect, it, vi } from 'vitest'
import { buildGeocodeUrl, searchPlaces } from '../geocode'

describe('buildGeocodeUrl', () => {
  it('includes the query and a result count', () => {
    const url = new URL(buildGeocodeUrl('Kiel'))
    expect(url.searchParams.get('name')).toBe('Kiel')
    expect(url.searchParams.get('count')).toBe('5')
  })
})

describe('searchPlaces', () => {
  it('maps geocoding results to Place objects', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              name: 'Kiel',
              latitude: 54.32,
              longitude: 10.14,
              country: 'Germany',
              admin1: 'Schleswig-Holstein',
            },
          ],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch
    const places = await searchPlaces('Kiel', fetchImpl)
    expect(places).toEqual([
      { name: 'Kiel', lat: 54.32, lon: 10.14, country: 'Germany', region: 'Schleswig-Holstein' },
    ])
  })

  it('returns [] for a blank query without fetching', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch
    expect(await searchPlaces('   ', fetchImpl)).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns [] when the API has no results', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({}), { status: 200 }),
    ) as unknown as typeof fetch
    expect(await searchPlaces('Xyzzy', fetchImpl)).toEqual([])
  })
})
