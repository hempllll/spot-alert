import { useState } from 'react'
import type { ConflictResolution, ImportPlan } from '../storage'

interface ImportDialogProps {
  plan: ImportPlan
  onConfirm: (resolutions: Record<number, ConflictResolution>) => void
  onCancel: () => void
}

const CHOICES: [ConflictResolution, string][] = [
  ['skip', 'Skip'],
  ['keepBoth', 'Keep both'],
  ['replace', 'Replace'],
]

/** Summary of a merge-by-id import, with a choice per name conflict. */
export function ImportDialog({ plan, onConfirm, onCancel }: ImportDialogProps) {
  const [resolutions, setResolutions] = useState<Record<number, ConflictResolution>>({})

  const summary = [
    `${plan.added.length} new`,
    `${plan.updated.length} updated`,
    `${plan.unchanged.length} unchanged`,
    plan.conflicts.length > 0 &&
      `${plan.conflicts.length} name conflict${plan.conflicts.length === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="backdrop">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <h2 id="import-title">Import spots</h2>
        <p>{summary}</p>
        {plan.conflicts.map((c) => (
          <fieldset key={c.incomingIndex} className="conflict">
            <legend>“{c.incoming.name}” already exists</legend>
            {CHOICES.map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name={`conflict-${c.incomingIndex}`}
                  checked={(resolutions[c.incomingIndex] ?? 'skip') === value}
                  onChange={() => setResolutions((r) => ({ ...r, [c.incomingIndex]: value }))}
                />{' '}
                {label}
              </label>
            ))}
          </fieldset>
        ))}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={() => onConfirm(resolutions)}>
            Import
          </button>
        </div>
      </section>
    </div>
  )
}
