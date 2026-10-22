import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { scoreDay, type ConditionSet } from '../../scoring'
import { HourBar } from '../HourBar'

const set: ConditionSet = {
  windSpeed: { usable: { min: 10, max: 30 }, ideal: { min: 15, max: 25 } },
}
const D = '2026-10-25'

describe('HourBar', () => {
  it('draws one segment per daylight hour, hatches unsafe hours and outlines the window', () => {
    // 10:00 is too light (gated), 11-13 ideal, 14:00 weaker (75).
    const day = scoreDay(
      {
        date: D,
        sunrise: `${D}T07:00`,
        sunset: `${D}T18:00`,
        hours: [5, 20, 20, 20, 12.5].map((windSpeed, i) => ({
          time: `${D}T${10 + i}:00`,
          windSpeed,
          windDirection: 0,
        })),
      },
      [set],
    )
    const { container } = render(<HourBar day={day} />)

    const segments = container.querySelectorAll('.hour')
    expect(segments).toHaveLength(5)
    expect(segments[0]).toHaveClass('gated')
    expect(segments[1]).toHaveClass('band-great')
    expect(segments[4]).toHaveClass('band-good')

    const outline = container.querySelector<HTMLElement>('.hour-window')
    expect(outline?.style.left).toBe('20%') // starts at the 2nd of 5 hours
    expect(outline?.style.width).toBe('60%') // 3 hours wide

    expect(screen.getByRole('img')).toHaveAccessibleName('Hourly scores 10:00 to 15:00, best 11–14')
  })
})
