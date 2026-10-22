import { useMemo, useState, type ReactNode } from 'react'
import './App.css'
import { DataBar } from './components/DataBar'
import { DayView } from './components/DayView'
import { ImportDialog } from './components/ImportDialog'
import { LocationPanel } from './components/LocationPanel'
import { SpotView } from './components/SpotView'
import { WeekView } from './components/WeekView'
import { demoSpots } from './demoSpots'
import { COARSE_FROM_DAY_INDEX, coordKey } from './forecast'
import { defaultForecastLoader } from './hooks/forecastLoader'
import { useForecasts, type ForecastLoader } from './hooks/useForecasts'
import { useSettings } from './hooks/useSettings'
import { useSpots } from './hooks/useSpots'
import {
  getCurrentPosition,
  searchPlaces,
  withinDistance,
  type Coords,
  type Place,
} from './location'
import { bestDate, bestSpotPerDay, nextDates, rankForDate, type SpotResult } from './ranking'
import { scoreSpot } from './scoring'
import {
  LocalStorageSpotRepository,
  applyImport,
  exportSpots,
  importSpots,
  planImport,
  type ConflictResolution,
  type ImportPlan,
  type SpotRepository,
} from './storage'
import { downloadText } from './ui/download'

/** Everything external is injectable so tests can run the real UI offline. */
export interface AppProps {
  repo?: SpotRepository
  storage?: Storage
  loadForecast?: ForecastLoader
  searchPlaces?: (query: string) => Promise<Place[]>
  getPosition?: () => Promise<Coords>
  now?: () => Date
}

type View =
  | { name: 'week' }
  | { name: 'day'; date: string }
  | { name: 'spot'; spotId: string; fromDate: string }

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err))

function App({
  repo: repoProp,
  storage = globalThis.localStorage,
  loadForecast = defaultForecastLoader,
  searchPlaces: search = searchPlaces,
  getPosition = getCurrentPosition,
  now = () => new Date(),
}: AppProps) {
  const [repo] = useState<SpotRepository>(
    () => repoProp ?? new LocalStorageSpotRepository(storage),
  )
  const { spots, replaceAll } = useSpots(repo)
  const [settings, setSettings] = useSettings(storage)
  const [view, setView] = useState<View>({ name: 'week' })
  const [locationOpen, setLocationOpen] = useState(settings.origin === null)
  const [pendingImport, setPendingImport] = useState<ImportPlan | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Spots within range of the chosen location, nearest first.
  const { origin, maxKm } = settings
  const inRange = useMemo(
    () => (origin && spots ? withinDistance(spots, origin, maxKm, (s) => s) : []),
    [spots, origin, maxKm],
  )

  // Fetch their forecasts and score each spot once its forecast arrives.
  const { states, retry } = useForecasts(
    inRange.map((r) => r.item),
    loadForecast,
  )
  const results = useMemo<SpotResult[]>(
    () =>
      inRange.flatMap(({ item, distanceKm }) => {
        const state = states.get(coordKey(item.lat, item.lon))
        return state?.status === 'ok'
          ? [{ spot: item, distanceKm, score: scoreSpot(item, state.forecast) }]
          : []
      }),
    [inRange, states],
  )
  const statuses = inRange.map(
    (r) => states.get(coordKey(r.item.lat, r.item.lon))?.status ?? 'loading',
  )
  const loadingCount = statuses.filter((s) => s === 'loading').length
  const errorCount = statuses.filter((s) => s === 'error').length

  const dates = nextDates(now())
  const rows = bestSpotPerDay(results, dates)

  // --- data bar actions ---------------------------------------------------

  async function handleDemo() {
    const existing = spots ?? []
    const plan = planImport(existing, demoSpots)
    await replaceAll(applyImport(existing, plan))
    const parts = [
      plan.added.length > 0 ? `Added ${plan.added.length} demo spots.` : 'Demo spots already loaded.',
      plan.conflicts.length > 0 ? `${plan.conflicts.length} skipped (name already used).` : '',
    ]
    setMessage(parts.filter(Boolean).join(' '))
  }

  function handleExport() {
    downloadText(`spot-alert-spots-${dates[0]}.json`, exportSpots(spots ?? []))
  }

  async function handleImportFile(file: File) {
    try {
      setPendingImport(planImport(spots ?? [], importSpots(await file.text())))
    } catch (err) {
      setMessage(`Import failed: ${errorText(err)}`)
    }
  }

  async function confirmImport(resolutions: Record<number, ConflictResolution>) {
    if (!pendingImport) return
    await replaceAll(applyImport(spots ?? [], pendingImport, resolutions))
    setPendingImport(null)
    setMessage('Import complete.')
  }

  // --- screens ------------------------------------------------------------

  function renderScreen(): ReactNode {
    if (view.name === 'spot') {
      const result = results.find((r) => r.spot.id === view.spotId)
      if (result) {
        return (
          <SpotView
            result={result}
            onBack={() => setView({ name: 'day', date: view.fromDate })}
          />
        )
      }
    }
    if (view.name === 'day') {
      return (
        <DayView
          date={view.date}
          coarse={dates.indexOf(view.date) >= COARSE_FROM_DAY_INDEX}
          entries={rankForDate(results, view.date)}
          pending={loadingCount > 0}
          onBack={() => setView({ name: 'week' })}
          onSelectSpot={(spotId) => setView({ name: 'spot', spotId, fromDate: view.date })}
        />
      )
    }
    return (
      <WeekView
        rows={rows}
        starred={bestDate(rows)}
        pending={loadingCount > 0}
        notice={weekNotice()}
        onSelectDay={(date) => setView({ name: 'day', date })}
      />
    )
  }

  function weekNotice(): ReactNode {
    let text: string | null = null
    if (spots === null) text = 'Loading spots…'
    else if (spots.length === 0) text = 'No spots yet: load the demo spots or import a file.'
    else if (!origin) text = 'Set your location to see spots near you.'
    else if (inRange.length === 0) text = `No spots within ${maxKm} km.`
    else if (loadingCount > 0)
      text = `Loading forecasts (${inRange.length - loadingCount} of ${inRange.length})…`
    return (
      <>
        {text && <p className="notice">{text}</p>}
        {errorCount > 0 && (
          <p className="notice error">
            {errorCount === 1 ? '1 forecast' : `${errorCount} forecasts`} unavailable.{' '}
            <button type="button" className="link" onClick={retry}>
              Retry
            </button>
          </p>
        )}
      </>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>spot-alert</h1>
        <button
          type="button"
          className="location-button"
          aria-expanded={locationOpen}
          onClick={() => setLocationOpen((open) => !open)}
        >
          <span className="location-label">📍 {origin ? origin.label : 'Set location'}</span>{' '}
          <span className="location-km">· within {maxKm} km</span>
        </button>
      </header>

      {locationOpen && (
        <LocationPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setLocationOpen(false)}
          searchPlaces={search}
          getPosition={getPosition}
        />
      )}

      {message && (
        <p className="toast" role="status">
          {message}
          <button type="button" className="icon" aria-label="Dismiss" onClick={() => setMessage(null)}>
            ✕
          </button>
        </p>
      )}

      <main>{renderScreen()}</main>

      <DataBar
        canExport={(spots?.length ?? 0) > 0}
        onDemo={handleDemo}
        onExport={handleExport}
        onImportFile={handleImportFile}
      />

      {pendingImport && (
        <ImportDialog
          plan={pendingImport}
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </div>
  )
}

export default App
