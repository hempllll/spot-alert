import { scoreBand } from '../ui/format'

/** A 0-100 score as a coloured badge; the number is always shown too. */
export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="score-badge band-none">–</span>
  return <span className={`score-badge band-${scoreBand(score)}`}>{score}</span>
}
