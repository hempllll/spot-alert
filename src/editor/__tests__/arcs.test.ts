import { describe, expect, it } from 'vitest'
import { fitIdealArc, moveArcHandle, type Arcs } from '../arcs'

// Usable S→N through west (180–360), ideal WSW–NW.
const west: Arcs = { usable: { min: 180, max: 360 }, ideal: { min: 247.5, max: 315 } }

describe('moveArcHandle: usable edges', () => {
  it('wraps the usable end past north', () => {
    const r = moveArcHandle(west, 'usableMax', 22.5)
    expect(r.usable).toEqual({ min: 180, max: 22.5 })
    expect(r.ideal).toEqual({ min: 247.5, max: 315 }) // still inside, untouched
  })

  it('pushes the ideal arc along when the usable start moves past it', () => {
    const r = moveArcHandle(west, 'usableMin', 270)
    expect(r.usable).toEqual({ min: 270, max: 360 })
    expect(r.ideal).toEqual({ min: 270, max: 315 })
  })

  it('stops at one compass step when dragged onto the other handle', () => {
    const narrow: Arcs = { usable: { min: 270, max: 292.5 }, ideal: { min: 270, max: 292.5 } }
    expect(moveArcHandle(narrow, 'usableMax', 270).usable).toEqual({ min: 270, max: 292.5 })
  })

  it('does not flip to a near-full circle when dragged through the other handle', () => {
    const narrow: Arcs = { usable: { min: 270, max: 292.5 }, ideal: { min: 270, max: 292.5 } }
    // Pointer jumped from 270 to 247.5: that crosses the start handle.
    expect(moveArcHandle(narrow, 'usableMax', 247.5).usable).toEqual({ min: 270, max: 292.5 })
  })

  it('stops short of a full circle when widened all the way round', () => {
    const wide: Arcs = { usable: { min: 0, max: 337.5 }, ideal: { min: 90, max: 180 } }
    expect(moveArcHandle(wide, 'usableMax', 0).usable).toEqual({ min: 0, max: 337.5 })
  })
})

describe('moveArcHandle: ideal edges', () => {
  it('pulls an ideal edge dragged outside usable to the nearer usable edge', () => {
    // 30° is nearer the north (360) end of the 180–360 arc than the south end.
    expect(moveArcHandle(west, 'idealMax', 30).ideal).toEqual({ min: 247.5, max: 0 })
  })

  it('cannot move the ideal start past the ideal end', () => {
    expect(moveArcHandle(west, 'idealMin', 337.5).ideal).toEqual({ min: 315, max: 315 })
  })

  it('works with off-grid values from existing spots', () => {
    const demo: Arcs = { usable: { min: 200, max: 360 }, ideal: { min: 250, max: 320 } }
    expect(moveArcHandle(demo, 'idealMin', 225).ideal).toEqual({ min: 225, max: 320 })
  })
})

describe('fitIdealArc', () => {
  it('leaves an ideal arc that is already inside alone', () => {
    expect(fitIdealArc(west.usable, west.ideal)).toEqual(west.ideal)
  })

  it('treats an ideal end at 360 and 0 the same', () => {
    expect(fitIdealArc({ min: 200, max: 360 }, { min: 250, max: 360 })).toEqual({ min: 250, max: 0 })
  })
})
