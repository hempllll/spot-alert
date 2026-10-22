import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { coordKey } from './forecast'
import type { ForecastLoader } from './hooks/useForecasts'
import { nextDates } from './ranking'
import type { Forecast, Spot } from './scoring'
import { InMemorySpotRepository, exportSpots } from './storage'
import { fakeStorage } from './test/fakeStorage'
import { SETTINGS_KEY, type Origin } from './ui/settings'

const NOW = new Date(2026, 9, 22, 9, 0) // Thu 22 Oct 2026
const DATES = nextDates(NOW)

const conditionSets: Spot['conditionSets'] = [
  { windSpeed: { usable: { min: 10, max: 30 }, ideal: { min: 15, max: 25 } } },
]
const alpha: Spot = { id: 'alpha', name: 'Alpha', lat: 54.43, lon: 10.17, conditionSets }
const bravo: Spot = { id: 'bravo', name: 'Bravo', lat: 54.6, lon: 10.4, conditionSets }
const KIEL: Origin = { lat: 54.32, lon: 10.14, label: 'Kiel', source: 'search' }

/** 20 kn scores 100, 12.5 kn scores 75; every other day gets 5 kn (unsafe, 0). */
function forecast(windByDate: Record<string, number>): Forecast {
  return {
    days: DATES.map((date, i) => ({
      date,
      sunrise: `${date}T07:00`,
      sunset: `${date}T18:00`,
      coarse: i >= 4,
      hours: [10, 11, 12].map((h) => ({
        time: `${date}T${h}:00`,
        windSpeed: windByDate[date] ?? 5,
        windDirection: 0,
      })),
    })),
  }
}

// Thu 22: Alpha 100, Bravo 75.  Sun 25: Alpha 75, Bravo 100.  Other days: 0.
const forecasts: Record<string, Forecast> = {
  [coordKey(alpha.lat, alpha.lon)]: forecast({ [DATES[0]]: 20, [DATES[3]]: 12.5 }),
  [coordKey(bravo.lat, bravo.lon)]: forecast({ [DATES[0]]: 12.5, [DATES[3]]: 20 }),
}
const loadForecast: ForecastLoader = async (lat, lon) => {
  const f = forecasts[coordKey(lat, lon)]
  if (!f) throw new Error('no forecast for this cell')
  return f
}

async function renderApp({
  spots = [alpha, bravo],
  origin = KIEL as Origin | null,
  load = loadForecast,
} = {}) {
  const repo = new InMemorySpotRepository()
  await repo.replaceAll(spots)
  const storage = fakeStorage()
  if (origin) storage.setItem(SETTINGS_KEY, JSON.stringify({ origin, maxKm: 100 }))
  render(
    <App
      repo={repo}
      storage={storage}
      loadForecast={load}
      searchPlaces={async () => [
        { name: 'Kiel', lat: 54.32, lon: 10.14, region: 'Schleswig-Holstein', country: 'Germany' },
      ]}
      getPosition={async () => ({ lat: 54.32, lon: 10.14 })}
      now={() => NOW}
    />,
  )
  return { repo }
}

const row = (name: RegExp) => screen.getByRole('button', { name })

describe('App', () => {
  it('shows the next 8 days with the best spot per day', async () => {
    await renderApp()
    const thu = await screen.findByRole('button', { name: /Thu 22.*Alpha/ })
    expect(thu).toHaveTextContent('+1 more')
    expect(within(thu).getByTitle('Best day')).toBeInTheDocument()
    expect(row(/Fri 23/)).toHaveTextContent('no spot')
    expect(row(/Sun 25/)).toHaveTextContent('Bravo')
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
  })

  it('drills into a day and a spot, and back out', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.click(await screen.findByRole('button', { name: /Thu 22.*Alpha/ }))

    expect(screen.getByRole('heading', { name: 'Thu 22' })).toBeInTheDocument()
    const ranked = screen.getAllByRole('button', { name: /Alpha|Bravo/ })
    expect(ranked.map((b) => within(b).getByText(/Alpha|Bravo/).textContent)).toEqual([
      expect.stringContaining('Alpha'),
      expect.stringContaining('Bravo'),
    ])

    await user.click(ranked[0])
    expect(screen.getByRole('heading', { name: /Alpha/ })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(8)

    await user.click(screen.getByRole('button', { name: '‹ Back' }))
    expect(screen.getByRole('heading', { name: 'Thu 22' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '‹ Back' }))
    expect(row(/Fri 23/)).toBeInTheDocument()
  })

  it('shows "no spot" on every day when no spots are saved', async () => {
    await renderApp({ spots: [] })
    expect(await screen.findByText(/No spots yet/)).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(8)
    for (const r of rows) expect(r).toHaveTextContent('no spot')
  })

  it('asks for a location first and lets you pick a city', async () => {
    const user = userEvent.setup()
    await renderApp({ origin: null })
    expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search city'), 'Kiel')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(
      await screen.findByRole('button', { name: 'Kiel, Schleswig-Holstein, Germany' }),
    )

    expect(screen.queryByRole('heading', { name: 'Location' })).not.toBeInTheDocument()
    expect(row(/Kiel, Schleswig-Holstein, Germany · within 100 km/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Thu 22.*Alpha/ })).toBeInTheDocument()
  })

  it('reports unavailable forecasts and still ranks the rest', async () => {
    const bravoCell = coordKey(bravo.lat, bravo.lon)
    await renderApp({
      load: async (lat, lon) => {
        if (coordKey(lat, lon) === bravoCell) throw new Error('offline')
        return loadForecast(lat, lon)
      },
    })
    expect(await screen.findByText(/1 forecast unavailable/)).toBeInTheDocument()
    expect(row(/Thu 22/)).toHaveTextContent('Alpha')
    expect(row(/Thu 22/)).not.toHaveTextContent('more')
  })

  it('imports a file and asks about a name conflict', async () => {
    const user = userEvent.setup()
    const { repo } = await renderApp({ spots: [alpha] })
    await screen.findByRole('button', { name: /Thu 22.*Alpha/ })

    const file = new File(
      [exportSpots([bravo, { ...alpha, id: 'alpha-2', lat: 54.44 }])],
      'spots.json',
      { type: 'application/json' },
    )
    fireEvent.change(screen.getByLabelText('Import spots file'), { target: { files: [file] } })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('1 new · 0 updated · 0 unchanged · 1 name conflict')
    expect(dialog).toHaveTextContent('“Alpha” already exists')

    await user.click(within(dialog).getByLabelText('Keep both'))
    await user.click(within(dialog).getByRole('button', { name: 'Import' }))

    expect(await screen.findByText('Import complete.')).toBeInTheDocument()
    expect((await repo.list()).map((s) => s.id).sort()).toEqual(['alpha', 'alpha-2', 'bravo'])
  })
})
