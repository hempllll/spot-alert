import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { Arcs } from '../../../editor/arcs'
import { CompassDial } from '../CompassDial'

function Harness() {
  const [arcs, setArcs] = useState<Arcs>({
    usable: { min: 180, max: 360 },
    ideal: { min: 247.5, max: 315 },
  })
  return <CompassDial label="Wind direction" arcs={arcs} onChange={setArcs} />
}

const handle = (name: string) => screen.getByRole('slider', { name: `Wind direction ${name}` })
const press = (name: string, k: string, times = 1) => {
  for (let i = 0; i < times; i++) fireEvent.keyDown(handle(name), { key: k })
}

describe('CompassDial', () => {
  it('moves a compass point per key press and wraps past north', () => {
    render(<Harness />)
    press('usable end', 'ArrowRight')
    expect(handle('usable end')).toHaveAttribute('aria-valuetext', 'NNE (22.5°)')
  })

  it('pushes the ideal arc along when the usable start moves into it', () => {
    render(<Harness />)
    press('usable start', 'ArrowRight', 4) // 180 → 270
    expect(handle('usable start')).toHaveAttribute('aria-valuenow', '270')
    expect(handle('ideal start')).toHaveAttribute('aria-valuenow', '270')
  })

  it('keeps the ideal end inside the usable arc', () => {
    render(<Harness />)
    press('ideal end', 'ArrowRight', 5) // would go 315 → 22.5; usable ends at N
    expect(handle('ideal end')).toHaveAttribute('aria-valuetext', 'N (0°)')
  })
})
