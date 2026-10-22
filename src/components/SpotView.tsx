import type { SpotResult } from '../ranking'
import { formatKm } from '../ui/format'
import { DayDetails } from './DayView'
import { HourBar } from './HourBar'
import { ScoreBadge } from './ScoreBadge'
import { DayLabel } from './WeekView'

interface SpotViewProps {
  result: SpotResult
  onBack: () => void
}

/** One spot's 8 days in calendar order, best day starred. */
export function SpotView({ result, onBack }: SpotViewProps) {
  const days = [...result.score.days].sort((a, b) => a.date.localeCompare(b.date))
  const best = days.reduce<(typeof days)[number] | null>(
    (top, d) => (d.coreScore > (top?.coreScore ?? 0) ? d : top),
    null,
  )

  return (
    <section aria-label={result.spot.name}>
      <header className="view-header">
        <button type="button" className="back" onClick={onBack}>
          ‹ Back
        </button>
        <h2>
          {result.spot.name} <span className="row-sub">{formatKm(result.distanceKm)}</span>
        </h2>
      </header>
      <ol className="list">
        {days.map((day) => (
          <li key={day.date} className={`row static${day.coreScore === 0 ? ' muted' : ''}`}>
            <DayLabel date={day.date} starred={day === best} coarse={day.coarse} />
            <ScoreBadge score={day.coreScore} />
            <span className="row-main">
              <HourBar day={day} />
              <DayDetails day={day} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
