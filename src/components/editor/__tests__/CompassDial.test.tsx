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

  it('draws the coast picture, clipped to a circle, with the spot in the middle', () => {
    const arcs: Arcs = { usable: { min: 270, max: 90 }, ideal: { min: 315, max: 45 } }
    const { container } = render(
      <CompassDial label="Wind direction" arcs={arcs} onChange={() => {}} backdrop="blob:coast" />,
    )
    const image = container.querySelector('image')
    expect(image).toHaveAttribute('href', 'blob:coast')
    const clip = image?.getAttribute('clip-path') ?? ''
    expect(clip).toMatch(/^url\(#coast-[\w-]+\)$/)
    expect(container.querySelector(clip.slice(4, -1))?.tagName).toBe('clipPath')
    expect(container.querySelector('.spot-pin')).toBeInTheDocument()
  })

  it('has no picture or spot dot without a backdrop', () => {
    const { container } = render(<Harness />)
    expect(container.querySelector('image')).toBeNull()
    expect(container.querySelector('.spot-pin')).toBeNull()
  })

  it('keeps the ideal end inside the usable arc', () => {
    render(<Harness />)
    press('ideal end', 'ArrowRight', 5) // would go 315 → 22.5; usable ends at N
    expect(handle('ideal end')).toHaveAttribute('aria-valuetext', 'N (0°)')
  })
})
