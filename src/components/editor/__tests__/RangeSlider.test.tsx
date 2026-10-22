import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SLIDER_SCALES } from '../../../editor/constants'
import type { Bands } from '../../../editor/range'
import { RangeSlider } from '../RangeSlider'

/** The slider is controlled, so tests drive it through a tiny stateful parent. */
function Harness() {
  const [bands, setBands] = useState<Bands>({ usable: { min: 12, max: 35 }, ideal: { min: 18, max: 28 } })
  return <RangeSlider label="Wind speed" scale={SLIDER_SCALES.windSpeed} bands={bands} onChange={setBands} />
}

const handle = (name: string) => screen.getByRole('slider', { name: `Wind speed ${name}` })
const key = (name: string, k: string) => fireEvent.keyDown(handle(name), { key: k })

describe('RangeSlider', () => {
  it('exposes four labelled handles at their values', () => {
    render(<Harness />)
    expect(handle('usable minimum')).toHaveAttribute('aria-valuenow', '12')
    expect(handle('ideal maximum')).toHaveAttribute('aria-valuetext', '28 kn')
    expect(handle('ideal maximum')).toHaveStyle({ left: '56%' }) // 28 of 0–50
  })

  it('steps with the arrow keys and stops at the usable edge', () => {
    render(<Harness />)
    key('ideal maximum', 'ArrowRight')
    expect(handle('ideal maximum')).toHaveAttribute('aria-valuenow', '29')
    key('ideal maximum', 'End')
    expect(handle('ideal maximum')).toHaveAttribute('aria-valuenow', '35')
  })

  it('pulls the ideal band in when usable shrinks past it', () => {
    render(<Harness />)
    key('usable maximum', 'PageDown') // -5 → 30
    key('usable maximum', 'PageDown') // -5 → 25
    expect(handle('usable maximum')).toHaveAttribute('aria-valuenow', '25')
    expect(handle('ideal maximum')).toHaveAttribute('aria-valuenow', '25')
  })
})
