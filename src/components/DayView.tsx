import type { SpotDay } from '../ranking'
import { formatDay, formatKm, formatWindow, whyText } from '../ui/format'
import { HourBar } from './HourBar'
import { ScoreBadge } from './ScoreBadge'

interface DayViewProps {
  date: string
  coarse: boolean
  /** All in-range spots for this day, best first. */
  entries: SpotDay[]
  pending: boolean
  onBack: () => void
  onSelectSpot: (spotId: string) => void
}

/** One day: every in-range spot ranked, with hourly bars and the "why". */
export function DayView({ date, coarse, entries, pending, onBack, onSelectSpot }: DayViewProps) {
  return (
    <section aria-label={formatDay(date)}>
      <header className="view-header">
        <button type="button" className="back" onClick={onBack}>
          ‹ Back
        </button>
        <h2>
          {formatDay(date)}
          {coarse && <span className="coarse"> ~ rougher timing</span>}
        </h2>
      </header>
      {entries.length === 0 ? (
        <p className="notice">{pending ? 'Loading forecasts…' : 'No spots within range.'}</p>
      ) : (
        <ol className="list">
          {entries.map(({ spot, distanceKm, day }) => (
            <li key={spot.id}>
              <button
                type="button"
                className={`row spot-row${day.coreScore === 0 ? ' muted' : ''}`}
                onClick={() => onSelectSpot(spot.id)}
              >
                <ScoreBadge score={day.coreScore} />
                <span className="row-main">
                  <span className="row-title">
                    {spot.name} <span className="row-sub">{formatKm(distanceKm)}</span>
                  </span>
                  <HourBar day={day} />
                  <DayDetails day={day} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** "11–18 · why: wind · no wave data" under an hour bar. */
export function DayDetails({ day }: { day: SpotDay['day'] }) {
  const parts = [
    day.coreScore > 0 ? formatWindow(day.window, day.coarse) : 'no session',
    whyText(day),
    day.noWaveData ? 'no wave data' : null,
  ].filter(Boolean)
  return <span className="row-sub">{parts.join(' · ')}</span>
}
