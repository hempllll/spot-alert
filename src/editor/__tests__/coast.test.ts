import { describe, expect, it } from 'vitest'
import { COAST_WATER, coastStyleChanges, zoomForSpan, type StyleLayerInfo } from '../coast'

describe('coastStyleChanges', () => {
  // A trimmed-down version of OpenFreeMap's positron style.
  const layers: StyleLayerInfo[] = [
    { id: 'background', type: 'background' },
    { id: 'water', type: 'fill', 'source-layer': 'water' },
    { id: 'waterway', type: 'line', 'source-layer': 'waterway' },
    { id: 'landcover_wood', type: 'fill', 'source-layer': 'landcover' },
    { id: 'road_major', type: 'line', 'source-layer': 'transportation' },
    { id: 'place_label', type: 'symbol', 'source-layer': 'place' },
    { id: 'water_name_label', type: 'symbol', 'source-layer': 'water_name' },
  ]

  it('hides labels and paints water blue, leaving land and roads alone', () => {
    expect(coastStyleChanges(layers, false)).toEqual([
      { id: 'water', paint: 'fill-color', value: COAST_WATER.light },
      { id: 'waterway', paint: 'line-color', value: COAST_WATER.light },
      { id: 'place_label', hide: true },
      { id: 'water_name_label', hide: true },
    ])
  })

  it('uses the deeper blue in dark mode', () => {
    expect(coastStyleChanges(layers, true)[0]).toEqual({
      id: 'water',
      paint: 'fill-color',
      value: COAST_WATER.dark,
    })
  })

  it('finds water by data layer, even under another layer name', () => {
    const renamed = [{ id: 'ocean-and-lakes', type: 'fill', 'source-layer': 'water' }]
    expect(coastStyleChanges(renamed, false)).toEqual([
      { id: 'ocean-and-lakes', paint: 'fill-color', value: COAST_WATER.light },
    ])
  })
})

describe('zoomForSpan', () => {
  it('is zoom 0 when one 512 px tile spans the whole equator', () => {
    expect(zoomForSpan(0, 512, 40_075_016.686)).toBeCloseTo(0, 10)
  })

  it('zooms in one level for half the span', () => {
    expect(zoomForSpan(54, 512, 1200) - zoomForSpan(54, 512, 2400)).toBeCloseTo(1, 10)
  })

  it('needs one level less at 60° N, where the map is stretched 2×', () => {
    expect(zoomForSpan(0, 512, 2400) - zoomForSpan(60, 512, 2400)).toBeCloseTo(1, 10)
  })

  it('lands around zoom 13 for ~2.4 km at the Kiel fjord', () => {
    expect(zoomForSpan(54.4, 512, 2400)).toBeCloseTo(13.25, 1)
  })
})
