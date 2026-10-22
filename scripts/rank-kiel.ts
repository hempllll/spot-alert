/**
 * Issue #3 "done when": rank a few hard-coded Kiel-area spots over 8 days on
 * real Open-Meteo forecasts.
 *
 * Run with:  npm run rank
 *
 * Open-Meteo's default model selection already uses a high-resolution regional
 * model for the near term and a global model further out, so we don't pin a
 * model explicitly.
 */
import { getForecast, ForecastCache } from '../src/forecast'
import { scoreSpot, type Spot } from '../src/scoring'

/** A windsurf-friendly W–NW setup, reused for every demo spot. */
const wnwBlow: Spot['conditionSets'] = [
  {
    name: 'W–NW blow',
    windSpeed: { usable: { min: 12, max: 35 }, ideal: { min: 18, max: 28 }, importance: 'high' },
    windDirection: { usable: { min: 200, max: 360 }, ideal: { min: 250, max: 320 } },
    waveHeight: { usable: { min: 0, max: 1.5 }, ideal: { min: 0.2, max: 0.8 }, importance: 'low' },
    waveSource: 'total',
  },
]

const spots: Spot[] = [
  { id: 'schilksee', name: 'Kiel-Schilksee', lat: 54.43, lon: 10.17, conditionSets: wnwBlow },
  { id: 'laboe', name: 'Laboe', lat: 54.41, lon: 10.22, conditionSets: wnwBlow },
  { id: 'falckenstein', name: 'Falckenstein', lat: 54.39, lon: 10.19, conditionSets: wnwBlow },
  { id: 'eckernfoerde', name: 'Eckernförde', lat: 54.47, lon: 9.84, conditionSets: wnwBlow },
]

const timeOf = (iso: string): string => iso.slice(11, 16)

async function main(): Promise<void> {
  const cache = new ForecastCache()

  const ranked = []
  for (const spot of spots) {
    const forecast = await getForecast(spot.lat, spot.lon, { cache })
    const score = scoreSpot(spot, forecast)
    const best = score.days[0]
    ranked.push({ spot, score, best })

    console.log(`\n${spot.name}  (${spot.lat}, ${spot.lon})`)
    // scoreSpot sorts by core score; re-sort by date for a readable 8-day view.
    const byDate = [...score.days].sort((a, b) => a.date.localeCompare(b.date))
    for (const day of byDate) {
      const bar = `${String(day.coreScore).padStart(3)}`
      const win =
        day.coreScore > 0
          ? `${timeOf(day.window.start)}–${timeOf(day.window.end)}`
          : '—'
      const flags = [
        day.noWaveData ? 'no-waves' : '',
        day.coarse ? 'coarse' : '',
        day.weakestFactor ? `why:${day.weakestFactor}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      console.log(`  ${day.date}  score ${bar}  window ${win.padEnd(11)} ${flags}`)
    }
  }

  ranked.sort((a, b) => b.best.coreScore - a.best.coreScore)
  console.log('\n=== Ranking by best day ===')
  for (const { spot, best } of ranked) {
    console.log(
      `  ${String(best.coreScore).padStart(3)}  ${spot.name.padEnd(16)} ${best.date} ${timeOf(best.window.start)}–${timeOf(best.window.end)}`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
