import type { ReactNode } from 'react'
import { COARSE_FROM_DAY_INDEX } from '../forecast'
import type { WeekRow } from '../ranking'
import { formatDay, formatKm, formatWindow } from '../ui/format'
import { ScoreBadge } from './ScoreBadge'

interface WeekViewProps {
  rows: WeekRow[]
  /** Date of the week's best day, starred. */
  starred: string | null
  /** Forecasts still loading: empty rows say "loading…" instead of "no spot". */
  pending: boolean
  notice?: ReactNode
  onSelectDay: (date: string) => void
}

/** Home screen: the next 8 days, each with that day's best spot. */
export function WeekView({ rows, starred, pending, notice, onSelectDay }: WeekViewProps) {
  return (
    <section aria-label="Next 8 days">
      {notice}
      <ol className="list">
        {rows.map((row, i) => (
          <li key={row.date}>
            <button type="button" className="row" onClick={() => onSelectDay(row.date)}>
              <DayLabel
                date={row.date}
                starred={row.date === starred}
                coarse={i >= COARSE_FROM_DAY_INDEX}
              />
              <ScoreBadge score={row.best ? row.best.day.coreScore : null} />
              {row.best ? (
                <span className="row-main">
                  <span className="row-title">{row.best.spot.name}</span>
                  <span className="row-sub">
                    {formatWindow(row.best.day.window, row.best.day.coarse)} ·{' '}
                    {formatKm(row.best.distanceKm)}
                    {row.moreCount > 0 && ` · +${row.moreCount} more`}
                  </span>
                </span>
              ) : (
                <span className="row-main muted">{pending ? 'loading…' : 'no spot'}</span>
              )}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** "Sun 25", plus ★ for the best day and ~ for low-precision days. */
export function DayLabel({
  date,
  starred = false,
  coarse = false,
}: {
  date: string
  starred?: boolean
  coarse?: boolean
}) {
  return (
    <span className="day-label">
      {formatDay(date)}
      {starred && (
        <span className="star" title="Best day">
          ★
        </span>
      )}
      {coarse && (
        <span className="coarse" title="Days 5–8: rougher timing">
          ~
        </span>
      )}
    </span>
  )
}
